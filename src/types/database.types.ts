export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'instructor' | 'student';
export type AccountStatus = 'active' | 'inactive' | 'suspended';

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          department_id: string | null;
          account_status: AccountStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          department_id?: string | null;
          account_status?: AccountStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department_id?: string | null;
          account_status?: AccountStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      courses: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string | null;
          department_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          description?: string | null;
          department_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          description?: string | null;
          department_id?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      instructor_departments: {
        Row: {
          id: string;
          instructor_id: string;
          department_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          instructor_id: string;
          department_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          instructor_id?: string;
          department_id?: string;
          created_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      admin_activity_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          admin_email: string;
          admin_name: string;
          action_type: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          admin_email: string;
          admin_name: string;
          action_type: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          admin_email?: string;
          admin_name?: string;
          action_type?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: { user_id: string };
        Returns: string;
      };
      is_admin: {
        Args: Record<string, unknown>;
        Returns: boolean;
      };
      is_active_user: {
        Args: Record<string, unknown>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Department = Database['public']['Tables']['departments']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type InstructorDepartment = Database['public']['Tables']['instructor_departments']['Row'];
export type AdminActivityLog = Database['public']['Tables']['admin_activity_logs']['Row'];
