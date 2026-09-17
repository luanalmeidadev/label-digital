CREATE OR REPLACE FUNCTION public.reorder_category_products(
  p_category_id uuid,
  p_ordered_ids uuid[]
) RETURNS void AS $$
DECLARE
  v_db_ids uuid[];
  v_missing uuid;
  v_extra uuid;
  v_idx int;
  v_id uuid;
BEGIN
  -- 1. Get the current IDs for the category from the database
  SELECT array_agg(id) INTO v_db_ids
  FROM public.products
  WHERE category_id = p_category_id;

  IF v_db_ids IS NULL THEN
    v_db_ids := ARRAY[]::uuid[];
  END IF;

  IF p_ordered_ids IS NULL THEN
    p_ordered_ids := ARRAY[]::uuid[];
  END IF;

  -- 2. Validate lengths
  IF array_length(v_db_ids, 1) IS DISTINCT FROM array_length(p_ordered_ids, 1) THEN
    RAISE EXCEPTION 'Quantidade de produtos enviados difere dos existentes na categoria.';
  END IF;

  -- 3. Validate sets (exactly same elements)
  -- Check if any input ID is missing from DB
  SELECT input_id INTO v_missing
  FROM unnest(p_ordered_ids) AS input_id
  WHERE NOT (input_id = ANY(v_db_ids))
  LIMIT 1;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Produto % não pertence à categoria ou não existe.', v_missing;
  END IF;

  -- Check if any DB ID is missing from input
  SELECT db_id INTO v_extra
  FROM unnest(v_db_ids) AS db_id
  WHERE NOT (db_id = ANY(p_ordered_ids))
  LIMIT 1;

  IF v_extra IS NOT NULL THEN
    RAISE EXCEPTION 'Produto % foi omitido do payload.', v_extra;
  END IF;

  -- Check for duplicates in input
  IF (SELECT count(DISTINCT input_id) FROM unnest(p_ordered_ids) AS input_id) != array_length(p_ordered_ids, 1) THEN
    RAISE EXCEPTION 'Payload contém IDs duplicados.';
  END IF;

  -- 4. Update the sort_order inside the same transaction using ordinality
  -- We increment sort_order by 10 (10, 20, 30...)
  FOR v_id, v_idx IN
    SELECT id, ordinality
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS t(id, ordinality)
  LOOP
    UPDATE public.products
    SET sort_order = v_idx * 10
    WHERE id = v_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions explicitly
REVOKE ALL ON FUNCTION public.reorder_category_products(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_category_products(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_category_products(uuid, uuid[]) TO service_role;
