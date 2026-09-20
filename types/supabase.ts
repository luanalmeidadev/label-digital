export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string | null
          neighborhood: string
          number: string
          reference: string | null
          street: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string | null
          neighborhood: string
          number: string
          reference?: string | null
          street: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string | null
          neighborhood?: string
          number?: string
          reference?: string | null
          street?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_name: string
          actor_role: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          summary: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_name: string
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          summary: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_name?: string
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          summary?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          closes_at: string | null
          id: string
          is_open: boolean
          opens_at: string | null
          weekday: number
        }
        Insert: {
          closes_at?: string | null
          id?: string
          is_open?: boolean
          opens_at?: string | null
          weekday: number
        }
        Update: {
          closes_at?: string | null
          id?: string
          is_open?: boolean
          opens_at?: string | null
          weekday?: number
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          cash_session_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          movement_reference: string
          movement_type: string
          payment_method: string
        }
        Insert: {
          amount: number
          cash_session_id: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          movement_reference?: string
          movement_type: string
          payment_method?: string
        }
        Update: {
          amount?: number
          cash_session_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          movement_reference?: string
          movement_type?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_cash_counted: number | null
          difference: number | null
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_balance: number
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_counted?: number | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_balance?: number
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_counted?: number | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_balance?: number
          status?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          phone: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          delivery_fee: number | null
          fee_type: string
          id: string
          neighborhood: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delivery_fee?: number | null
          fee_type?: string
          id?: string
          neighborhood: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delivery_fee?: number | null
          fee_type?: string
          id?: string
          neighborhood?: string
        }
        Relationships: []
      }
      order_item_options: {
        Row: {
          created_at: string
          group_name: string
          group_sort_order: number
          id: string
          option_group_id: string | null
          option_id: string | null
          option_name: string
          option_sort_order: number
          order_item_id: string
          presentation_mode: string
          price_delta: number
        }
        Insert: {
          created_at?: string
          group_name: string
          group_sort_order: number
          id?: string
          option_group_id?: string | null
          option_id?: string | null
          option_name: string
          option_sort_order: number
          order_item_id: string
          presentation_mode: string
          price_delta: number
        }
        Update: {
          created_at?: string
          group_name?: string
          group_sort_order?: number
          id?: string
          option_group_id?: string | null
          option_id?: string | null
          option_name?: string
          option_sort_order?: number
          order_item_id?: string
          presentation_mode?: string
          price_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          base_unit_price: number | null
          configuration_signature: string | null
          created_at: string
          id: string
          item_notes: string | null
          manual_discount_amount: number | null
          manual_discount_reason: string | null
          manual_discount_type: string | null
          manual_discount_value: number | null
          options_unit_price: number
          order_id: string
          product_id: string | null
          product_name: string
          promotional_base_unit_price: number | null
          promotional_event_id: string | null
          promotional_event_name: string | null
          quantity: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          base_unit_price?: number | null
          configuration_signature?: string | null
          created_at?: string
          id?: string
          item_notes?: string | null
          manual_discount_amount?: number | null
          manual_discount_reason?: string | null
          manual_discount_type?: string | null
          manual_discount_value?: number | null
          options_unit_price?: number
          order_id: string
          product_id?: string | null
          product_name: string
          promotional_base_unit_price?: number | null
          promotional_event_id?: string | null
          promotional_event_name?: string | null
          quantity: number
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          base_unit_price?: number | null
          configuration_signature?: string | null
          created_at?: string
          id?: string
          item_notes?: string | null
          manual_discount_amount?: number | null
          manual_discount_reason?: string | null
          manual_discount_type?: string | null
          manual_discount_value?: number | null
          options_unit_price?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          promotional_base_unit_price?: number | null
          promotional_event_id?: string | null
          promotional_event_name?: string | null
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_promotional_event_id_fkey"
            columns: ["promotional_event_id"]
            isOneToOne: false
            referencedRelation: "promotional_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          cash_session_id: string | null
          change_amount: number | null
          created_at: string
          created_by: string
          id: string
          method: string
          order_id: string
          tendered_amount: number | null
        }
        Insert: {
          amount: number
          cash_session_id?: string | null
          change_amount?: number | null
          created_at?: string
          created_by: string
          id?: string
          method: string
          order_id: string
          tendered_amount?: number | null
        }
        Update: {
          amount?: number
          cash_session_id?: string | null
          change_amount?: number | null
          created_at?: string
          created_by?: string
          id?: string
          method?: string
          order_id?: string
          tendered_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount: number
          cash_session_id: string
          created_at: string
          created_by: string
          id: string
          method: string
          order_id: string
          order_payment_id: string
          reason: string
        }
        Insert: {
          amount: number
          cash_session_id: string
          created_at?: string
          created_by: string
          id?: string
          method: string
          order_id: string
          order_payment_id: string
          reason: string
        }
        Update: {
          amount?: number
          cash_session_id?: string
          created_at?: string
          created_by?: string
          id?: string
          method?: string
          order_id?: string
          order_payment_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_order_payment_id_fkey"
            columns: ["order_payment_id"]
            isOneToOne: true
            referencedRelation: "order_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_change_for: number | null
          cash_session_id: string | null
          cashier_customer_name: string | null
          cashier_reference: string | null
          completed_at: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_fee: number
          discount_amount: number | null
          discount_percent: number | null
          id: string
          notes: string | null
          order_number: number
          order_type: string
          payment_method: string | null
          sales_channel: string
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          address_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_change_for?: number | null
          cash_session_id?: string | null
          cashier_customer_name?: string | null
          cashier_reference?: string | null
          completed_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          order_number?: never
          order_type: string
          payment_method?: string | null
          sales_channel?: string
          status?: string
          subtotal?: number
          total?: number
        }
        Update: {
          address_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_change_for?: number | null
          cash_session_id?: string | null
          cashier_customer_name?: string | null
          cashier_reference?: string | null
          completed_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          order_number?: never
          order_type?: string
          payment_method?: string | null
          sales_channel?: string
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_losses: {
        Row: {
          cash_session_id: string
          created_at: string
          created_by: string
          estimated_value: number
          id: string
          loss_reference: string
          notes: string | null
          product_id: string
          product_name: string
          quantity: number
          reason: string
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          cash_session_id: string
          created_at?: string
          created_by: string
          estimated_value: number
          id?: string
          loss_reference: string
          notes?: string | null
          product_id: string
          product_name: string
          quantity: number
          reason: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          cash_session_id?: string
          created_at?: string
          created_by?: string
          estimated_value?: number
          id?: string
          loss_reference?: string
          notes?: string | null
          product_id?: string
          product_name?: string
          quantity?: number
          reason?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_losses_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_losses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_losses_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          active: boolean
          created_at: string
          id: string
          max_selections: number | null
          min_selections: number
          name: string
          presentation_mode: string
          product_id: string
          selection_mode: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          max_selections?: number | null
          min_selections?: number
          name: string
          presentation_mode?: string
          product_id: string
          selection_mode: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          max_selections?: number | null
          min_selections?: number
          name?: string
          presentation_mode?: string
          product_id?: string
          selection_mode?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          active: boolean
          available: boolean
          created_at: string
          id: string
          name: string
          option_group_id: string
          price_delta: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          available?: boolean
          created_at?: string
          id?: string
          name: string
          option_group_id: string
          price_delta?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          available?: boolean
          created_at?: string
          id?: string
          name?: string
          option_group_id?: string
          price_delta?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          available: boolean
          created_at: string
          id: string
          name: string
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          available?: boolean
          created_at?: string
          id?: string
          name: string
          price: number
          product_id: string
          sku?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          available?: boolean
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          available: boolean
          catalog_version: number
          category_id: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_position_x: number
          image_position_y: number
          image_url: string | null
          name: string
          price: number
          pricing_mode: string
          product_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          available?: boolean
          catalog_version?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_position_x?: number
          image_position_y?: number
          image_url?: string | null
          name: string
          price?: number
          pricing_mode?: string
          product_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          available?: boolean
          catalog_version?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_position_x?: number
          image_position_y?: number
          image_url?: string | null
          name?: string
          price?: number
          pricing_mode?: string
          product_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_event_products: {
        Row: {
          availability_mode: string
          event_id: string
          id: string
          product_id: string
          promotional_price: number | null
          variant_id: string | null
        }
        Insert: {
          availability_mode?: string
          event_id: string
          id?: string
          product_id: string
          promotional_price?: number | null
          variant_id?: string | null
        }
        Update: {
          availability_mode?: string
          event_id?: string
          id?: string
          product_id?: string
          promotional_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "promotional_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_event_products_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_events: {
        Row: {
          active: boolean
          created_at: string
          end_time: string | null
          ends_at: string | null
          id: string
          name: string
          schedule_type: string
          start_time: string | null
          starts_at: string | null
          updated_at: string
          weekdays: number[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time?: string | null
          ends_at?: string | null
          id?: string
          name: string
          schedule_type: string
          start_time?: string | null
          starts_at?: string | null
          updated_at?: string
          weekdays?: number[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          schedule_type?: string
          start_time?: string | null
          starts_at?: string | null
          updated_at?: string
          weekdays?: number[] | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address_city: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          created_at: string
          delivery_enabled: boolean
          id: string
          instagram: string
          pickup_enabled: boolean
          store_name: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          created_at?: string
          delivery_enabled?: boolean
          id?: string
          instagram?: string
          pickup_enabled?: boolean
          store_name?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          created_at?: string
          delivery_enabled?: boolean
          id?: string
          instagram?: string
          pickup_enabled?: boolean
          store_name?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_completed_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: {
          cancelled_order_id: string
          refunded_total: number
        }[]
      }
      cancel_completed_order_legacy: {
        Args: { p_order_id: string; p_reason: string }
        Returns: {
          cancelled_order_id: string
          refunded_total: number
        }[]
      }
      check_weekdays_validity: { Args: { days: number[] }; Returns: boolean }
      close_cash_session: {
        Args: {
          p_cash_session_id: string
          p_closing_cash_counted: number
          p_notes?: string
        }
        Returns: {
          cash_sales: number
          counted_cash: number
          difference: number
          expected_cash: number
          outflows: number
          supplies: number
        }[]
      }
      close_cash_session_legacy: {
        Args: {
          p_cash_session_id: string
          p_closing_cash_counted: number
          p_notes?: string
        }
        Returns: {
          cash_sales: number
          counted_cash: number
          difference: number
          expected_cash: number
          outflows: number
          supplies: number
        }[]
      }
      complete_online_order: {
        Args: { p_order_id: string }
        Returns: {
          cash_session_id: string
          completed_at: string
          order_id: string
        }[]
      }
      complete_online_order_legacy: {
        Args: { p_order_id: string }
        Returns: {
          cash_session_id: string
          completed_at: string
          order_id: string
        }[]
      }
      create_cash_movement:
        | {
            Args: {
              p_amount: number
              p_cash_session_id: string
              p_description: string
              p_movement_reference: string
              p_movement_type: string
            }
            Returns: {
              created_at: string
              movement_id: string
            }[]
          }
        | {
            Args: {
              p_amount: number
              p_cash_session_id: string
              p_description: string
              p_movement_reference: string
              p_movement_type: string
              p_payment_method: string
            }
            Returns: {
              created_at: string
              movement_id: string
            }[]
          }
      create_cash_movement_legacy: {
        Args: {
          p_amount: number
          p_cash_session_id: string
          p_description: string
          p_movement_reference: string
          p_movement_type: string
        }
        Returns: {
          created_at: string
          movement_id: string
        }[]
      }
      create_cashier_sale: {
        Args: {
          p_cash_session_id: string
          p_cashier_reference: string
          p_customer_name?: string
          p_items: Json
          p_notes?: string
          p_payments: Json
        }
        Returns: {
          order_id: string
          order_number: number
          total: number
        }[]
      }
      create_cashier_sale_legacy: {
        Args: {
          p_cash_session_id: string
          p_cashier_reference: string
          p_customer_name?: string
          p_items: Json
          p_notes?: string
          p_payments: Json
        }
        Returns: {
          order_id: string
          order_number: number
          total: number
        }[]
      }
      create_configured_cashier_sale: {
        Args: {
          p_cash_session_id: string
          p_cashier_reference: string
          p_customer_name?: string
          p_items: Json
          p_notes?: string
          p_payments: Json
        }
        Returns: {
          order_id: string
          order_number: number
          total: number
        }[]
      }
      create_configured_product_loss: {
        Args: {
          p_cash_session_id: string
          p_loss_reference: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reason: string
          p_variant_id: string
        }
        Returns: {
          estimated_value: number
          loss_id: string
        }[]
      }
      create_online_order_atomic:
        | {
            Args: {
              p_address_id: string
              p_cash_change_for: number
              p_customer_id: string
              p_delivery_fee: number
              p_items: Json
              p_notes: string
              p_order_type: string
              p_payment_method: string
            }
            Returns: {
              delivery_fee: number
              order_id: string
              order_number: number
              subtotal: number
              total: number
            }[]
          }
        | {
            Args: {
              p_address_id: string
              p_cash_change_for: number
              p_coupon_code?: string
              p_customer_id: string
              p_delivery_fee: number
              p_items: Json
              p_notes: string
              p_order_type: string
              p_payment_method: string
            }
            Returns: {
              delivery_fee: number
              order_id: string
              order_number: number
              subtotal: number
              total: number
            }[]
          }
        | {
            Args: {
              p_address_id: string
              p_cash_change_for: number
              p_coupon_code?: string
              p_customer_id: string
              p_delivery_fee: number
              p_items: Json
              p_notes: string
              p_order_type: string
              p_payment_method: string
              p_timezone?: string
            }
            Returns: {
              delivery_fee: number
              order_id: string
              order_number: number
              subtotal: number
              total: number
            }[]
          }
      create_product_loss: {
        Args: {
          p_cash_session_id: string
          p_loss_reference: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reason: string
        }
        Returns: {
          estimated_value: number
          loss_id: string
        }[]
      }
      create_product_loss_legacy: {
        Args: {
          p_cash_session_id: string
          p_loss_reference: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reason: string
        }
        Returns: {
          estimated_value: number
          loss_id: string
        }[]
      }
      has_admin_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      reorder_category_products: {
        Args: { p_category_id: string; p_ordered_ids: string[] }
        Returns: undefined
      }
      resolve_active_promotion: {
        Args: {
          p_at?: string
          p_product_id: string
          p_timezone: string
          p_variant_id: string
        }
        Returns: {
          availability_mode: string
          event_id: string
          event_name: string
          promotional_price: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
