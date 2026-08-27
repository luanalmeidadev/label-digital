BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.no_plan();

CREATE FUNCTION pg_temp.statement_raises(expected_state text, statement text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE statement;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE = expected_state;
END;
$$;

-- Schema, columns and defaults.
SELECT extensions.ok(to_regclass('public.product_variants') IS NOT NULL, 'product_variants existe');
SELECT extensions.ok(to_regclass('public.product_option_groups') IS NOT NULL, 'product_option_groups existe');
SELECT extensions.ok(to_regclass('public.product_options') IS NOT NULL, 'product_options existe');
SELECT extensions.ok(to_regclass('public.order_item_options') IS NOT NULL, 'order_item_options existe');

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'pricing_mode' AND is_nullable = 'NO'
      AND column_default = '''simple''::text'
  ),
  'products.pricing_mode possui default simple e e obrigatorio'
);

SELECT extensions.ok(
  NOT EXISTS (
    SELECT expected.column_name
    FROM (VALUES
      ('variant_id'),
      ('variant_name'),
      ('base_unit_price'),
      ('options_unit_price'),
      ('item_notes'),
      ('configuration_signature')
    ) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns AS actual
      WHERE actual.table_schema = 'public'
        AND actual.table_name = 'order_items'
        AND actual.column_name = expected.column_name
    )
  ),
  'order_items possui todas as colunas aditivas'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items'
      AND column_name = 'base_unit_price' AND is_nullable = 'YES'
  ),
  'base_unit_price permanece opcional para o fluxo legado'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items'
      AND column_name = 'options_unit_price' AND is_nullable = 'NO'
      AND column_default = '0'
  ),
  'options_unit_price possui default zero'
);

-- PKs, FKs, ON DELETE rules, checks and indexes.
SELECT extensions.ok(
  NOT EXISTS (
    SELECT expected.table_name
    FROM (VALUES
      ('product_variants'),
      ('product_option_groups'),
      ('product_options'),
      ('order_item_options')
    ) AS expected(table_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_constraint AS constraint_record
      JOIN pg_class AS relation ON relation.oid = constraint_record.conrelid
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = expected.table_name
        AND constraint_record.contype = 'p'
    )
  ),
  'todas as novas tabelas possuem PK'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_variants_product_id_fkey' AND confdeltype = 'c'
  ),
  'variantes usam cascade ao excluir produto'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_options_option_group_id_fkey' AND confdeltype = 'c'
  ),
  'opcoes usam cascade ao excluir grupo'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_variant_id_fkey' AND confdeltype = 'n'
  ),
  'snapshot do item usa set null ao excluir variante'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_item_options_option_id_fkey' AND confdeltype = 'n'
  ),
  'snapshot da opcao usa set null ao excluir opcao'
);

SELECT extensions.ok(
  NOT EXISTS (
    SELECT expected.constraint_name
    FROM (VALUES
      ('products_pricing_mode_check'),
      ('products_price_non_negative_check'),
      ('product_variants_price_check'),
      ('product_option_groups_selection_limits_check'),
      ('product_options_price_delta_check'),
      ('order_items_options_unit_price_check'),
      ('order_item_options_price_delta_check')
    ) AS expected(constraint_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = expected.constraint_name AND contype = 'c'
    )
  ),
  'checks financeiros e de selecao foram criados'
);

SELECT extensions.ok(
  NOT EXISTS (
    SELECT expected.index_name
    FROM (VALUES
      ('product_variants_product_sort_idx'),
      ('product_option_groups_product_sort_idx'),
      ('product_options_group_sort_idx'),
      ('order_items_variant_id_idx'),
      ('order_item_options_order_item_sort_idx')
    ) AS expected(index_name)
    WHERE to_regclass('public.' || expected.index_name) IS NULL
  ),
  'indices operacionais foram criados'
);

SELECT extensions.ok(
  NOT EXISTS (
    SELECT expected.table_name
    FROM (VALUES
      ('product_variants'),
      ('product_option_groups'),
      ('product_options'),
      ('order_item_options')
    ) AS expected(table_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = expected.table_name
        AND relation.relrowsecurity = true
    )
  ),
  'RLS esta habilitada nas quatro tabelas'
);

-- Legacy compatibility: only old columns are supplied.
INSERT INTO public.products (id, name, price)
VALUES ('10000000-0000-4000-8000-000000000001', 'Produto simples legado', 18.55);

INSERT INTO public.orders (id, order_type, subtotal, total)
VALUES ('10000000-0000-4000-8000-000000000002', 'pickup', 18.55, 18.55);

INSERT INTO public.order_items (
  id,
  order_id,
  product_id,
  product_name,
  quantity,
  unit_price
) VALUES (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'Produto simples legado',
  1,
  18.55
);

SELECT extensions.is(
  (SELECT pricing_mode FROM public.products WHERE id = '10000000-0000-4000-8000-000000000001'),
  'simple',
  'produto antigo recebe modo simple sem recadastro'
);

SELECT extensions.is(
  (SELECT price FROM public.products WHERE id = '10000000-0000-4000-8000-000000000001'),
  18.55::numeric,
  'products.price continua suficiente'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM public.order_items
    WHERE id = '10000000-0000-4000-8000-000000000003'
      AND variant_id IS NULL
      AND variant_name IS NULL
      AND base_unit_price IS NULL
      AND options_unit_price = 0
      AND item_notes IS NULL
      AND configuration_signature IS NULL
  ),
  'order_item legado continua inserivel com defaults compativeis'
);

SELECT extensions.is(
  (
    SELECT item.product_name
    FROM public.order_items AS item
    JOIN public.products AS product ON product.id = item.product_id
    WHERE product.id = '10000000-0000-4000-8000-000000000001'
  ),
  'Produto simples legado',
  'consulta antiga de produto e item continua funcionando'
);

-- Local X-Bacon fixture.
INSERT INTO public.products (id, name, price, pricing_mode)
VALUES ('20000000-0000-4000-8000-000000000001', 'X-Bacon', 0, 'variant');

INSERT INTO public.product_variants (id, product_id, name, price)
VALUES (
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'Tradicional',
  20
);

INSERT INTO public.product_option_groups (
  id, product_id, name, selection_mode, min_selections, max_selections, presentation_mode, sort_order
) VALUES
  (
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'Ponto da carne',
    'single',
    1,
    1,
    'choice',
    0
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    'Adicionais',
    'multiple',
    0,
    2,
    'addition',
    1
  );

INSERT INTO public.product_options (
  id, option_group_id, name, price_delta, sort_order
) VALUES
  (
    '20000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000003',
    'Ao ponto',
    0,
    0
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000004',
    'Cheddar',
    4,
    0
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000004',
    'Bacon',
    5,
    1
  );

SELECT extensions.ok(
  pg_temp.statement_raises(
    '23514',
    $$
      INSERT INTO public.product_variants (product_id, name, price)
      VALUES ('20000000-0000-4000-8000-000000000001', 'Preco negativo', -1)
    $$
  ),
  'check rejeita preco negativo de variante'
);

SELECT extensions.ok(
  pg_temp.statement_raises(
    '23514',
    $$
      INSERT INTO public.product_option_groups (
        product_id, name, selection_mode, min_selections, max_selections
      ) VALUES (
        '20000000-0000-4000-8000-000000000001',
        'Grupo invalido',
        'single',
        0,
        2
      )
    $$
  ),
  'check rejeita limite incoerente de grupo single'
);

SELECT extensions.ok(
  pg_temp.statement_raises(
    '23514',
    $$
      INSERT INTO public.product_options (option_group_id, name, price_delta)
      VALUES ('20000000-0000-4000-8000-000000000004', 'Desconto invalido', -1)
    $$
  ),
  'check rejeita price_delta negativo'
);

SELECT extensions.ok(
  pg_temp.statement_raises(
    '23503',
    $$
      INSERT INTO public.product_variants (product_id, name, price)
      VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'Produto inexistente', 1)
    $$
  ),
  'FK rejeita variante de produto inexistente'
);

SELECT extensions.ok(
  pg_temp.statement_raises(
    '23514',
    $$
      INSERT INTO public.order_items (
        order_id, product_id, product_name, quantity, unit_price, configuration_signature
      ) VALUES (
        '10000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        'Assinatura invalida',
        1,
        18.55,
        'curta'
      )
    $$
  ),
  'check rejeita assinatura fora do formato esperado'
);

-- Public access: active catalog is readable, writes and snapshots are not.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT extensions.is(
  (SELECT count(*) FROM public.product_variants WHERE product_id = '20000000-0000-4000-8000-000000000001'),
  1::bigint,
  'anon le variante ativa de produto ativo'
);

SELECT extensions.is(
  (SELECT count(*) FROM public.product_options WHERE option_group_id = '20000000-0000-4000-8000-000000000004'),
  2::bigint,
  'anon le opcoes ativas do catalogo publico'
);

SELECT extensions.ok(
  pg_temp.statement_raises(
    '42501',
    $$
      INSERT INTO public.product_variants (product_id, name, price)
      VALUES ('20000000-0000-4000-8000-000000000001', 'Anon proibido', 1)
    $$
  ),
  'anon nao consegue escrever no catalogo'
);

SELECT extensions.ok(
  pg_temp.statement_raises(
    '42501',
    'SELECT * FROM public.order_item_options'
  ),
  'anon nao consegue consultar snapshots privados'
);

RESET ROLE;

SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.product_variants', 'INSERT'),
  'anon nao possui escrita em variantes'
);
SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.product_option_groups', 'UPDATE'),
  'anon nao possui escrita em grupos'
);
SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.product_options', 'DELETE'),
  'anon nao possui escrita em opcoes'
);
SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.order_item_options', 'SELECT'),
  'anon nao acessa snapshots privados'
);

-- Authenticated attendant with catalog permission can manage the catalog.
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '30000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'catalog-admin@example.test',
  '{"label_role":"attendant","label_permissions":["catalog"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

INSERT INTO public.admin_profiles (id, name)
VALUES ('30000000-0000-4000-8000-000000000001', 'Catalog Admin Local');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"label_role":"attendant","label_permissions":["catalog"]}}',
  true
);

SELECT extensions.lives_ok(
  $$
    INSERT INTO public.product_variants (product_id, name, price, sort_order)
    VALUES (
      '20000000-0000-4000-8000-000000000001',
      'Grande',
      26,
      1
    )
  $$,
  'admin autenticado com catalog gerencia variantes'
);

RESET ROLE;

SELECT extensions.ok(
  EXISTS (
    SELECT 1 FROM public.product_variants
    WHERE product_id = '20000000-0000-4000-8000-000000000001'
      AND name = 'Grande'
      AND price = 26
  ),
  'escrita administrativa foi persistida durante o teste'
);

-- Authenticated user without catalog permission cannot manage the catalog.
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '30000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'orders-only@example.test',
  '{"label_role":"attendant","label_permissions":["orders"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

INSERT INTO public.admin_profiles (id, name)
VALUES ('30000000-0000-4000-8000-000000000002', 'Orders Only Local');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"label_role":"attendant","label_permissions":["orders"]}}',
  true
);

SELECT extensions.ok(
  pg_temp.statement_raises(
    '42501',
    $$
      INSERT INTO public.product_variants (product_id, name, price)
      VALUES (
        '20000000-0000-4000-8000-000000000001',
        'Sem permissao',
        99
      )
    $$
  ),
  'usuario autenticado sem catalog nao consegue escrever no catalogo'
);

RESET ROLE;

SELECT * FROM extensions.finish();

ROLLBACK;
