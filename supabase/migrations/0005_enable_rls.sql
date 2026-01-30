-- Enable Row Level Security on all tables
ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."camps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_assignments" ENABLE ROW LEVEL SECURITY;

-- Members RLS Policies
-- Admins can see all members
CREATE POLICY "Admins can see all members"
  ON "public"."members"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Leaders and Shepherds can see members from their camp
CREATE POLICY "Users can see members from their camp"
  ON "public"."members"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."camp_id" = "members"."camp_id"
    )
  );

-- Admins can insert members
CREATE POLICY "Admins can insert members"
  ON "public"."members"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Leaders can insert members in their camp
CREATE POLICY "Leaders can insert members in their camp"
  ON "public"."members"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" IN ('Admin', 'Leader')
      AND "users"."camp_id" = "members"."camp_id"
    )
  );

-- Admins can update members
CREATE POLICY "Admins can update members"
  ON "public"."members"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Leaders can update members in their camp
CREATE POLICY "Leaders can update members in their camp"
  ON "public"."members"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" IN ('Admin', 'Leader')
      AND "users"."camp_id" = "members"."camp_id"
    )
  );

-- Admins can delete members
CREATE POLICY "Admins can delete members"
  ON "public"."members"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Leaders can delete members in their camp
CREATE POLICY "Leaders can delete members in their camp"
  ON "public"."members"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" IN ('Admin', 'Leader')
      AND "users"."camp_id" = "members"."camp_id"
    )
  );

-- Events RLS Policies
-- Admins can see all events
CREATE POLICY "Admins can see all events"
  ON "public"."events"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- All users can see events from their camp (or ministry-wide events)
CREATE POLICY "Users can see events from their camp"
  ON "public"."events"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND (
        "events"."camp_id" IS NULL
        OR "events"."camp_id" = "users"."camp_id"
      )
    )
  );

-- Admins can insert events
CREATE POLICY "Admins can insert events"
  ON "public"."events"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Leaders can insert events in their camp
CREATE POLICY "Leaders can insert events in their camp"
  ON "public"."events"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" IN ('Admin', 'Leader')
      AND (
        "events"."camp_id" IS NULL
        OR "events"."camp_id" = "users"."camp_id"
      )
    )
  );

-- Admins can update events
CREATE POLICY "Admins can update events"
  ON "public"."events"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Leaders can update events in their camp
CREATE POLICY "Leaders can update events in their camp"
  ON "public"."events"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" IN ('Admin', 'Leader')
      AND (
        "events"."camp_id" IS NULL
        OR "events"."camp_id" = "users"."camp_id"
      )
    )
  );

-- Attendance RLS Policies
-- Users can see attendance for events they have access to
CREATE POLICY "Users can see attendance for accessible events"
  ON "public"."attendance"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."events"
      INNER JOIN "public"."users" ON "users"."id" = auth.uid()
      WHERE "events"."id" = "attendance"."event_id"
      AND (
        "users"."role" = 'Admin'
        OR "events"."camp_id" IS NULL
        OR "events"."camp_id" = "users"."camp_id"
      )
    )
  );

-- Users can insert attendance for events they have access to
CREATE POLICY "Users can insert attendance for accessible events"
  ON "public"."attendance"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."events"
      INNER JOIN "public"."users" ON "users"."id" = auth.uid()
      WHERE "events"."id" = "attendance"."event_id"
      AND (
        "users"."role" IN ('Admin', 'Leader')
        OR "events"."camp_id" = "users"."camp_id"
      )
    )
  );

-- Follow-ups RLS Policies
-- Users can see their own follow-ups and follow-ups for their camp members
CREATE POLICY "Users can see their follow-ups"
  ON "public"."follow_ups"
  FOR SELECT
  USING (
    "user_id" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
    OR EXISTS (
      SELECT 1 FROM "public"."members"
      INNER JOIN "public"."users" ON "users"."id" = auth.uid()
      WHERE "members"."id" = "follow_ups"."member_id"
      AND "members"."camp_id" = "users"."camp_id"
    )
  );

-- Users can insert follow-ups for members they have access to
CREATE POLICY "Users can create follow-ups"
  ON "public"."follow_ups"
  FOR INSERT
  WITH CHECK (
    "user_id" = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM "public"."users"
        WHERE "users"."id" = auth.uid()
        AND "users"."role" = 'Admin'
      )
      OR EXISTS (
        SELECT 1 FROM "public"."members"
        INNER JOIN "public"."users" ON "users"."id" = auth.uid()
        WHERE "members"."id" = "follow_ups"."member_id"
        AND "members"."camp_id" = "users"."camp_id"
      )
    )
  );

-- Users RLS Policies
-- Admins can see all users
CREATE POLICY "Admins can see all users"
  ON "public"."users"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users" as u
      WHERE u."id" = auth.uid()
      AND u."role" = 'Admin'
    )
  );

-- Users can see themselves
CREATE POLICY "Users can see themselves"
  ON "public"."users"
  FOR SELECT
  USING (
    "id" = auth.uid()
  );

-- Camps RLS Policies
-- Admins can see all camps
CREATE POLICY "Admins can see all camps"
  ON "public"."camps"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Users can see their assigned camp
CREATE POLICY "Users can see their camp"
  ON "public"."camps"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."camp_id" = "camps"."id"
    )
  );

-- Member Assignments RLS Policies
-- Admins can see all assignments
CREATE POLICY "Admins can see all assignments"
  ON "public"."member_assignments"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'Admin'
    )
  );

-- Leaders can see assignments for their camp members
CREATE POLICY "Leaders can see assignments for their camp"
  ON "public"."member_assignments"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."members"
      INNER JOIN "public"."users" ON "users"."id" = auth.uid()
      WHERE "members"."id" = "member_assignments"."member_id"
      AND "members"."camp_id" = "users"."camp_id"
    )
  );

-- Shepherds can see their own assignments
CREATE POLICY "Shepherds can see their assignments"
  ON "public"."member_assignments"
  FOR SELECT
  USING (
    "shepherd_id" = auth.uid()
  );
