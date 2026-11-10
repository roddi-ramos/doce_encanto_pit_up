create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Impede que o próprio usuário altere seu perfil para administrador.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Somente um administrador pode alterar este perfil.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger before update on public.profiles
for each row execute procedure public.protect_profile_role();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check (price > 0),
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  neighborhood text not null unique,
  fee numeric(10,2) not null default 0 check (fee >= 0),
  is_active boolean not null default true
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled')),
  payment_method text not null check (payment_method in ('pix','credit_card','debit_card')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  fulfillment_type text not null check (fulfillment_type in ('pickup','delivery')),
  scheduled_for timestamptz,
  delivery_area_id uuid references public.delivery_areas(id) on delete set null,
  delivery_address text,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount_total numeric(10,2) not null default 0 check (discount_total >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  coupon_id uuid references public.coupons(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null check (line_total >= 0)
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  old_status text,
  new_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id),
  customer_id uuid not null references public.profiles(id),
  order_id uuid not null unique references public.orders(id),
  redeemed_at timestamptz not null default now(),
  unique (coupon_id, customer_id)
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_orders_customer_created on public.orders(customer_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order on public.order_items(order_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.reviews enable row level security;
alter table public.coupon_redemptions enable row level security;

-- Perfis
drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles for select
using (id = auth.uid() or public.is_admin());
drop policy if exists "profile update self or admin" on public.profiles;
create policy "profile update self or admin" on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Catalogo publico; admin pode gerenciar.
drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories" on public.categories for select
using (is_active = true or public.is_admin());
drop policy if exists "admin manage categories" on public.categories;
create policy "admin manage categories" on public.categories for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select
using ((is_active = true and stock_quantity > 0) or public.is_admin());
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read active delivery areas" on public.delivery_areas;
create policy "public read active delivery areas" on public.delivery_areas for select
using (is_active = true or public.is_admin());
drop policy if exists "admin manage delivery areas" on public.delivery_areas;
create policy "admin manage delivery areas" on public.delivery_areas for all
using (public.is_admin()) with check (public.is_admin());

-- Cupons não listados publicamente; apenas administradores podem gerenciar.
drop policy if exists "admin manage coupons" on public.coupons;
create policy "admin manage coupons" on public.coupons for all
using (public.is_admin()) with check (public.is_admin());

-- Leitura de pedidos: admin vê todos; clientes vêem somente os próprios.
drop policy if exists "customer or admin read orders" on public.orders;
create policy "customer or admin read orders" on public.orders for select
using (customer_id = auth.uid() or public.is_admin());
drop policy if exists "admin manage orders" on public.orders;
create policy "admin manage orders" on public.orders for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read own order items or admin" on public.order_items;
create policy "read own order items or admin" on public.order_items for select
using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin())));
drop policy if exists "admin manage order items" on public.order_items;
create policy "admin manage order items" on public.order_items for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read own order history or admin" on public.order_status_history;
create policy "read own order history or admin" on public.order_status_history for select
using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin())));
drop policy if exists "admin manage order history" on public.order_status_history;
create policy "admin manage order history" on public.order_status_history for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read reviews" on public.reviews;
create policy "read reviews" on public.reviews for select using (true);
drop policy if exists "customer read own reviews" on public.reviews;
create policy "customer read own reviews" on public.reviews for select using (customer_id = auth.uid() or public.is_admin());
drop policy if exists "admin manage reviews" on public.reviews;
create policy "admin manage reviews" on public.reviews for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage coupon redemptions" on public.coupon_redemptions;
create policy "admin manage coupon redemptions" on public.coupon_redemptions for all
using (public.is_admin()) with check (public.is_admin());
