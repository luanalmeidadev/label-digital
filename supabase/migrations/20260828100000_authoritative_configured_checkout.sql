ALTER TABLE public.products
  ADD COLUMN catalog_version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.products
  ADD CONSTRAINT products_catalog_version_positive_check
    CHECK (catalog_version > 0);

CREATE OR REPLACE FUNCTION public.bump_product_catalog_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF ROW(
    NEW.name,
    NEW.price,
    NEW.pricing_mode,
    NEW.active,
    NEW.available
  ) IS DISTINCT FROM ROW(
    OLD.name,
    OLD.price,
    OLD.pricing_mode,
    OLD.active,
    OLD.available
  ) THEN
    NEW.catalog_version := OLD.catalog_version + 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER products_bump_catalog_version
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.bump_product_catalog_version();

CREATE OR REPLACE FUNCTION public.touch_related_product_catalog_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_product_id uuid;
  new_product_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('product_variants', 'product_option_groups') THEN
    IF TG_OP <> 'INSERT' THEN
      old_product_id := OLD.product_id;
    END IF;

    IF TG_OP <> 'DELETE' THEN
      new_product_id := NEW.product_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'product_options' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT option_group.product_id
      INTO old_product_id
      FROM public.product_option_groups AS option_group
      WHERE option_group.id = OLD.option_group_id;
    END IF;

    IF TG_OP <> 'DELETE' THEN
      SELECT option_group.product_id
      INTO new_product_id
      FROM public.product_option_groups AS option_group
      WHERE option_group.id = NEW.option_group_id;
    END IF;
  END IF;

  IF old_product_id IS NOT NULL THEN
    UPDATE public.products
    SET catalog_version = catalog_version + 1
    WHERE id = old_product_id;
  END IF;

  IF new_product_id IS NOT NULL
     AND new_product_id IS DISTINCT FROM old_product_id THEN
    UPDATE public.products
    SET catalog_version = catalog_version + 1
    WHERE id = new_product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER product_variants_touch_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.touch_related_product_catalog_version();

CREATE TRIGGER product_option_groups_touch_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.product_option_groups
FOR EACH ROW
EXECUTE FUNCTION public.touch_related_product_catalog_version();

CREATE TRIGGER product_options_touch_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.product_options
FOR EACH ROW
EXECUTE FUNCTION public.touch_related_product_catalog_version();

CREATE OR REPLACE FUNCTION public.create_online_order_atomic(
  p_customer_id uuid,
  p_address_id uuid,
  p_order_type text,
  p_payment_method text,
  p_cash_change_for numeric,
  p_delivery_fee numeric,
  p_notes text,
  p_items jsonb
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

  IF jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1
     OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ORDER_ITEMS';
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

  computed_total := computed_subtotal + p_delivery_fee;

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
    notes
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
    NULLIF(btrim(p_notes), '')
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

REVOKE ALL ON FUNCTION public.create_online_order_atomic(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  text,
  jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_online_order_atomic(
  uuid,
  uuid,
  text,
  text,
  numeric,
  numeric,
  text,
  jsonb
) TO service_role;
