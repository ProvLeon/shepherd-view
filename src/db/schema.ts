import { pgTable, uuid, text, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['Leader', 'Shepherd', 'Member', 'New Convert', 'Guest']);
export const campusEnum = pgEnum('campus', ['CoHK', 'KNUST', 'Legon', 'Other']);
export const statusEnum = pgEnum('status', ['Active', 'Inactive', 'Archived']);
export const eventTypeEnum = pgEnum('event_type', ['Service', 'Retreat', 'Meeting', 'Outreach']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['Present', 'Absent', 'Excused']);

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
    birthday: date('birthday'),
    joinDate: date('join_date').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
});

// Events Table
export const events = pgTable('events', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    date: timestamp('date').notNull(),
    type: eventTypeEnum('type').default('Service'),
    description: text('description'),
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
