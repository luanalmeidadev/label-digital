-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

DROP EXTENSION IF EXISTS pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE TABLE public.addresses (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  customer_id  uuid                     NOT NULL,
  label        text,
  zip_code     text                     NOT NULL,
  street       text                     NOT NULL,
  number       text                     NOT NULL,
  complement   text,
  neighborhood text                     NOT NULL,
  city         text                     NOT NULL,
  reference    text,
  is_default   boolean                  DEFAULT false NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.addresses
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.addresses
  ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);

GRANT ALL ON public.addresses TO anon;

GRANT ALL ON public.addresses TO authenticated;

GRANT ALL ON public.addresses TO service_role;

CREATE TABLE public.admin_profiles (
  id         uuid                     NOT NULL,
  name       text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "Admins can manage addresses" ON public.addresses
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

ALTER TABLE public.admin_profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_pkey PRIMARY KEY (id);

GRANT ALL ON public.admin_profiles TO anon;

GRANT ALL ON public.admin_profiles TO authenticated;

GRANT ALL ON public.admin_profiles TO service_role;

CREATE POLICY "Admins can read admin profiles" ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = id));

CREATE TABLE public.business_hours (
  id        uuid                   DEFAULT gen_random_uuid() NOT NULL,
  weekday   integer                NOT NULL,
  is_open   boolean                DEFAULT false NOT NULL,
  opens_at  time without time zone,
  closes_at time without time zone
);

ALTER TABLE public.business_hours
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_weekday_check CHECK (weekday >= 0 AND weekday <= 6);

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_weekday_key UNIQUE (weekday);

GRANT ALL ON public.business_hours TO anon;

GRANT ALL ON public.business_hours TO authenticated;

GRANT ALL ON public.business_hours TO service_role;

