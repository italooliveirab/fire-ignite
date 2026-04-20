export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_products: {
        Row: {
          affiliate_id: string
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          custom_slug: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          notes: string | null
          product_id: string
          requested_at: string
          status: Database["public"]["Enums"]["affiliation_status"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          custom_slug?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          requested_at?: string
          status?: Database["public"]["Enums"]["affiliation_status"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          custom_slug?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["affiliation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_products_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          instagram: string | null
          phone: string | null
          pix_key: string | null
          pix_type: Database["public"]["Enums"]["pix_type"] | null
          slug: string
          status: Database["public"]["Enums"]["affiliate_status"]
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          instagram?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: Database["public"]["Enums"]["pix_type"] | null
          slug: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          instagram?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: Database["public"]["Enums"]["pix_type"] | null
          slug?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          affiliate_id: string
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          created_at: string
          id: string
          lead_id: string
          product_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          commission_type: Database["public"]["Enums"]["commission_type"]
          commission_value: number
          created_at?: string
          id?: string
          lead_id: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          commission_type?: Database["public"]["Enums"]["commission_type"]
          commission_value?: number
          created_at?: string
          id?: string
          lead_id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          affiliate_id: string
          conversation_started_at: string | null
          created_at: string
          customer_name: string | null
          id: string
          paid_at: string | null
          payment_amount: number | null
          payment_generated_at: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          trial_generated_at: string | null
          updated_at: string
          whatsapp_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          affiliate_id: string
          conversation_started_at?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          paid_at?: string | null
          payment_amount?: number | null
          payment_generated_at?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          trial_generated_at?: string | null
          updated_at?: string
          whatsapp_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          affiliate_id?: string
          conversation_started_at?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          paid_at?: string | null
          payment_amount?: number | null
          payment_generated_at?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          trial_generated_at?: string | null
          updated_at?: string
          whatsapp_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          affiliate_id: string
          amount_paid: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          pix_key_used: string | null
          proof_file_url: string | null
          reference_period: string | null
        }
        Insert: {
          affiliate_id: string
          amount_paid: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          pix_key_used?: string | null
          proof_file_url?: string | null
          reference_period?: string | null
        }
        Update: {
          affiliate_id?: string
          amount_paid?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          pix_key_used?: string | null
          proof_file_url?: string | null
          reference_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          media_kit_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_kit_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_kit_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          affiliate_link_domain: string
          affiliate_link_prefix: string
          company_name: string
          created_at: string
          id: string
          logo_url: string | null
          minimum_payout: number
          payment_policy_text: string | null
          payout_frequency: Database["public"]["Enums"]["payout_frequency"]
          retention_days: number
          support_email: string | null
          support_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          affiliate_link_domain?: string
          affiliate_link_prefix?: string
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          minimum_payout?: number
          payment_policy_text?: string | null
          payout_frequency?: Database["public"]["Enums"]["payout_frequency"]
          retention_days?: number
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_link_domain?: string
          affiliate_link_prefix?: string
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          minimum_payout?: number
          payment_policy_text?: string | null
          payout_frequency?: Database["public"]["Enums"]["payout_frequency"]
          retention_days?: number
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      affiliate_status: "active" | "paused" | "blocked"
      affiliation_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "affiliate"
      commission_status: "pending" | "released" | "paid"
      commission_type: "percentage" | "fixed"
      lead_status:
        | "initiated_conversation"
        | "generated_trial"
        | "generated_payment"
        | "paid"
        | "not_paid"
      payout_frequency: "weekly" | "biweekly" | "monthly"
      pix_type: "cpf" | "cnpj" | "email" | "phone" | "random"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      affiliate_status: ["active", "paused", "blocked"],
      affiliation_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "affiliate"],
      commission_status: ["pending", "released", "paid"],
      commission_type: ["percentage", "fixed"],
      lead_status: [
        "initiated_conversation",
        "generated_trial",
        "generated_payment",
        "paid",
        "not_paid",
      ],
      payout_frequency: ["weekly", "biweekly", "monthly"],
      pix_type: ["cpf", "cnpj", "email", "phone", "random"],
    },
  },
} as const
