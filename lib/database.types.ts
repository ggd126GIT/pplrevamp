export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string | null
          cv_url: string
          email: string
          first_name: string
          id: string
          job_id: string | null
          last_name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          cv_url: string
          email: string
          first_name: string
          id?: string
          job_id?: string | null
          last_name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          cv_url?: string
          email?: string
          first_name?: string
          id?: string
          job_id?: string | null
          last_name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload: Json
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          type?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string | null
          department: string | null
          description: Json | null
          id: string
          location: string | null
          slug: string
          status: string
          title: string
          updated_at: string | null
          work_mode: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          description?: Json | null
          id?: string
          location?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
          work_mode?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          description?: Json | null
          id?: string
          location?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
          work_mode?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          content: Json | null
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
