/**
 * Supabase Database type definitions.
 *
 * These types mirror the Postgres schema and are consumed by
 * @supabase/supabase-js for end-to-end type safety.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          address: string;
          city: string;
          state: string;
          zip: string;
          county: string;
          latitude: number | null;
          longitude: number | null;
          property_type: string;
          bedrooms: number | null;
          bathrooms: number | null;
          sqft: number | null;
          lot_size: number | null;
          year_built: number | null;
          estimated_price: number | null;
          assessed_value: number | null;
          last_sale_price: number | null;
          last_sale_date: string | null;
          owner_name: string | null;
          owner_mailing_address: string | null;
          owner_phone: string | null;
          owner_email: string | null;
          owner_type: string | null;
          distress_type: string;
          distress_amount: number | null;
          distress_date: string | null;
          distress_details: Json | null;
          source: string;
          source_url: string | null;
          source_id: string | null;
          is_vacant: boolean;
          has_code_violations: boolean;
          code_violation_count: number;
          tax_delinquent: boolean;
          tax_delinquent_amount: number | null;
          tax_delinquent_years: number | null;
          mortgage_balance: number | null;
          equity_estimate: number | null;
          arv_estimate: number | null;
          rehab_estimate: number | null;
          profit_estimate: number | null;
          score: number;
          tags: string[];
          notes: string | null;
          images: string[];
          raw_data: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          address: string;
          city: string;
          state: string;
          zip: string;
          county: string;
          latitude?: number | null;
          longitude?: number | null;
          property_type?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          sqft?: number | null;
          lot_size?: number | null;
          year_built?: number | null;
          estimated_price?: number | null;
          assessed_value?: number | null;
          last_sale_price?: number | null;
          last_sale_date?: string | null;
          owner_name?: string | null;
          owner_mailing_address?: string | null;
          owner_phone?: string | null;
          owner_email?: string | null;
          owner_type?: string | null;
          distress_type: string;
          distress_amount?: number | null;
          distress_date?: string | null;
          distress_details?: Json | null;
          source: string;
          source_url?: string | null;
          source_id?: string | null;
          is_vacant?: boolean;
          has_code_violations?: boolean;
          code_violation_count?: number;
          tax_delinquent?: boolean;
          tax_delinquent_amount?: number | null;
          tax_delinquent_years?: number | null;
          mortgage_balance?: number | null;
          equity_estimate?: number | null;
          arv_estimate?: number | null;
          rehab_estimate?: number | null;
          profit_estimate?: number | null;
          score?: number;
          tags?: string[];
          notes?: string | null;
          images?: string[];
          raw_data?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          address?: string;
          city?: string;
          state?: string;
          zip?: string;
          county?: string;
          latitude?: number | null;
          longitude?: number | null;
          property_type?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          sqft?: number | null;
          lot_size?: number | null;
          year_built?: number | null;
          estimated_price?: number | null;
          assessed_value?: number | null;
          last_sale_price?: number | null;
          last_sale_date?: string | null;
          owner_name?: string | null;
          owner_mailing_address?: string | null;
          owner_phone?: string | null;
          owner_email?: string | null;
          owner_type?: string | null;
          distress_type?: string;
          distress_amount?: number | null;
          distress_date?: string | null;
          distress_details?: Json | null;
          source?: string;
          source_url?: string | null;
          source_id?: string | null;
          is_vacant?: boolean;
          has_code_violations?: boolean;
          code_violation_count?: number;
          tax_delinquent?: boolean;
          tax_delinquent_amount?: number | null;
          tax_delinquent_years?: number | null;
          mortgage_balance?: number | null;
          equity_estimate?: number | null;
          arv_estimate?: number | null;
          rehab_estimate?: number | null;
          profit_estimate?: number | null;
          score?: number;
          tags?: string[];
          notes?: string | null;
          images?: string[];
          raw_data?: Json | null;
        };
        Relationships: [];
      };
      deals: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          property_id: string;
          user_id: string;
          stage: string;
          offer_amount: number | null;
          purchase_price: number | null;
          rehab_budget: number | null;
          arv: number | null;
          expected_profit: number | null;
          actual_profit: number | null;
          close_date: string | null;
          sold_date: string | null;
          sold_price: number | null;
          assigned_to: string | null;
          notes: string | null;
          documents: Json | null;
          timeline: Json | null;
          contacts: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id: string;
          user_id: string;
          stage?: string;
          offer_amount?: number | null;
          purchase_price?: number | null;
          rehab_budget?: number | null;
          arv?: number | null;
          expected_profit?: number | null;
          actual_profit?: number | null;
          close_date?: string | null;
          sold_date?: string | null;
          sold_price?: number | null;
          assigned_to?: string | null;
          notes?: string | null;
          documents?: Json | null;
          timeline?: Json | null;
          contacts?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id?: string;
          user_id?: string;
          stage?: string;
          offer_amount?: number | null;
          purchase_price?: number | null;
          rehab_budget?: number | null;
          arv?: number | null;
          expected_profit?: number | null;
          actual_profit?: number | null;
          close_date?: string | null;
          sold_date?: string | null;
          sold_price?: number | null;
          assigned_to?: string | null;
          notes?: string | null;
          documents?: Json | null;
          timeline?: Json | null;
          contacts?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "deals_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          company: string | null;
          phone: string | null;
          role: string;
          markets: string[];
          preferences: Json | null;
          subscription_tier: string;
          subscription_status: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          phone?: string | null;
          role?: string;
          markets?: string[];
          preferences?: Json | null;
          subscription_tier?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          phone?: string | null;
          role?: string;
          markets?: string[];
          preferences?: Json | null;
          subscription_tier?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          name: string;
          search_params: Json;
          notify_email: boolean;
          notify_push: boolean;
          frequency: string;
          last_run_at: string | null;
          results_count: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          name: string;
          search_params: Json;
          notify_email?: boolean;
          notify_push?: boolean;
          frequency?: string;
          last_run_at?: string | null;
          results_count?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          name?: string;
          search_params?: Json;
          notify_email?: boolean;
          notify_push?: boolean;
          frequency?: string;
          last_run_at?: string | null;
          results_count?: number;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scrape_logs: {
        Row: {
          id: string;
          started_at: string;
          source: string;
          status: string;
          properties_found: number;
          new_properties: number;
          records_updated: number;
          records_skipped: number;
          error_message: string | null;
          duration_ms: number | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          started_at?: string;
          source: string;
          status: string;
          properties_found?: number;
          new_properties?: number;
          records_updated?: number;
          records_skipped?: number;
          error_message?: string | null;
          duration_ms?: number | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          started_at?: string;
          source?: string;
          status?: string;
          properties_found?: number;
          new_properties?: number;
          records_updated?: number;
          records_skipped?: number;
          error_message?: string | null;
          duration_ms?: number | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details: Json | null;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details?: Json | null;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          details?: Json | null;
          ip_address?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      distress_type:
        | "Pre-Foreclosure"
        | "NOD"
        | "Lis Pendens"
        | "Auction"
        | "REO"
        | "Tax Lien"
        | "Probate"
        | "Vacant"
        | "Code Violation";
      deal_stage:
        | "Lead"
        | "Contacted"
        | "Offer Sent"
        | "Under Contract"
        | "Closed - Acquired"
        | "Rehab"
        | "Listed"
        | "Sold";
      scrape_status: "running" | "completed" | "failed" | "partial";
      subscription_tier: "free" | "starter" | "pro" | "enterprise";
      user_role: "admin" | "investor" | "agent" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

/** Convenience helpers for extracting Row / Insert / Update types. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
