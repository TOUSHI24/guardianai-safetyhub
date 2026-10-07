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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      behavior_baselines: {
        Row: {
          baseline: Json
          sample_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline?: Json
          sample_count?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          baseline?: Json
          sample_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      behavior_samples: {
        Row: {
          accepted: boolean
          accuracy: number | null
          activity: string
          duration_seconds: number
          id: string
          latitude: number | null
          longitude: number | null
          recorded_at: string
          speed: number
          user_id: string
        }
        Insert: {
          accepted?: boolean
          accuracy?: number | null
          activity: string
          duration_seconds?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string
          speed?: number
          user_id?: string
        }
        Update: {
          accepted?: boolean
          accuracy?: number | null
          activity?: string
          duration_seconds?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string
          speed?: number
          user_id?: string
        }
        Relationships: []
      }
      emergency_events: {
        Row: {
          created_at: string
          email_error: string | null
          email_status: string
          emails_failed: number
          emails_sent: number
          id: string
          latitude: number | null
          longitude: number | null
          message: string
          reasons: Json
          risk: string
          risk_score: number
          status: string
          trigger: string
          user_id: string
          user_response: string | null
        }
        Insert: {
          created_at?: string
          email_error?: string | null
          email_status?: string
          emails_failed?: number
          emails_sent?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          message: string
          reasons?: Json
          risk?: string
          risk_score?: number
          status?: string
          trigger?: string
          user_id?: string
          user_response?: string | null
        }
        Update: {
          created_at?: string
          email_error?: string | null
          email_status?: string
          emails_failed?: number
          emails_sent?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string
          reasons?: Json
          risk?: string
          risk_score?: number
          status?: string
          trigger?: string
          user_id?: string
          user_response?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      risk_alerts: {
        Row: {
          confidence: number
          created_at: string
          deadline: string | null
          emergency_event_id: string | null
          id: string
          latitude: number | null
          level: string
          longitude: number | null
          reasons: Json
          sample_id: string | null
          score: number
          status: string
          user_id: string
          user_response: string | null
        }
        Insert: {
          confidence: number
          created_at?: string
          deadline?: string | null
          emergency_event_id?: string | null
          id?: string
          latitude?: number | null
          level: string
          longitude?: number | null
          reasons?: Json
          sample_id?: string | null
          score: number
          status?: string
          user_id?: string
          user_response?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          deadline?: string | null
          emergency_event_id?: string | null
          id?: string
          latitude?: number | null
          level?: string
          longitude?: number | null
          reasons?: Json
          sample_id?: string | null
          score?: number
          status?: string
          user_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_emergency_event_id_fkey"
            columns: ["emergency_event_id"]
            isOneToOne: false
            referencedRelation: "emergency_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "behavior_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          is_primary: boolean
          name: string
          notify: boolean
          phone: string
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          name: string
          notify?: boolean
          phone?: string
          relationship?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          name?: string
          notify?: boolean
          phone?: string
          relationship?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
