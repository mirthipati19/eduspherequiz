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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attempt_answers: {
        Row: {
          answer_text: string | null
          attempt_id: string
          auto_graded_score: number | null
          created_at: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          requires_manual_review: boolean | null
          updated_at: string
        }
        Insert: {
          answer_text?: string | null
          attempt_id: string
          auto_graded_score?: number | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          requires_manual_review?: boolean | null
          updated_at?: string
        }
        Update: {
          answer_text?: string | null
          attempt_id?: string
          auto_graded_score?: number | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          requires_manual_review?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          expected_keywords: Json | null
          has_image: boolean | null
          id: string
          image_url: string | null
          keyword_weightage: Json | null
          options: Json | null
          order_index: number
          points: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          expected_keywords?: Json | null
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          keyword_weightage?: Json | null
          options?: Json | null
          order_index: number
          points?: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          expected_keywords?: Json | null
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          keyword_weightage?: Json | null
          options?: Json | null
          order_index?: number
          points?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_seb_session: boolean | null
          max_score: number | null
          quiz_id: string
          score: number | null
          seb_session_data: Json | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_email: string | null
          student_name: string | null
          submitted_at: string | null
          time_spent: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_seb_session?: boolean | null
          max_score?: number | null
          quiz_id: string
          score?: number | null
          seb_session_data?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_email?: string | null
          student_name?: string | null
          submitted_at?: string | null
          time_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_seb_session?: boolean | null
          max_score?: number | null
          quiz_id?: string
          score?: number | null
          seb_session_data?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_email?: string | null
          student_name?: string | null
          submitted_at?: string | null
          time_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          access_password: string | null
          allow_multiple_attempts: boolean | null
          created_at: string
          created_by: string
          description: string | null
          duration: number | null
          id: string
          max_attempts: number | null
          password_protected: boolean | null
          require_seb: boolean | null
          seb_browser_exam_key: string | null
          seb_config_key: string | null
          seb_quit_url: string | null
          show_results_immediately: boolean | null
          shuffle_questions: boolean | null
          status: Database["public"]["Enums"]["quiz_status"]
          title: string
          updated_at: string
        }
        Insert: {
          access_password?: string | null
          allow_multiple_attempts?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          duration?: number | null
          id?: string
          max_attempts?: number | null
          password_protected?: boolean | null
          require_seb?: boolean | null
          seb_browser_exam_key?: string | null
          seb_config_key?: string | null
          seb_quit_url?: string | null
          show_results_immediately?: boolean | null
          shuffle_questions?: boolean | null
          status?: Database["public"]["Enums"]["quiz_status"]
          title: string
          updated_at?: string
        }
        Update: {
          access_password?: string | null
          allow_multiple_attempts?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration?: number | null
          id?: string
          max_attempts?: number | null
          password_protected?: boolean | null
          require_seb?: boolean | null
          seb_browser_exam_key?: string | null
          seb_config_key?: string | null
          seb_quit_url?: string | null
          show_results_immediately?: boolean | null
          shuffle_questions?: boolean | null
          status?: Database["public"]["Enums"]["quiz_status"]
          title?: string
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
      generate_access_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      attempt_status: "in_progress" | "submitted" | "graded"
      question_type: "multiple-choice" | "fill-blank" | "short-answer"
      quiz_status: "draft" | "published" | "archived"
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
      app_role: ["admin", "moderator", "user"],
      attempt_status: ["in_progress", "submitted", "graded"],
      question_type: ["multiple-choice", "fill-blank", "short-answer"],
      quiz_status: ["draft", "published", "archived"],
    },
  },
} as const
