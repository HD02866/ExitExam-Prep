CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"department_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_course_dept_code" UNIQUE("department_id","code")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "instructor_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_instructor_dept" UNIQUE("instructor_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"department_id" uuid,
	"account_status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "check_profile_role" CHECK ("profiles"."role" IN ('admin', 'instructor', 'student')),
	CONSTRAINT "check_profile_account_status" CHECK ("profiles"."account_status" IN ('active', 'inactive', 'suspended'))
);
--> statement-breakpoint
CREATE TABLE "admin_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"admin_email" text NOT NULL,
	"admin_name" text NOT NULL,
	"action_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"department_id" uuid NOT NULL,
	"exam_type" text NOT NULL,
	"course_id" uuid,
	"exam_year" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"passing_score" numeric(5, 2) DEFAULT '50.00' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_exam_type" CHECK ("exams"."exam_type" IN ('exit_exam', 'course_exam')),
	CONSTRAINT "check_exam_status" CHECK ("exams"."status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "check_exam_year" CHECK ("exams"."exam_year" >= 2000 AND "exams"."exam_year" <= 2100),
	CONSTRAINT "check_exam_duration" CHECK ("exams"."duration_minutes" > 0),
	CONSTRAINT "check_exam_total_questions" CHECK ("exams"."total_questions" >= 0),
	CONSTRAINT "check_exam_max_attempts" CHECK ("exams"."max_attempts" >= 1),
	CONSTRAINT "check_exam_passing_score" CHECK ("exams"."passing_score" >= 0 AND "exams"."passing_score" <= 100),
	CONSTRAINT "check_exam_type_course" CHECK (("exams"."exam_type" = 'course_exam' AND "exams"."course_id" IS NOT NULL) OR ("exams"."exam_type" = 'exit_exam'))
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"option_key" text NOT NULL,
	"option_text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_question_option_key" UNIQUE("question_id","option_key"),
	CONSTRAINT "check_option_key" CHECK ("question_options"."option_key" IN ('A', 'B', 'C', 'D'))
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"question_order" integer DEFAULT 1 NOT NULL,
	"explanation" text,
	"points" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_question_points" CHECK ("questions"."points" > 0),
	CONSTRAINT "check_question_order" CHECK ("questions"."question_order" >= 1)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_departments" ADD CONSTRAINT "instructor_departments_instructor_id_profiles_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_departments" ADD CONSTRAINT "instructor_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_session_token" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_courses_dept" ON "courses" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_courses_active" ON "courses" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_courses_dept_code_upper" ON "courses" USING btree ("department_id",upper(trim("code")));--> statement-breakpoint
CREATE INDEX "idx_departments_active" ON "departments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_name_lower" ON "departments" USING btree (lower(trim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_code_upper" ON "departments" USING btree (upper(trim("code")));--> statement-breakpoint
CREATE INDEX "idx_inst_dept_inst" ON "instructor_departments" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "idx_inst_dept_dept" ON "instructor_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_role" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_profiles_dept" ON "profiles" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_status" ON "profiles" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_admin_id" ON "admin_activity_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_action" ON "admin_activity_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_entity" ON "admin_activity_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created_at" ON "admin_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_exams_department_id" ON "exams" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_exams_course_id" ON "exams" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_exams_status" ON "exams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_exams_created_by" ON "exams" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_exams_exam_type" ON "exams" USING btree ("exam_type");--> statement-breakpoint
CREATE INDEX "idx_exams_exam_year" ON "exams" USING btree ("exam_year");--> statement-breakpoint
CREATE INDEX "idx_exams_created_at" ON "exams" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_question_one_correct" ON "question_options" USING btree ("question_id") WHERE "question_options"."is_correct" = true;--> statement-breakpoint
CREATE INDEX "idx_question_options_question_id" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_question_options_is_correct" ON "question_options" USING btree ("question_id","is_correct");--> statement-breakpoint
CREATE INDEX "idx_questions_exam_id" ON "questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "idx_questions_exam_order" ON "questions" USING btree ("exam_id","question_order");