CREATE POLICY "Admins can manage business hours" ON public.business_hours
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE POLICY "Public can read business hours" ON public.business_hours
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.categories (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  name       text                     NOT NULL,
  slug       text                     NOT NULL,
  active     boolean                  DEFAULT true NOT NULL,
  sort_order integer                  DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.categories
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_slug_key UNIQUE (slug);

GRANT ALL ON public.categories TO anon;

GRANT ALL ON public.categories TO authenticated;

GRANT ALL ON public.categories TO service_role;

CREATE POLICY "Admins can manage categories" ON public.categories
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE POLICY "Public can read active categories" ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING ((active = true));

CREATE TABLE public.customers (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  auth_user_id uuid,
  first_name   text                     NOT NULL,
  last_name    text                     NOT NULL,
  phone        text                     NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.customers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE public.customers
  ADD CONSTRAINT customers_phone_key UNIQUE (phone);

ALTER TABLE public.customers
  ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE public.addresses
  ADD CONSTRAINT addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

GRANT ALL ON public.customers TO anon;

GRANT ALL ON public.customers TO authenticated;

GRANT ALL ON public.customers TO service_role;

CREATE POLICY "Admins can manage customers" ON public.customers
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE TABLE public.delivery_zones (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  neighborhood text                     NOT NULL,
  delivery_fee numeric(10,2)            DEFAULT 0,
  active       boolean                  DEFAULT true NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  fee_type     text                     DEFAULT 'fixed'::text NOT NULL
);

ALTER TABLE public.delivery_zones
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.delivery_zones
  ADD CONSTRAINT delivery_zones_fee_type_check CHECK (fee_type = ANY (ARRAY['fixed'::text, 'consult'::text]));

ALTER TABLE public.delivery_zones
  ADD CONSTRAINT delivery_zones_fee_value_check CHECK (fee_type = 'fixed'::text AND delivery_fee IS
    NOT NULL AND delivery_fee >= 0::numeric OR fee_type = 'consult'::text AND delivery_fee IS NULL);

ALTER TABLE public.delivery_zones
  ADD CONSTRAINT delivery_zones_neighborhood_key UNIQUE (neighborhood);

ALTER TABLE public.delivery_zones
  ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);

GRANT ALL ON public.delivery_zones TO anon;

GRANT ALL ON public.delivery_zones TO authenticated;

GRANT ALL ON public.delivery_zones TO service_role;

CREATE POLICY "Admins can manage delivery zones" ON public.delivery_zones
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE POLICY "Public can read active delivery zones" ON public.delivery_zones
  FOR SELECT
  TO anon, authenticated
  USING ((active = true));

CREATE TABLE public.order_items (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  order_id     uuid                     NOT NULL,
  product_id   uuid,
  product_name text                     NOT NULL,
  quantity     integer                  NOT NULL,
  unit_price   numeric(10,2)            NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.order_items
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0);

GRANT ALL ON public.order_items TO anon;

GRANT ALL ON public.order_items TO authenticated;

GRANT ALL ON public.order_items TO service_role;

CREATE POLICY "Admins can manage order items" ON public.order_items
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE TABLE public.orders (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  order_number bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id  uuid,
  address_id   uuid,
  order_type   text                     NOT NULL,
  status       text                     DEFAULT 'created'::text NOT NULL,
  subtotal     numeric(10,2)            DEFAULT 0 NOT NULL,
  delivery_fee numeric(10,2)            DEFAULT 0 NOT NULL,
  total        numeric(10,2)            DEFAULT 0 NOT NULL,
  notes        text,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

ALTER TABLE public.orders
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_check CHECK (order_type = ANY (ARRAY['pickup'::text, 'delivery'::text]));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK
    (status = ANY (ARRAY['created'::text, 'sent_to_whatsapp'::text, 'confirmed'::text, 'out_for_delivery'::text, 'ready_for_pickup'::text, 'completed'::text, 'cancelled'::text]));

GRANT ALL ON public.orders TO anon;

GRANT ALL ON public.orders TO authenticated;

GRANT ALL ON public.orders TO service_role;

CREATE POLICY "Admins can manage orders" ON public.orders
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE TABLE public.products (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  category_id      uuid,
  name             text                     NOT NULL,
  description      text,
  price            numeric(10,2)            DEFAULT 0 NOT NULL,
  image_url        text,
  product_type     text                     DEFAULT 'ready'::text NOT NULL,
  available        boolean                  DEFAULT true NOT NULL,
  featured         boolean                  DEFAULT false NOT NULL,
  active           boolean                  DEFAULT true NOT NULL,
  sort_order       integer                  DEFAULT 0 NOT NULL,
  created_at       timestamp with time zone DEFAULT now() NOT NULL,
  updated_at       timestamp with time zone DEFAULT now() NOT NULL,
  image_position_x integer                  DEFAULT 50 NOT NULL,
  image_position_y integer                  DEFAULT 50 NOT NULL
);

ALTER TABLE public.products
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_product_type_check CHECK (product_type = ANY (ARRAY['ready'::text, 'preorder'::text]));

GRANT ALL ON public.products TO anon;

GRANT ALL ON public.products TO authenticated;

GRANT ALL ON public.products TO service_role;

CREATE POLICY "Admins can manage products" ON public.products
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE POLICY "Public can read active products" ON public.products
  FOR SELECT
  TO anon, authenticated
  USING ((active = true));

CREATE TABLE public.store_settings (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  store_name       text                     DEFAULT 'La''bel Confeitaria'::text NOT NULL,
  whatsapp         text                     DEFAULT '5548988681096'::text NOT NULL,
  instagram        text                     DEFAULT '@label_confeitaria'::text NOT NULL,
  pickup_enabled   boolean                  DEFAULT true NOT NULL,
  delivery_enabled boolean                  DEFAULT true NOT NULL,
  created_at       timestamp with time zone DEFAULT now() NOT NULL,
  updated_at       timestamp with time zone DEFAULT now() NOT NULL,
  address_street   text,
  address_number   text,
  address_city     text,
  address_state    text
);

ALTER TABLE public.store_settings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);

GRANT ALL ON public.store_settings TO anon;

GRANT ALL ON public.store_settings TO authenticated;

GRANT ALL ON public.store_settings TO service_role;

CREATE POLICY "Admins can manage store settings" ON public.store_settings
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_profiles
  WHERE (admin_profiles.id = auth.uid()))));

CREATE POLICY "Public can read store settings" ON public.store_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);
