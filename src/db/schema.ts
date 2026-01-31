import { pgTable, uuid, text, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['Leader', 'Shepherd', 'Member', 'New Convert', 'Guest']);
export const campusEnum = pgEnum('campus', ['CoHK', 'KNUST', 'Legon', 'Other']);
export const statusEnum = pgEnum('status', ['Active', 'Inactive', 'Archived']);
export const categoryEnum = pgEnum('category', ['Student', 'Workforce', 'NSS', 'Alumni']);
export const eventTypeEnum = pgEnum('event_type', ['Service', 'Retreat', 'Meeting', 'Outreach']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['Present', 'Absent', 'Excused']);
export const userRoleEnum = pgEnum('user_role', ['Admin', 'Leader', 'Shepherd']);
export const followUpTypeEnum = pgEnum('follow_up_type', ['Call', 'WhatsApp', 'Prayer', 'Visit', 'Other']);
export const followUpOutcomeEnum = pgEnum('follow_up_outcome', ['Reached', 'NoAnswer', 'ScheduledCallback']);

// Camps Table
export const camps = pgTable('camps', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // e.g., "Camp 1"
    leaderId: uuid('leader_id'), // We will link this later to avoid circular dependency issues if strict
    createdAt: timestamp('created_at').defaultNow(),
});

// Members Table
export const members = pgTable('members', {
    id: uuid('id').defaultRandom().primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').unique(),
    phone: text('phone'),
    campus: campusEnum('campus').default('CoHK'),
    campId: uuid('camp_id').references(() => camps.id),
    role: roleEnum('role').default('Member'),
    status: statusEnum('status').default('Active'),
    category: categoryEnum('category').default('Student'),
    region: text('region'),
    residence: text('residence'),
    guardian: text('guardian'), // Name
    guardianContact: text('guardian_contact'),
    guardianLocation: text('guardian_location'),
    birthday: date('birthday'),
    joinDate: date('join_date').defaultNow(),
    profilePicture: text('profile_picture'), // URL to Supabase Storage
    updateToken: text('update_token'), // Secure token for self-service update
    tokenExpiresAt: timestamp('token_expires_at'), // When the token expires
    createdAt: timestamp('created_at').defaultNow(),
});

// Events Table
export const events = pgTable('events', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    date: timestamp('date').notNull(),
    type: eventTypeEnum('type').default('Service'),
    description: text('description'),
    meetingUrl: text('meeting_url'), // For Google Meet links
    isRecurring: text('is_recurring'), // 'weekly', 'biweekly', 'monthly', or null
    campId: uuid('camp_id').references(() => camps.id), // null = ministry-wide, else camp-specific
    createdById: uuid('created_by_id'), // User who created the event
    createdAt: timestamp('created_at').defaultNow(),
});

// Attendance Table
export const attendance = pgTable('attendance', {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id').references(() => members.id).notNull(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    status: attendanceStatusEnum('status').default('Present'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Settings Table (key-value store)
export const settings = pgTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Users Table (for authentication and RBAC)
export const users = pgTable('users', {
    id: uuid('id').primaryKey(), // From Supabase Auth
    email: text('email').notNull().unique(),
    role: userRoleEnum('role').notNull().default('Shepherd'),
    memberId: uuid('member_id').references(() => members.id), // Link to their member profile
    campId: uuid('camp_id').references(() => camps.id), // Which camp they manage
    createdAt: timestamp('created_at').defaultNow(),
});

// Follow-ups Table (for tracking member interactions)
export const followUps = pgTable('follow_ups', {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id').references(() => members.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(), // Who did the follow-up
    type: followUpTypeEnum('type').notNull(),
    notes: text('notes'),
    outcome: followUpOutcomeEnum('outcome'),
    scheduledAt: timestamp('scheduled_at'), // For reminders
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Member-Shepherd Assignments
export const memberAssignments = pgTable('member_assignments', {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id').references(() => members.id).notNull(),
    shepherdId: uuid('shepherd_id').references(() => users.id).notNull(),
    assignedAt: timestamp('assigned_at').defaultNow(),
});

// Leader-Campus Assignments (Many-to-Many)
export const leaderCampuses = pgTable('leader_campuses', {
    id: uuid('id').defaultRandom().primaryKey(),
    leaderId: uuid('leader_id').references(() => users.id).notNull(),
    campus: campusEnum('campus').notNull(),
    assignedAt: timestamp('assigned_at').defaultNow(),
});

