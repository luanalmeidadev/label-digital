CREATE TABLE public.admin_audit_logs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid,
  actor_name    text NOT NULL,
  actor_email   text,
  actor_role    text NOT NULL DEFAULT 'attendant',
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     text,
  summary       text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_logs_action_check
    CHECK (action = ANY (ARRAY['created'::text, 'updated'::text, 'deleted'::text])),
  CONSTRAINT admin_audit_logs_role_check
    CHECK (actor_role = ANY (ARRAY['admin'::text, 'attendant'::text]))
);

CREATE INDEX admin_audit_logs_created_at_idx
  ON public.admin_audit_logs (created_at DESC);

CREATE INDEX admin_audit_logs_entity_type_idx
  ON public.admin_audit_logs (entity_type, created_at DESC);

CREATE INDEX admin_audit_logs_actor_user_id_idx
  ON public.admin_audit_logs (actor_user_id, created_at DESC);

ALTER TABLE public.admin_audit_logs
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON public.admin_audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_audit_logs_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.capture_admin_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  audit_actor_id uuid;
  audit_actor_name text;
  audit_actor_email text;
  audit_actor_role text;
  audit_action text;
  audit_entity_type text;
  audit_entity_id text;
  audit_label text;
  audit_summary text;
  audit_keys text[];
  old_row jsonb := '{}'::jsonb;
  new_row jsonb := '{}'::jsonb;
  current_row jsonb := '{}'::jsonb;
  audit_metadata jsonb := '{}'::jsonb;
BEGIN
  audit_actor_id := auth.uid();

  IF audit_actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = audit_actor_id
  ) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;
  END IF;

  SELECT
    COALESCE(profile.name, auth_user.email, 'Usuário administrativo'),
    auth_user.email,
    COALESCE(auth_user.raw_app_meta_data ->> 'label_role', 'attendant')
  INTO
    audit_actor_name,
    audit_actor_email,
    audit_actor_role
  FROM auth.users AS auth_user
  LEFT JOIN public.admin_profiles AS profile
    ON profile.id = auth_user.id
  WHERE auth_user.id = audit_actor_id;

  IF TG_OP = 'INSERT' THEN
    audit_action := 'created';
    new_row := to_jsonb(NEW);
    current_row := new_row;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'updated';
    old_row := to_jsonb(OLD);
    new_row := to_jsonb(NEW);
    current_row := new_row;
  ELSE
    audit_action := 'deleted';
    old_row := to_jsonb(OLD);
    current_row := old_row;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'products' THEN
      audit_entity_type := 'product';
      audit_label := format('o produto “%s”', COALESCE(current_row ->> 'name', 'sem nome'));
      audit_keys := ARRAY[
        'category_id', 'name', 'price', 'available', 'featured', 'active',
        'sort_order', 'image_position_x', 'image_position_y'
      ];
    WHEN 'categories' THEN
      audit_entity_type := 'category';
      audit_label := format('a categoria “%s”', COALESCE(current_row ->> 'name', 'sem nome'));
      audit_keys := ARRAY['name', 'slug', 'active', 'sort_order'];
    WHEN 'orders' THEN
      audit_entity_type := 'order';
      audit_label := format('o pedido #%s', COALESCE(current_row ->> 'order_number', '?'));
      audit_keys := ARRAY[
        'order_type', 'status', 'subtotal', 'delivery_fee', 'total',
        'completed_at'
      ];
    WHEN 'store_settings' THEN
      audit_entity_type := 'store_settings';
      audit_label := 'as configurações da loja';
      audit_keys := ARRAY[
        'store_name', 'whatsapp', 'instagram', 'pickup_enabled',
        'delivery_enabled', 'address_city', 'address_state'
      ];
    WHEN 'business_hours' THEN
      audit_entity_type := 'business_hours';
      audit_label := format('o horário do dia %s', COALESCE(current_row ->> 'weekday', '?'));
      audit_keys := ARRAY['weekday', 'is_open', 'opens_at', 'closes_at'];
    WHEN 'delivery_zones' THEN
      audit_entity_type := 'delivery_zone';
      audit_label := format(
        'a região de entrega “%s”',
        COALESCE(current_row ->> 'neighborhood', 'sem nome')
      );
      audit_keys := ARRAY['neighborhood', 'fee_type', 'delivery_fee', 'active'];
    ELSE
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;

      RETURN NEW;
  END CASE;

  audit_entity_id := current_row ->> 'id';

  IF audit_action = 'updated' THEN
    SELECT COALESCE(
      jsonb_object_agg(
        field_name,
        jsonb_build_object(
          'before', old_row -> field_name,
          'after', new_row -> field_name
        )
      ),
      '{}'::jsonb
    )
    INTO audit_metadata
    FROM jsonb_object_keys(new_row) AS field_name
    WHERE field_name = ANY (audit_keys)
      AND old_row -> field_name IS DISTINCT FROM new_row -> field_name;

    IF audit_metadata = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSE
    SELECT jsonb_build_object(
      'values',
      COALESCE(jsonb_object_agg(field_name, current_row -> field_name), '{}'::jsonb)
    )
    INTO audit_metadata
    FROM jsonb_object_keys(current_row) AS field_name
    WHERE field_name = ANY (audit_keys);
  END IF;

  audit_summary := CASE audit_action
    WHEN 'created' THEN format('Criou %s', audit_label)
    WHEN 'updated' THEN format('Atualizou %s', audit_label)
    ELSE format('Excluiu %s', audit_label)
  END;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    actor_name,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    summary,
    metadata
  ) VALUES (
    audit_actor_id,
    COALESCE(audit_actor_name, 'Usuário administrativo'),
    audit_actor_email,
    CASE
      WHEN audit_actor_role = 'admin' THEN 'admin'
      ELSE 'attendant'
    END,
    audit_action,
    audit_entity_type,
    audit_entity_id,
    audit_summary,
    audit_metadata
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_admin_audit_log() FROM PUBLIC;

CREATE TRIGGER audit_products_changes
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit_log();

CREATE TRIGGER audit_categories_changes
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit_log();

CREATE TRIGGER audit_orders_changes
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit_log();

CREATE TRIGGER audit_store_settings_changes
AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit_log();

CREATE TRIGGER audit_business_hours_changes
AFTER INSERT OR UPDATE OR DELETE ON public.business_hours
FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit_log();

CREATE TRIGGER audit_delivery_zones_changes
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_zones
FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit_log();
