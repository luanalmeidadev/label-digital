-- Security hardening: explicit grants, fail-closed roles and permission-aware RLS.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON ROUTINES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON ROUTINES FROM PUBLIC;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Public storefront reads. RLS still limits these rows.
GRANT SELECT ON public.business_hours TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.delivery_zones TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.store_settings TO anon, authenticated;

-- Administrative tables. RLS below decides which authenticated user can act.
GRANT SELECT ON public.addresses TO authenticated;
GRANT SELECT ON public.admin_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.customers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cash_sessions TO authenticated;
GRANT SELECT ON public.order_payments TO authenticated;
GRANT SELECT ON public.cash_movements TO authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT SELECT ON public.order_refunds TO authenticated;
GRANT SELECT ON public.product_losses TO authenticated;

-- Preserve legacy administrators once, then require an explicit role forever.
UPDATE auth.users AS user_account
SET raw_app_meta_data = jsonb_set(
  COALESCE(user_account.raw_app_meta_data, '{}'::jsonb),
  '{label_role}',
  '"admin"'::jsonb,
  true
)
WHERE EXISTS (
  SELECT 1
  FROM public.admin_profiles AS profile
  WHERE profile.id = user_account.id
)
AND COALESCE(user_account.raw_app_meta_data ->> 'label_role', '')
  NOT IN ('admin', 'attendant');

CREATE OR REPLACE FUNCTION public.has_admin_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles AS profile
    WHERE profile.id = auth.uid()
      AND (
        auth.jwt() -> 'app_metadata' ->> 'label_role' = 'admin'
        OR (
          auth.jwt() -> 'app_metadata' ->> 'label_role' = 'attendant'
          AND COALESCE(
            auth.jwt() -> 'app_metadata' -> 'label_permissions',
            '[]'::jsonb
          ) ? required_permission
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_admin_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_profile_requires_explicit_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account_role text;
BEGIN
  SELECT raw_app_meta_data ->> 'label_role'
  INTO account_role
  FROM auth.users
  WHERE id = NEW.id;

  IF account_role NOT IN ('admin', 'attendant') THEN
    RAISE EXCEPTION 'O perfil administrativo exige um papel explicito.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_profile_requires_explicit_role() FROM PUBLIC;

DROP TRIGGER IF EXISTS admin_profile_explicit_role ON public.admin_profiles;
CREATE TRIGGER admin_profile_explicit_role
BEFORE INSERT OR UPDATE OF id ON public.admin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.admin_profile_requires_explicit_role();

DROP POLICY IF EXISTS "Admins can manage addresses" ON public.addresses;
CREATE POLICY "Permissoes administram enderecos"
ON public.addresses
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('customers')
  OR public.has_admin_permission('orders')
  OR public.has_admin_permission('deliveries')
);

DROP POLICY IF EXISTS "Admins can manage business hours" ON public.business_hours;
CREATE POLICY "Configuracoes administram horarios"
ON public.business_hours
TO authenticated
USING (public.has_admin_permission('settings'))
WITH CHECK (public.has_admin_permission('settings'));

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Catalogo administra categorias"
ON public.categories
TO authenticated
USING (public.has_admin_permission('catalog'))
WITH CHECK (public.has_admin_permission('catalog'));

DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Permissoes administram clientes"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('customers')
  OR public.has_admin_permission('orders')
  OR public.has_admin_permission('deliveries')
);

DROP POLICY IF EXISTS "Admins can manage delivery zones" ON public.delivery_zones;
CREATE POLICY "Configuracoes administram zonas"
ON public.delivery_zones
TO authenticated
USING (public.has_admin_permission('settings'))
WITH CHECK (public.has_admin_permission('settings'));

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Permissoes consultam itens"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('orders')
  OR public.has_admin_permission('cashier')
  OR public.has_admin_permission('customers')
  OR public.has_admin_permission('billing')
);
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Permissoes consultam pedidos"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('orders')
  OR public.has_admin_permission('deliveries')
  OR public.has_admin_permission('cashier')
  OR public.has_admin_permission('customers')
  OR public.has_admin_permission('billing')
);
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Catalogo administra produtos"
ON public.products
TO authenticated
USING (public.has_admin_permission('catalog'))
WITH CHECK (public.has_admin_permission('catalog'));

DROP POLICY IF EXISTS "Admins can manage store settings" ON public.store_settings;
CREATE POLICY "Configuracoes administram loja"
ON public.store_settings
TO authenticated
USING (public.has_admin_permission('settings'))
WITH CHECK (public.has_admin_permission('settings'));

DROP POLICY IF EXISTS "Administradores gerenciam sessoes de caixa" ON public.cash_sessions;
CREATE POLICY "Caixa administra sessoes"
ON public.cash_sessions
TO authenticated
USING (public.has_admin_permission('cashier'))
WITH CHECK (public.has_admin_permission('cashier'));

DROP POLICY IF EXISTS "Administradores consultam pagamentos" ON public.order_payments;
CREATE POLICY "Permissoes consultam pagamentos"
ON public.order_payments
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('cashier')
  OR public.has_admin_permission('orders')
  OR public.has_admin_permission('billing')
);

