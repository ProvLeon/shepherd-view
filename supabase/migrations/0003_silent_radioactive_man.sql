CREATE TYPE "public"."category" AS ENUM('Student', 'Workforce', 'NSS', 'Alumni');--> statement-breakpoint
CREATE TYPE "public"."follow_up_outcome" AS ENUM('Reached', 'NoAnswer', 'ScheduledCallback');--> statement-breakpoint
CREATE TYPE "public"."follow_up_type" AS ENUM('Call', 'WhatsApp', 'Prayer', 'Visit', 'Other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Admin', 'Leader', 'Shepherd');--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "follow_up_type" NOT NULL,
	"notes" text,
	"outcome" "follow_up_outcome",
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "member_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"shepherd_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'Shepherd' NOT NULL,
	"member_id" uuid,
	"camp_id" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "camp_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "created_by_id" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "category" "category" DEFAULT 'Student';--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "residence" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "guardian" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "guardian_contact" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "guardian_location" text;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_assignments" ADD CONSTRAINT "member_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_assignments" ADD CONSTRAINT "member_assignments_shepherd_id_users_id_fk" FOREIGN KEY ("shepherd_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;