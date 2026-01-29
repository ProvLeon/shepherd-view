CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Absent', 'Excused');--> statement-breakpoint
CREATE TYPE "public"."campus" AS ENUM('CoHK', 'KNUST', 'Legon', 'Other');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('Service', 'Retreat', 'Meeting', 'Outreach');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('Leader', 'Shepherd', 'Member', 'New Convert', 'Guest');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Active', 'Inactive', 'Archived');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "attendance_status" DEFAULT 'Present',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "camps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"leader_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" timestamp NOT NULL,
	"type" "event_type" DEFAULT 'Service',
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"campus" "campus" DEFAULT 'CoHK',
	"camp_id" uuid,
	"role" "role" DEFAULT 'Member',
	"status" "status" DEFAULT 'Active',
	"birthday" date,
	"join_date" date DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;