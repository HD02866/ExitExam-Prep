export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'instructor' | 'student';
export type AccountStatus = 'active' | 'inactive' | 'suspended';
export type ExamType = 'exit_exam' | 'course_exam';
export type ExamStatus = 'draft' | 'published' | 'archived';
export type OptionKey = 'A' | 'B' | 'C' | 'D';

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
      exams: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          department_id: string;
          exam_type: ExamType;
          course_id: string | null;
          exam_year: number;
          duration_minutes: number;
          total_questions: number;
          max_attempts: number;
          passing_score: number;
          status: ExamStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          department_id: string;
          exam_type: ExamType;
          course_id?: string | null;
          exam_year: number;
          duration_minutes: number;
          total_questions?: number;
          max_attempts?: number;
          passing_score?: number;
          status?: ExamStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          department_id?: string;
          exam_type?: ExamType;
          course_id?: string | null;
          exam_year?: number;
          duration_minutes?: number;
          total_questions?: number;
          max_attempts?: number;
          passing_score?: number;
          status?: ExamStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exams_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exams_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exams_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      questions: {
        Row: {
          id: string;
          exam_id: string;
          question_text: string;
          question_order: number;
          explanation: string | null;
          points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          question_text: string;
          question_order?: number;
          explanation?: string | null;
          points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          question_text?: string;
          question_order?: number;
          explanation?: string | null;
          points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          }
        ];
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          option_key: OptionKey;
          option_text: string;
          is_correct: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_key: OptionKey;
          option_text: string;
          is_correct?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_key?: OptionKey;
          option_text?: string;
          is_correct?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
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
      validate_exam_for_publication: {
        Args: { p_exam_id: string };
        Returns: {
          is_valid: boolean;
          errors: string[];
          question_count: number;
          total_points: number;
        }[];
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
export type Exam = Database['public']['Tables']['exams']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type QuestionOption = Database['public']['Tables']['question_options']['Row'];

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

export interface ExamWithDetails extends Exam {
  department?: Department | null;
  course?: Course | null;
  creator?: Profile | null;
  question_count?: number;
}
