
BEGIN;

-- ============================================
-- 1. PERFIS DE USUARIO
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();


-- ============================================
-- 2. CONTROLE DE ADMINISTRADORES
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION
            'Somente um administrador pode alterar este perfil.';
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role_trigger
ON public.profiles;

CREATE TRIGGER protect_profile_role_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.protect_profile_role();


-- ============================================
-- 3. CATEGORIAS DO CARDAPIO
-- ============================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================
-- 4. PRODUTOS DO CARDAPIO
-- ============================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id)
        ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    image_url TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (stock_quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================
-- 5. PEDIDOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_id UUID NOT NULL REFERENCES public.profiles(id),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'out_for_delivery',
            'completed',
            'cancelled'
        )),

    payment_method TEXT NOT NULL,

    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN (
            'pending',
            'paid',
            'failed',
            'refunded'
        )),

    fulfillment_type TEXT NOT NULL
        CHECK (fulfillment_type IN ('pickup', 'delivery')),

    delivery_address TEXT,
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (delivery_fee >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atualiza a regra de pagamento para incluir dinheiro.
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_payment_method_check
CHECK (
    payment_method IN (
        'pix',
        'credit_card',
        'debit_card',
        'cash'
    )
);


-- ============================================
-- 6. ITENS DOS PEDIDOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL REFERENCES public.orders(id)
        ON DELETE CASCADE,

    product_id UUID REFERENCES public.products(id)
        ON DELETE SET NULL,

    product_name_snapshot TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0)
);


-- ============================================
-- 7. INDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_category
ON public.products(category_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer
ON public.orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON public.order_items(order_id);


-- ============================================
-- 8. SEGURANCA - RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;


-- Perfis

DROP POLICY IF EXISTS "profile read self or admin"
ON public.profiles;

CREATE POLICY "profile read self or admin"
ON public.profiles
FOR SELECT
USING (
    id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "profile update self or admin"
ON public.profiles;

CREATE POLICY "profile update self or admin"
ON public.profiles
FOR UPDATE
USING (
    id = auth.uid() OR public.is_admin()
)
WITH CHECK (
    id = auth.uid() OR public.is_admin()
);


-- Categorias

DROP POLICY IF EXISTS "public read active categories"
ON public.categories;

CREATE POLICY "public read active categories"
ON public.categories
FOR SELECT
USING (
    is_active = TRUE OR public.is_admin()
);

DROP POLICY IF EXISTS "admin manage categories"
ON public.categories;

CREATE POLICY "admin manage categories"
ON public.categories
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- Produtos

DROP POLICY IF EXISTS "public read active products"
ON public.products;

CREATE POLICY "public read active products"
ON public.products
FOR SELECT
USING (
    (is_active = TRUE AND stock_quantity > 0)
    OR public.is_admin()
);

DROP POLICY IF EXISTS "admin manage products"
ON public.products;

CREATE POLICY "admin manage products"
ON public.products
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- Pedidos

DROP POLICY IF EXISTS "customer or admin read orders"
ON public.orders;

CREATE POLICY "customer or admin read orders"
ON public.orders
FOR SELECT
USING (
    customer_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "admin manage orders"
ON public.orders;

CREATE POLICY "admin manage orders"
ON public.orders
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- Itens dos pedidos

DROP POLICY IF EXISTS "read own order items or admin"
ON public.order_items;

CREATE POLICY "read own order items or admin"
ON public.order_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_items.order_id
        AND (
            orders.customer_id = auth.uid()
            OR public.is_admin()
        )
    )
);

DROP POLICY IF EXISTS "admin manage order items"
ON public.order_items;

CREATE POLICY "admin manage order items"
ON public.order_items
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ============================================
-- 9. FUNCAO DE FINALIZACAO DO PEDIDO
-- ============================================

CREATE OR REPLACE FUNCTION public.create_order(
    p_items JSONB,
    p_payment_method TEXT,
    p_fulfillment_type TEXT,
    p_delivery_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_product_name TEXT;
    v_quantity INTEGER;
    v_stock INTEGER;
    v_unit_price NUMERIC(10,2);
    v_subtotal NUMERIC(10,2) := 0;
BEGIN
    -- Verifica se existe usuario autenticado.
    v_customer_id := auth.uid();

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Voce precisa estar autenticado para fazer um pedido.';
    END IF;

    -- Verifica os itens do carrinho.
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Carrinho invalido.';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'O carrinho esta vazio.';
    END IF;

    -- Verifica a forma de pagamento.
    IF p_payment_method NOT IN (
        'pix',
        'credit_card',
        'debit_card',
        'cash'
    ) THEN
        RAISE EXCEPTION 'Forma de pagamento invalida.';
    END IF;

    -- Verifica entrega ou retirada.
    IF p_fulfillment_type NOT IN ('pickup', 'delivery') THEN
        RAISE EXCEPTION 'Tipo de recebimento invalido.';
    END IF;

    IF p_fulfillment_type = 'delivery'
       AND COALESCE(TRIM(p_delivery_address), '') = '' THEN
        RAISE EXCEPTION 'Informe o endereco de entrega.';
    END IF;

    -- Confere os produtos, precos e estoques no banco.
    FOR v_item IN
        SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;

        IF v_quantity IS NULL OR v_quantity <= 0 THEN
            RAISE EXCEPTION 'Quantidade de produto invalida.';
        END IF;

        SELECT name, price, stock_quantity
        INTO v_product_name, v_unit_price, v_stock
        FROM public.products
        WHERE id = v_product_id
          AND is_active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto nao encontrado ou indisponivel.';
        END IF;

        IF v_stock < v_quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para: %', v_product_name;
        END IF;

        UPDATE public.products
        SET stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;

        v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    END LOOP;

    -- Registra o pedido.
    INSERT INTO public.orders (
        customer_id,
        payment_method,
        fulfillment_type,
        delivery_address,
        subtotal,
        total,
        notes
    )
    VALUES (
        v_customer_id,
        p_payment_method,
        p_fulfillment_type,
        CASE
            WHEN p_fulfillment_type = 'delivery'
            THEN TRIM(p_delivery_address)
            ELSE NULL
        END,
        v_subtotal,
        v_subtotal,
        p_notes
    )
    RETURNING id INTO v_order_id;

    -- Registra os produtos do pedido.
    FOR v_item IN
        SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;

        SELECT name, price
        INTO v_product_name, v_unit_price
        FROM public.products
        WHERE id = v_product_id;

        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name_snapshot,
            unit_price,
            quantity,
            line_total
        )
        VALUES (
            v_order_id,
            v_product_id,
            v_product_name,
            v_unit_price,
            v_quantity,
            v_unit_price * v_quantity
        );
    END LOOP;

    RETURN v_order_id;
END;
$$;

-- Somente usuarios autenticados podem criar pedidos.
REVOKE ALL ON FUNCTION public.create_order(
    JSONB, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order(
    JSONB, TEXT, TEXT, TEXT, TEXT
) TO authenticated;


COMMIT;

-- ============================================
-- FIM DO ESQUEMA
-- ============================================
