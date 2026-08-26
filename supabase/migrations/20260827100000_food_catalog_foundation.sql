-- Food service catalog foundation.
-- This migration is additive: the current simple-product and order flows remain valid.

ALTER TABLE public.products
  ADD COLUMN pricing_mode text NOT NULL DEFAULT 'simple';

ALTER TABLE public.products
  ADD CONSTRAINT products_pricing_mode_check
    CHECK (pricing_mode = ANY (ARRAY['simple'::text, 'variant'::text])),
  ADD CONSTRAINT products_price_non_negative_check
    CHECK (price >= 0::numeric);

CREATE TABLE public.product_variants (
  id         uuid                     DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid                     NOT NULL,
  name       text                     NOT NULL,
  sku        text,
  price      numeric(10,2)            NOT NULL,
  active     boolean                  NOT NULL DEFAULT true,
  available  boolean                  NOT NULL DEFAULT true,
  sort_order integer                  NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE,
  CONSTRAINT product_variants_name_check
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT product_variants_sku_check
    CHECK (sku IS NULL OR char_length(btrim(sku)) BETWEEN 1 AND 100),
  CONSTRAINT product_variants_price_check
    CHECK (price >= 0::numeric),
  CONSTRAINT product_variants_sort_order_check
    CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX product_variants_product_name_unique_idx
  ON public.product_variants (product_id, lower(btrim(name)));

CREATE UNIQUE INDEX product_variants_sku_unique_idx
  ON public.product_variants (lower(btrim(sku)))
  WHERE sku IS NOT NULL;

CREATE INDEX product_variants_product_sort_idx
  ON public.product_variants (product_id, sort_order, id);

CREATE TABLE public.product_option_groups (
  id                uuid                     DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id        uuid                     NOT NULL,
  name              text                     NOT NULL,
  selection_mode    text                     NOT NULL,
  min_selections    integer                  NOT NULL DEFAULT 0,
  max_selections    integer,
  presentation_mode text                     NOT NULL DEFAULT 'choice',
  active            boolean                  NOT NULL DEFAULT true,
  sort_order        integer                  NOT NULL DEFAULT 0,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  updated_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_option_groups_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE,
  CONSTRAINT product_option_groups_name_check
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT product_option_groups_selection_mode_check
    CHECK (selection_mode = ANY (ARRAY['single'::text, 'multiple'::text])),
  CONSTRAINT product_option_groups_presentation_mode_check
    CHECK (presentation_mode = ANY (ARRAY['choice'::text, 'addition'::text, 'removal'::text])),
  CONSTRAINT product_option_groups_selection_limits_check
    CHECK (
      min_selections BETWEEN 0 AND 50
      AND (max_selections IS NULL OR max_selections BETWEEN 1 AND 50)
      AND (max_selections IS NULL OR max_selections >= min_selections)
      AND (
        (selection_mode = 'single'::text AND min_selections <= 1 AND max_selections = 1)
        OR selection_mode = 'multiple'::text
      )
    ),
  CONSTRAINT product_option_groups_sort_order_check
    CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX product_option_groups_product_name_unique_idx
  ON public.product_option_groups (product_id, lower(btrim(name)));

CREATE INDEX product_option_groups_product_sort_idx
  ON public.product_option_groups (product_id, sort_order, id);

CREATE TABLE public.product_options (
  id              uuid                     DEFAULT gen_random_uuid() PRIMARY KEY,
  option_group_id uuid                     NOT NULL,
  name            text                     NOT NULL,
  price_delta     numeric(10,2)            NOT NULL DEFAULT 0,
  active          boolean                  NOT NULL DEFAULT true,
  available       boolean                  NOT NULL DEFAULT true,
  sort_order      integer                  NOT NULL DEFAULT 0,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_options_option_group_id_fkey
    FOREIGN KEY (option_group_id)
    REFERENCES public.product_option_groups(id)
    ON DELETE CASCADE,
  CONSTRAINT product_options_name_check
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT product_options_price_delta_check
    CHECK (price_delta >= 0::numeric),
  CONSTRAINT product_options_sort_order_check
    CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX product_options_group_name_unique_idx
  ON public.product_options (option_group_id, lower(btrim(name)));

CREATE INDEX product_options_group_sort_idx
  ON public.product_options (option_group_id, sort_order, id);

ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid,
  ADD COLUMN variant_name text,
  ADD COLUMN base_unit_price numeric(10,2),
  ADD COLUMN options_unit_price numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN item_notes text,
  ADD COLUMN configuration_signature text;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES public.product_variants(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT order_items_variant_name_check
    CHECK (variant_name IS NULL OR char_length(btrim(variant_name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT order_items_base_unit_price_check
    CHECK (base_unit_price IS NULL OR base_unit_price >= 0::numeric),
  ADD CONSTRAINT order_items_options_unit_price_check
    CHECK (options_unit_price >= 0::numeric),
  ADD CONSTRAINT order_items_unit_price_non_negative_check
    CHECK (unit_price >= 0::numeric),
  ADD CONSTRAINT order_items_item_notes_check
    CHECK (item_notes IS NULL OR char_length(item_notes) <= 300),
  ADD CONSTRAINT order_items_configuration_signature_check
    CHECK (configuration_signature IS NULL OR char_length(configuration_signature) = 64);

CREATE INDEX order_items_variant_id_idx
  ON public.order_items (variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX order_items_configuration_signature_idx
  ON public.order_items (configuration_signature)
  WHERE configuration_signature IS NOT NULL;

CREATE TABLE public.order_item_options (
  id                uuid                     DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id     uuid                     NOT NULL,
  option_group_id   uuid,
  option_id         uuid,
  group_name        text                     NOT NULL,
  option_name       text                     NOT NULL,
  presentation_mode text                     NOT NULL,
  price_delta       numeric(10,2)            NOT NULL,
  group_sort_order  integer                  NOT NULL,
  option_sort_order integer                  NOT NULL,
  created_at        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_item_options_order_item_id_fkey
    FOREIGN KEY (order_item_id)
    REFERENCES public.order_items(id)
    ON DELETE CASCADE,
  CONSTRAINT order_item_options_option_group_id_fkey
    FOREIGN KEY (option_group_id)
    REFERENCES public.product_option_groups(id)
    ON DELETE SET NULL,
  CONSTRAINT order_item_options_option_id_fkey
    FOREIGN KEY (option_id)
    REFERENCES public.product_options(id)
    ON DELETE SET NULL,
  CONSTRAINT order_item_options_group_name_check
    CHECK (char_length(btrim(group_name)) BETWEEN 1 AND 120),
  CONSTRAINT order_item_options_option_name_check
    CHECK (char_length(btrim(option_name)) BETWEEN 1 AND 120),
  CONSTRAINT order_item_options_presentation_mode_check
    CHECK (presentation_mode = ANY (ARRAY['choice'::text, 'addition'::text, 'removal'::text])),
  CONSTRAINT order_item_options_price_delta_check
    CHECK (price_delta >= 0::numeric),
  CONSTRAINT order_item_options_group_sort_order_check
    CHECK (group_sort_order >= 0),
  CONSTRAINT order_item_options_option_sort_order_check
    CHECK (option_sort_order >= 0)
);

CREATE INDEX order_item_options_order_item_sort_idx
  ON public.order_item_options (
    order_item_id,
    group_sort_order,
    option_sort_order,
    id
  );

CREATE INDEX order_item_options_option_created_idx
  ON public.order_item_options (option_id, created_at)
  WHERE option_id IS NOT NULL;

CREATE INDEX order_item_options_group_created_idx
  ON public.order_item_options (option_group_id, created_at)
  WHERE option_group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_food_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_food_catalog_updated_at() FROM PUBLIC;

CREATE TRIGGER product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.set_food_catalog_updated_at();

CREATE TRIGGER product_option_groups_updated_at
BEFORE UPDATE ON public.product_option_groups
FOR EACH ROW EXECUTE FUNCTION public.set_food_catalog_updated_at();

CREATE TRIGGER product_options_updated_at
BEFORE UPDATE ON public.product_options
FOR EACH ROW EXECUTE FUNCTION public.set_food_catalog_updated_at();

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.product_variants FROM anon, authenticated;
REVOKE ALL ON public.product_option_groups FROM anon, authenticated;
REVOKE ALL ON public.product_options FROM anon, authenticated;
REVOKE ALL ON public.order_item_options FROM anon, authenticated;

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.product_option_groups TO anon, authenticated;
GRANT SELECT ON public.product_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_option_groups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_options TO authenticated;
GRANT SELECT ON public.order_item_options TO authenticated;

GRANT ALL ON public.product_variants TO service_role;
GRANT ALL ON public.product_option_groups TO service_role;
GRANT ALL ON public.product_options TO service_role;
GRANT ALL ON public.order_item_options TO service_role;

CREATE POLICY "Public reads active product variants"
ON public.product_variants
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = product_variants.product_id
      AND product.active = true
  )
);

CREATE POLICY "Catalog manages product variants"
ON public.product_variants
TO authenticated
USING (public.has_admin_permission('catalog'))
WITH CHECK (public.has_admin_permission('catalog'));

CREATE POLICY "Public reads active product option groups"
ON public.product_option_groups
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = product_option_groups.product_id
      AND product.active = true
  )
);

CREATE POLICY "Catalog manages product option groups"
ON public.product_option_groups
TO authenticated
USING (public.has_admin_permission('catalog'))
WITH CHECK (public.has_admin_permission('catalog'));

CREATE POLICY "Public reads active product options"
ON public.product_options
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1
    FROM public.product_option_groups AS option_group
    JOIN public.products AS product
      ON product.id = option_group.product_id
    WHERE option_group.id = product_options.option_group_id
      AND option_group.active = true
      AND product.active = true
  )
);

CREATE POLICY "Catalog manages product options"
ON public.product_options
TO authenticated
USING (public.has_admin_permission('catalog'))
WITH CHECK (public.has_admin_permission('catalog'));

CREATE POLICY "Permissions read order item options"
ON public.order_item_options
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('orders')
  OR public.has_admin_permission('cashier')
  OR public.has_admin_permission('customers')
  OR public.has_admin_permission('billing')
);

