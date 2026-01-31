import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { attendance, events, members, camps, users, memberAssignments } from '@/db/schema'
import { eq, desc, sql, and, gte } from 'drizzle-orm'
import { subWeeks, format } from 'date-fns'

export const getAttendanceAnalytics = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const now = new Date()
            const twelveWeeksAgo = subWeeks(now, 12)

            // 1. Attendance Trends (Last 12 weeks)
            const attendanceTrends = await db.select({
                date: events.date,
                count: sql<number>`count(${attendance.id})`.mapWith(Number),
                eventName: events.name
            })
                .from(attendance)
                .innerJoin(events, eq(attendance.eventId, events.id))
                .where(and(
                    gte(events.date, twelveWeeksAgo),
                    eq(attendance.status, 'Present')
                ))
                .groupBy(events.date, events.name)
                .orderBy(events.date)

            // Format for chart
            const formattedTrends = attendanceTrends.map(t => ({
                date: format(new Date(t.date), 'MMM dd'),
                fullDate: t.date,
                count: t.count,
                name: t.eventName
            }))

            // 2. Camp Comparison (Total attendance in last 12 weeks)
            const campStats = await db.select({
                name: camps.name,
                attendanceCount: sql<number>`count(${attendance.id})`.mapWith(Number)
            })
                .from(attendance)
                .innerJoin(members, eq(attendance.memberId, members.id))
                .innerJoin(camps, eq(members.campId, camps.id))
                .innerJoin(events, eq(attendance.eventId, events.id))
                .where(and(
                    gte(events.date, twelveWeeksAgo),
                    eq(attendance.status, 'Present')
                ))
                .groupBy(camps.name)
                .orderBy(desc(sql`count(${attendance.id})`))

            // 3. Top Attendees
            const topAttendees = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                profilePicture: members.profilePicture,
                attendanceCount: sql<number>`count(${attendance.id})`.mapWith(Number)
            })
                .from(attendance)
                .innerJoin(members, eq(attendance.memberId, members.id))
                .innerJoin(events, eq(attendance.eventId, events.id))
                .where(and(
                    gte(events.date, twelveWeeksAgo),
                    eq(attendance.status, 'Present')
                ))
                .groupBy(members.id, members.firstName, members.lastName, members.profilePicture)
                .orderBy(desc(sql`count(${attendance.id})`))
                .limit(10)

            // 4. Top Shepherd (Most active shepherd by member attendance)
            // This is complex as we need to link members to shepherds via 'memberAssignments' or 'users' if shepherds are users.
            // Assuming 'memberAssignments' table or 'shepherdId' on members (not in schema I saw, but let's check relationships).
            // Checking schema: members table calls `role`, `status`. 
            // `users` table has `memberId` linking to a profile.
            // `memberAssignments` links `memberId` to `shepherdId` (which is a user.id). 

            // Query: Join attendance -> members -> memberAssignments -> users (shepherd)
            // Count attendance for members assigned to each shepherd.

            // First check if memberAssignments exists and is populated. If not, this might return empty.
            // Let's try to query it.
            /*
            export const memberAssignments = pgTable('member_assignments', {
                id: uuid('id').defaultRandom().primaryKey(),
                memberId: uuid('member_id').references(() => members.id).notNull(),
                shepherdId: uuid('shepherd_id').references(() => users.id).notNull(),
                assignedAt: timestamp('assigned_at').defaultNow(),
            });
            */

            // We need to join attendance -> memberAssignments -> users (shepherd) -> members (shepherd profile info)
            // Wait, `users` table has `memberId` to link to their personal details.
            const topShepherdResult = await db.select({
                shepherdId: users.id,
                firstName: members.firstName,
                lastName: members.lastName,
                attendanceCount: sql<number>`count(${attendance.id})`.mapWith(Number)
            })
                .from(attendance)
                // Link attendance to the member who attended
                // NOW link that member to their assigned shepherd
                .innerJoin(memberAssignments, eq(attendance.memberId, memberAssignments.memberId))
                // Link assignment to the shepherd User
                .innerJoin(users, eq(memberAssignments.shepherdId, users.id))
                // Link shepherd User to their Member profile to get their name
                .innerJoin(members, eq(users.memberId, members.id))
                .innerJoin(events, eq(attendance.eventId, events.id))
                .where(and(
                    gte(events.date, twelveWeeksAgo),
                    eq(attendance.status, 'Present')
                ))
                .groupBy(users.id, members.firstName, members.lastName)
                .orderBy(desc(sql`count(${attendance.id})`))
                .limit(1)

            const topShepherd = topShepherdResult[0] || null

            return {
                trends: formattedTrends,
                campStats,
                topAttendees,
                topShepherd
            }
        } catch (error) {
            console.error('Error fetching analytics:', error)
            return {
                trends: [],
                campStats: [],
                topAttendees: [],
                topShepherd: null
            }
        }
    })
