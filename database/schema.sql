
-- ============================================
-- DOCE ENCANTO | CADASTRO INICIAL DO CATÁLOGO
-- PostgreSQL / Supabase
-- ============================================

BEGIN;

-- 1. CADASTRO DAS CATEGORIAS

INSERT INTO public.categories (name, description)
VALUES
    ('Cupcakes Tradicionais',
     'Sabores clássicos da Doce Encanto'),

    ('Cupcakes Especiais',
     'Combinações especiais de sabores'),

    ('Cupcakes Gourmet',
     'Cupcakes com ingredientes e coberturas premium')

ON CONFLICT (name) DO NOTHING;


-- 2. CADASTRO DOS PRODUTOS

INSERT INTO public.products
    (category_id, name, description, price, image_url, stock_quantity, is_active)

VALUES

(
    (SELECT id FROM public.categories
     WHERE name = 'Cupcakes Tradicionais'),
    'Cupcake de Chocolate',
    'Massa de chocolate com cobertura cremosa de brigadeiro.',
    9.90,
    'https://placehold.co/600x400?text=Cupcake+Chocolate',
    20,
    TRUE
),

(
    (SELECT id FROM public.categories
     WHERE name = 'Cupcakes Tradicionais'),
    'Cupcake de Baunilha',
    'Massa leve de baunilha com cobertura especial.',
    8.90,
    'https://placehold.co/600x400?text=Cupcake+Baunilha',
    20,
    TRUE
),

(
    (SELECT id FROM public.categories
     WHERE name = 'Cupcakes Especiais'),
    'Cupcake de Morango',
    'Massa artesanal com recheio e cobertura de morango.',
    11.90,
    'https://placehold.co/600x400?text=Cupcake+Morango',
    15,
    TRUE
),

(
    (SELECT id FROM public.categories
     WHERE name = 'Cupcakes Especiais'),
    'Cupcake Red Velvet',
    'Massa red velvet com cobertura de cream cheese.',
    13.90,
    'https://placehold.co/600x400?text=Red+Velvet',
    12,
    TRUE
),

(
    (SELECT id FROM public.categories
     WHERE name = 'Cupcakes Gourmet'),
    'Cupcake de Pistache',
    'Massa especial com creme de pistache.',
    15.90,
    'https://placehold.co/600x400?text=Cupcake+Pistache',
    10,
    TRUE
),

(
    (SELECT id FROM public.categories
     WHERE name = 'Cupcakes Gourmet'),
    'Cupcake de Nutella',
    'Massa de chocolate com recheio e cobertura de creme de avelã.',
    14.90,
    'https://placehold.co/600x400?text=Cupcake+Nutella',
    10,
    TRUE
)

ON CONFLICT DO NOTHING;

COMMIT;


-- 3. CONFERÊNCIA DO CATÁLOGO

SELECT
    p.id,
    p.name AS produto,
    c.name AS categoria,
    p.price AS preco,
    p.stock_quantity AS estoque,
    p.is_active AS ativo
FROM public.products p
LEFT JOIN public.categories c
    ON c.id = p.category_id
ORDER BY c.name, p.name;
