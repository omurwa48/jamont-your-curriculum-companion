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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      certificates: {
        Row: {
          certificate_url: string | null
          course_id: string | null
          description: string | null
          id: string
          issued_date: string | null
          share_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          course_id?: string | null
          description?: string | null
          id?: string
          issued_date?: string | null
          share_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          course_id?: string | null
          description?: string | null
          id?: string
          issued_date?: string | null
          share_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          sources: string[] | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          sources?: string[] | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          sources?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          completed_lessons: number | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_hours: number | null
          id: string
          thumbnail_url: string | null
          title: string
          total_lessons: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_lessons?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_hours?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          total_lessons?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_lessons?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_hours?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          total_lessons?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          id: string
          page_number: number | null
          user_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          document_id: string
          id?: string
          page_number?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          id?: string
          page_number?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          title: string
          total_chunks: number | null
          updated_at: string
          upload_status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          title: string
          total_chunks?: number | null
          updated_at?: string
          upload_status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          title?: string
          total_chunks?: number | null
          updated_at?: string
          upload_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          likes_count: number | null
          post_type: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          post_type: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          completed_at: string | null
          content: string | null
          course_id: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          lesson_order: number
          title: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          completed_at?: string | null
          content?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          lesson_order: number
          title: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          completed_at?: string | null
          content?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          lesson_order?: number
          title?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          sources: string[] | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sources?: string[] | null
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sources?: string[] | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean
          quiz_id: string
          time_taken: number | null
          user_answer: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct: boolean
          quiz_id: string
          time_taken?: number | null
          user_answer: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean
          quiz_id?: string
          time_taken?: number | null
          user_answer?: string
          user_id?: string
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
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json
          question: string
          topic: string
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options: Json
          question: string
          topic: string
          user_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_description: string | null
          badge_name: string
          badge_type: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          badge_type: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_connections: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          courses_completed: number | null
          created_at: string | null
          display_name: string | null
          id: string
          level: number | null
          linkedin_url: string | null
          study_streak: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          courses_completed?: number | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          level?: number | null
          linkedin_url?: string | null
          study_streak?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          courses_completed?: number | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          level?: number | null
          linkedin_url?: string | null
          study_streak?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          correct_answers: number | null
          created_at: string | null
          id: string
          last_practiced_at: string | null
          mastery_level: number | null
          questions_answered: number | null
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number | null
          questions_answered?: number | null
          topic: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number | null
          questions_answered?: number | null
          topic?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
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
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