DROP POLICY IF EXISTS "Administradores consultam movimentos de caixa" ON public.cash_movements;
CREATE POLICY "Permissoes consultam movimentos"
ON public.cash_movements
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('cashier')
  OR public.has_admin_permission('billing')
);

DROP POLICY IF EXISTS "Administradores consultam estornos" ON public.order_refunds;
CREATE POLICY "Permissoes consultam estornos"
ON public.order_refunds
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('cashier')
  OR public.has_admin_permission('orders')
  OR public.has_admin_permission('billing')
);

DROP POLICY IF EXISTS "Administradores consultam perdas" ON public.product_losses;
CREATE POLICY "Permissoes consultam perdas"
ON public.product_losses
FOR SELECT
TO authenticated
USING (
  public.has_admin_permission('cashier')
  OR public.has_admin_permission('billing')
);

-- Product images are public to read, but only server-side service-role actions write.
DROP POLICY IF EXISTS "Administradores gerenciam imagens de produtos"
ON storage.objects;

-- Wrap privileged RPCs so their permission check fails closed before legacy logic runs.
ALTER FUNCTION public.create_cashier_sale(uuid, uuid, jsonb, jsonb, text, text)
RENAME TO create_cashier_sale_legacy;
ALTER FUNCTION public.create_cash_movement(uuid, uuid, text, numeric, text)
RENAME TO create_cash_movement_legacy;
ALTER FUNCTION public.close_cash_session(uuid, numeric, text)
RENAME TO close_cash_session_legacy;
ALTER FUNCTION public.complete_online_order(uuid)
RENAME TO complete_online_order_legacy;
ALTER FUNCTION public.cancel_completed_order(uuid, text)
RENAME TO cancel_completed_order_legacy;
ALTER FUNCTION public.create_product_loss(uuid, uuid, uuid, integer, text, text)
RENAME TO create_product_loss_legacy;

REVOKE ALL ON FUNCTION public.create_cashier_sale_legacy(uuid, uuid, jsonb, jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_cash_movement_legacy(uuid, uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_cash_session_legacy(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_online_order_legacy(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_completed_order_legacy(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_product_loss_legacy(uuid, uuid, uuid, integer, text, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_cashier_sale(
  p_cash_session_id uuid,
  p_cashier_reference uuid,
  p_items jsonb,
  p_payments jsonb,
  p_customer_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (order_id uuid, order_number bigint, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION 'Sem permissao para operar o caixa.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.create_cashier_sale_legacy(
    p_cash_session_id, p_cashier_reference, p_items, p_payments,
    p_customer_name, p_notes
  );
END;
$$;

CREATE FUNCTION public.create_cash_movement(
  p_cash_session_id uuid,
  p_movement_reference uuid,
  p_movement_type text,
  p_amount numeric,
  p_description text
)
RETURNS TABLE (movement_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION 'Sem permissao para operar o caixa.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.create_cash_movement_legacy(
    p_cash_session_id, p_movement_reference, p_movement_type,
    p_amount, p_description
  );
END;
$$;

CREATE FUNCTION public.close_cash_session(
  p_cash_session_id uuid,
  p_closing_cash_counted numeric,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  expected_cash numeric,
  counted_cash numeric,
  difference numeric,
  cash_sales numeric,
  supplies numeric,
  outflows numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION 'Sem permissao para operar o caixa.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.close_cash_session_legacy(
    p_cash_session_id, p_closing_cash_counted, p_notes
  );
END;
$$;

CREATE FUNCTION public.complete_online_order(p_order_id uuid)
RETURNS TABLE (
  order_id uuid,
  completed_at timestamp with time zone,
  cash_session_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (
    public.has_admin_permission('orders')
    OR public.has_admin_permission('deliveries')
  ) THEN
    RAISE EXCEPTION 'Sem permissao para finalizar pedidos.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.complete_online_order_legacy(p_order_id);
END;
$$;

CREATE FUNCTION public.cancel_completed_order(p_order_id uuid, p_reason text)
RETURNS TABLE (cancelled_order_id uuid, refunded_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (
    public.has_admin_permission('cashier')
    OR public.has_admin_permission('orders')
  ) THEN
    RAISE EXCEPTION 'Sem permissao para cancelar vendas.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.cancel_completed_order_legacy(p_order_id, p_reason);
END;
$$;

CREATE FUNCTION public.create_product_loss(
  p_cash_session_id uuid,
  p_loss_reference uuid,
  p_product_id uuid,
  p_quantity integer,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (loss_id uuid, estimated_value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_permission('cashier') THEN
    RAISE EXCEPTION 'Sem permissao para registrar perdas.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.create_product_loss_legacy(
    p_cash_session_id, p_loss_reference, p_product_id,
    p_quantity, p_reason, p_notes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_cashier_sale(uuid, uuid, jsonb, jsonb, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_cash_movement(uuid, uuid, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_cash_session(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_online_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_completed_order(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_product_loss(uuid, uuid, uuid, integer, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_cashier_sale(uuid, uuid, jsonb, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_cash_movement(uuid, uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cash_session(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_online_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_completed_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_loss(uuid, uuid, uuid, integer, text, text) TO authenticated;
