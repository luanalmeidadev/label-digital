-- 20260915100000_promotional_coupons.sql

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  expires_at timestamptz NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_code_check CHECK (trim(code) <> '')
);

CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid NULL REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code text NULL,
  ADD COLUMN IF NOT EXISTS discount_percent numeric NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NULL DEFAULT 0;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access coupons" ON public.coupons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

GRANT ALL ON TABLE public.coupons TO authenticated;
GRANT ALL ON TABLE public.coupons TO service_role;

-- The create_online_order_atomic RPC now computes the discount safely server-side
CREATE OR REPLACE FUNCTION public.create_online_order_atomic(
  p_customer_id uuid,
  p_address_id uuid,
  p_order_type text,
  p_payment_method text,
  p_cash_change_for numeric,
  p_delivery_fee numeric,
  p_notes text,
  p_items jsonb,
  p_coupon_code text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_number bigint,
  subtotal numeric,
  delivery_fee numeric,
  total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item_json jsonb;
  option_json jsonb;
  product_record record;
  variant_record record;
  option_record record;
  created_order_id uuid;
  created_order_number bigint;
  created_order_item_id uuid;
  computed_subtotal numeric(10,2) := 0;
  computed_total numeric(10,2);
  computed_options_price numeric(10,2);
  item_quantity integer;
  item_unit_price numeric(10,2);
  item_base_price numeric(10,2);
  item_options_price numeric(10,2);
  item_variant_id uuid;
  expected_catalog_version bigint;

  -- Coupon derived vars
  v_coupon_record record;
  v_coupon_code text;
  v_discount_percent numeric;
  v_discount_amount numeric(10,2) := 0;
  v_coupon_id uuid := NULL;
BEGIN
  IF p_order_type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ORDER_TYPE';
  END IF;

  IF p_payment_method NOT IN ('cash', 'pix', 'debit_card', 'credit_card') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PAYMENT_METHOD';
  END IF;

  IF p_delivery_fee IS NULL OR p_delivery_fee < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DELIVERY_FEE';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ORDER_ITEMS';
  END IF;

  IF p_coupon_code IS NOT NULL THEN
    v_coupon_code := upper(trim(p_coupon_code));
    IF v_coupon_code !~ '^[A-Z0-9_-]{1,20}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_COUPON';
    END IF;

    SELECT * INTO v_coupon_record
    FROM public.coupons
    WHERE code = v_coupon_code;

    IF NOT FOUND
       OR NOT v_coupon_record.active
       OR (v_coupon_record.expires_at IS NOT NULL AND v_coupon_record.expires_at < now()) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_COUPON';
    END IF;

    v_coupon_id := v_coupon_record.id;
    v_discount_percent := v_coupon_record.discount_percent;
  END IF;

  FOR item_json IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    item_quantity := (item_json ->> 'quantity')::integer;
    item_unit_price := (item_json ->> 'unit_price')::numeric;
    item_base_price := (item_json ->> 'base_unit_price')::numeric;
    item_options_price := (item_json ->> 'options_unit_price')::numeric;
    expected_catalog_version := (item_json ->> 'catalog_version')::bigint;
    item_variant_id := NULLIF(item_json ->> 'variant_id', '')::uuid;

    IF item_quantity < 1 OR item_quantity > 999
       OR item_unit_price < 0
       OR item_base_price < 0
       OR item_options_price < 0
       OR item_unit_price <> item_base_price + item_options_price THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEM_SNAPSHOT';
    END IF;

    SELECT product.*
    INTO product_record
    FROM public.products AS product
    WHERE product.id = (item_json ->> 'product_id')::uuid
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:PRODUCT_NOT_FOUND';
    END IF;

    IF product_record.catalog_version <> expected_catalog_version
       OR NOT product_record.active
       OR NOT product_record.available THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:PRODUCT';
    END IF;

    IF product_record.name <> item_json ->> 'product_name' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:PRODUCT_NAME';
    END IF;

    IF product_record.pricing_mode = 'simple' THEN
      IF item_variant_id IS NOT NULL
         OR product_record.price <> item_base_price THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:BASE_PRICE';
      END IF;
    ELSE
      IF item_variant_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'VARIANT_REQUIRED';
      END IF;

      SELECT variant.*
      INTO variant_record
      FROM public.product_variants AS variant
      WHERE variant.id = item_variant_id
        AND variant.product_id = product_record.id;

      IF NOT FOUND
         OR NOT variant_record.active
         OR NOT variant_record.available
         OR variant_record.name <> item_json ->> 'variant_name'
         OR variant_record.price <> item_base_price THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:VARIANT';
      END IF;
    END IF;

    computed_options_price := 0;

    IF jsonb_typeof(COALESCE(item_json -> 'options', '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEM_OPTIONS';
    END IF;

    FOR option_json IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(item_json -> 'options', '[]'::jsonb))
    LOOP
      SELECT
        option_group.id AS group_id,
        option_group.name AS group_name,
        option_group.presentation_mode,
        option_group.sort_order AS group_sort_order,
        catalog_option.id AS option_id,
        catalog_option.name AS option_name,
        catalog_option.price_delta,
        catalog_option.sort_order AS option_sort_order,
        option_group.active AS group_active,
        catalog_option.active AS option_active,
        catalog_option.available AS option_available
      INTO option_record
      FROM public.product_options AS catalog_option
      JOIN public.product_option_groups AS option_group
        ON option_group.id = catalog_option.option_group_id
      WHERE catalog_option.id = (option_json ->> 'option_id')::uuid
        AND option_group.id = (option_json ->> 'option_group_id')::uuid
        AND option_group.product_id = product_record.id;

      IF NOT FOUND
         OR NOT option_record.group_active
         OR NOT option_record.option_active
         OR NOT option_record.option_available
         OR option_record.group_name <> option_json ->> 'group_name'
         OR option_record.option_name <> option_json ->> 'option_name'
         OR option_record.presentation_mode <> option_json ->> 'presentation_mode'
         OR option_record.price_delta <> (option_json ->> 'price_delta')::numeric
         OR option_record.group_sort_order <> (option_json ->> 'group_sort_order')::integer
         OR option_record.option_sort_order <> (option_json ->> 'option_sort_order')::integer THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CATALOG_CHANGED:OPTION';
      END IF;

      computed_options_price := computed_options_price + option_record.price_delta;
    END LOOP;

    IF computed_options_price <> item_options_price THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_OPTIONS_PRICE';
    END IF;

    computed_subtotal := computed_subtotal + (item_unit_price * item_quantity);
  END LOOP;

  IF v_coupon_id IS NOT NULL THEN
    v_discount_amount := round((computed_subtotal * v_discount_percent) / 100, 2);
  END IF;

  computed_total := (computed_subtotal - v_discount_amount) + p_delivery_fee;

  IF computed_total < 0 THEN
    computed_total := 0;
  END IF;

  IF p_payment_method = 'cash' THEN
    IF p_cash_change_for IS NOT NULL AND p_cash_change_for < computed_total THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CASH_CHANGE';
    END IF;
  ELSIF p_cash_change_for IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CASH_CHANGE';
  END IF;

  INSERT INTO public.orders (
    customer_id,
    address_id,
    order_type,
    sales_channel,
    payment_method,
    cash_change_for,
    status,
    subtotal,
    delivery_fee,
    total,
    notes,
    coupon_id,
    coupon_code,
    discount_percent,
    discount_amount
  ) VALUES (
    p_customer_id,
    p_address_id,
    p_order_type,
    'online',
    p_payment_method,
    p_cash_change_for,
    'sent_to_whatsapp',
    computed_subtotal,
    p_delivery_fee,
    computed_total,
    NULLIF(btrim(p_notes), ''),
    v_coupon_id,
    v_coupon_code,
    v_discount_percent,
    v_discount_amount
  )
  RETURNING id, public.orders.order_number
  INTO created_order_id, created_order_number;

  FOR item_json IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      variant_id,
      variant_name,
      quantity,
      base_unit_price,
      options_unit_price,
      unit_price,
      item_notes,
      configuration_signature
    ) VALUES (
      created_order_id,
      (item_json ->> 'product_id')::uuid,
      item_json ->> 'product_name',
      NULLIF(item_json ->> 'variant_id', '')::uuid,
      NULLIF(item_json ->> 'variant_name', ''),
      (item_json ->> 'quantity')::integer,
      (item_json ->> 'base_unit_price')::numeric,
      (item_json ->> 'options_unit_price')::numeric,
      (item_json ->> 'unit_price')::numeric,
      NULLIF(item_json ->> 'item_notes', ''),
      item_json ->> 'configuration_signature'
    )
    RETURNING id INTO created_order_item_id;

    FOR option_json IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(item_json -> 'options', '[]'::jsonb))
    LOOP
      INSERT INTO public.order_item_options (
        order_item_id,
        option_group_id,
        option_id,
        group_name,
        option_name,
        presentation_mode,
        price_delta,
        group_sort_order,
        option_sort_order
      ) VALUES (
        created_order_item_id,
        (option_json ->> 'option_group_id')::uuid,
        (option_json ->> 'option_id')::uuid,
        option_json ->> 'group_name',
        option_json ->> 'option_name',
        option_json ->> 'presentation_mode',
        (option_json ->> 'price_delta')::numeric,
        (option_json ->> 'group_sort_order')::integer,
        (option_json ->> 'option_sort_order')::integer
      );
    END LOOP;
  END LOOP;

  RETURN QUERY
  SELECT
    created_order_id,
    created_order_number,
    computed_subtotal,
    p_delivery_fee,
    computed_total;
END;
$$;

-- Keep security intact for previous signatures if any, and set new one
REVOKE ALL ON FUNCTION public.create_online_order_atomic(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  text,
  jsonb,
  text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_online_order_atomic(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  text,
  jsonb,
  text
) TO service_role;
