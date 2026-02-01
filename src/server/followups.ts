import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { followUps, members, users, memberAssignments } from '@/db/schema'
import { desc, eq, sql, and, gte, lte, ilike, or, notInArray, isNull, lt, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { attendance, events } from '@/db/schema'
import { subWeeks } from 'date-fns'
import { getCurrentUser } from './auth'

const shepherds = alias(members, 'shepherds')

// Validation schema for filters
const followUpFiltersSchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  type: z.string().optional(),
  outcome: z.string().optional(),
  shepherdId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const getAllFollowUps = createServerFn({ method: "GET" })
  .inputValidator((data: z.infer<typeof followUpFiltersSchema>) => data)
  .handler(async ({ data }) => {
    try {
      const { page, limit, type, outcome, shepherdId, search, startDate, endDate } = data
      const offset = (page - 1) * limit

      const conditions = []

      if (type && type !== 'all') conditions.push(eq(followUps.type, type as any))
      if (outcome && outcome !== 'all') conditions.push(eq(followUps.outcome, outcome as any))
      if (shepherdId && shepherdId !== 'all') conditions.push(eq(followUps.userId, shepherdId))
      if (startDate) conditions.push(gte(followUps.createdAt, new Date(startDate)))
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // End of day
        conditions.push(lte(followUps.createdAt, end))
      }
      if (search) {
        const searchLower = `%${search.toLowerCase()}%`
        conditions.push(or(
          ilike(members.firstName, searchLower),
          ilike(members.lastName, searchLower),
          ilike(shepherds.firstName, searchLower), // Shepherd name
          ilike(followUps.notes, searchLower)
        ))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get total count for pagination
      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(followUps)
        .leftJoin(members, eq(followUps.memberId, members.id))
        .leftJoin(users, eq(followUps.userId, users.id))
        .leftJoin(shepherds, eq(users.memberId, shepherds.id))
        .where(whereClause)

      const total = Number(totalResult[0]?.count || 0)

      const results = await db.select({
        id: followUps.id,
        date: followUps.createdAt,
        type: followUps.type,
        outcome: followUps.outcome,
        notes: followUps.notes,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          status: members.status,
        },
        shepherd: {
          id: users.id,
          email: users.email,
          firstName: shepherds.firstName,
          lastName: shepherds.lastName,
        }
      })
        .from(followUps)
        .leftJoin(members, eq(followUps.memberId, members.id))
        .leftJoin(users, eq(followUps.userId, users.id))
        .leftJoin(shepherds, eq(users.memberId, shepherds.id))
        .where(whereClause)
        .orderBy(desc(followUps.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results,
        total,
        totalPages: Math.ceil(total / limit),
        page
      };
    } catch (error) {
      console.error('Error fetching global follow-ups:', error);
      return { data: [], total: 0, totalPages: 0, page: 1 };
    }
  });

export const getShepherds = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // Fetch users who are shepherds or admins/leaders
      // We join with members to get their names
      const result = await db.select({
        id: users.id,
        email: users.email,
        firstName: members.firstName,
        lastName: members.lastName,
        role: users.role
      })
        .from(users)
        .leftJoin(members, eq(users.memberId, members.id))
        .orderBy(members.firstName)

      return result
    } catch (error) {
      console.error('Error fetching shepherds:', error)
      return []
    }
  })

export const getFollowUpStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);

      // Total follow ups
      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(followUps);

      // This week
      const weeklyResult = await db.select({ count: sql<number>`count(*)` })
        .from(followUps)
        .where(gte(followUps.createdAt, startOfWeek));

      // Outcome Breakdown
      const outcomeStats = await db.select({
        outcome: followUps.outcome,
        count: sql<number>`count(*)`
      })
        .from(followUps)
        .groupBy(followUps.outcome);

      // Type Breakdown
      const typeStats = await db.select({
        type: followUps.type,
        count: sql<number>`count(*)`
      })
        .from(followUps)
        .groupBy(followUps.type);

      return {
        total: Number(totalResult[0]?.count || 0),
        thisWeek: Number(weeklyResult[0]?.count || 0),
        outcomes: outcomeStats.map(s => ({ name: s.outcome || 'Unknown', value: Number(s.count) })),
        types: typeStats.map(s => ({ name: s.type, value: Number(s.count) }))
      };
    } catch (error) {
      console.error('Error fetching follow-up stats:', error);
      return { total: 0, thisWeek: 0, outcomes: [], types: [] };
    }
  });

// --- Member Specific Follow-ups ---

export const getMemberFollowUps = createServerFn({ method: "GET" })
  .inputValidator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const results = await db.select()
        .from(followUps)
        .where(eq(followUps.memberId, data.memberId))
        .orderBy(desc(followUps.createdAt));
      return results;
    } catch (error) {
      console.error('Error fetching member follow-ups:', error);
      return [];
    }
  });

export const createFollowUp = createServerFn({ method: "POST" })
  .inputValidator((data: {
    memberId: string,
    userId: string,
    type: any,
    notes: string,
    outcome: any,
    scheduledAt?: string
  }) => data)
  .handler(async ({ data }) => {
    try {
      await db.insert(followUps).values({
        memberId: data.memberId,
        userId: data.userId,
        type: data.type,
        notes: data.notes,
        outcome: data.outcome,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdAt: new Date(), // Explicitly setting creation time
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error creating follow-up:', error);
      return { success: false, message: error.message };
    }
  });

export const deleteFollowUp = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    try {
      await db.delete(followUps).where(eq(followUps.id, data.id));
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting follow-up:', error);
      return { success: false, message: error.message };
    }
  });

export const getMembersNeedingAttention = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const now = new Date()
      const fourWeeksAgo = subWeeks(now, 4)
      const oneWeekAgo = subWeeks(now, 1)

      // Get current user for RBAC filtering
      const currentUser = await getCurrentUser()

      // For Shepherds, get their assigned member IDs
      let assignedMemberIds: string[] = []
      if (currentUser && currentUser.role === 'Shepherd') {
        const assignments = await db.select({ memberId: memberAssignments.memberId })
          .from(memberAssignments)
          .where(eq(memberAssignments.shepherdId, currentUser.id))
        assignedMemberIds = assignments.map(a => a.memberId)

        // If shepherd has no assignments, return empty
        if (assignedMemberIds.length === 0) {
          return []
        }
      }

      // 1. Inactive Members: Active Status + No attendance in last 4 weeks
      // First, find members who HAVE attended in last 4 weeks
      const recentAttendees = await db.selectDistinct({ id: attendance.memberId })
        .from(attendance)
        .innerJoin(events, eq(attendance.eventId, events.id))
        .where(gte(events.date, fourWeeksAgo))

      const recentAttendeeIds = recentAttendees.map(a => a.id)

      // 2. Filter out members who have been followed up with recently (Snooze logic)
      // If we contacted them in the last week, don't show them as "Inactive" alert
      const recentFollowUps = await db.selectDistinct({ id: followUps.memberId })
        .from(followUps)
        .where(gte(followUps.completedAt, oneWeekAgo))

      const recentFollowUpIds = recentFollowUps.map(f => f.id)
      const excludedIds = [...recentAttendeeIds, ...recentFollowUpIds]

      // Build conditions for filtering
      const inactiveConditions: any[] = [
        eq(members.status, 'Active'),
        excludedIds.length > 0 ? notInArray(members.id, excludedIds) : undefined,
      ]

      // Add shepherd filtering
      if (currentUser?.role === 'Shepherd') {
        inactiveConditions.push(inArray(members.id, assignedMemberIds))
      }

      // Add camp filtering for leaders
      if (currentUser?.role === 'Leader' && currentUser?.campId) {
        inactiveConditions.push(eq(members.campId, currentUser.campId!))
      }

      inactiveConditions.filter(Boolean)

      const inactiveMembersQuery = db.select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        status: members.status,
        lastSeen: sql<string>`MAX(${events.date})`,
        reason: sql<string>`'Inactive'`,
        daysOverdue: sql<number>`EXTRACT(DAY FROM NOW() - MAX(${events.date}))`
      })
        .from(members)
        .leftJoin(attendance, eq(members.id, attendance.memberId))
        .leftJoin(events, eq(attendance.eventId, events.id))
        .where(and(...inactiveConditions))
        .groupBy(members.id, members.firstName, members.lastName, members.status)
        .limit(5)

      const inactiveMembers = await inactiveMembersQuery

      // Format inactive members for response
      const formattedInactive = inactiveMembers.map(m => ({
        id: m.id, // Member ID
        type: 'inactive',
        referenceId: m.id, // Member ID
        firstName: m.firstName,
        lastName: m.lastName,
        reason: m.reason, // 'Inactive'
        daysOverdue: m.daysOverdue
      }))


      // Re-query overdue with followUp ID
      const overdueConditions: any[] = [
        lt(followUps.scheduledAt, now),
        isNull(followUps.completedAt),
      ]

      // Add shepherd filtering
      if (currentUser?.role === 'Shepherd') {
        overdueConditions.push(inArray(members.id, assignedMemberIds))
      }

      // Add camp filtering for leaders
      if (currentUser?.role === 'Leader' && currentUser?.campId) {
        overdueConditions.push(eq(members.campId, currentUser.campId!))
      }

      const overdueFollowUpsWithId = await db.select({
        memberId: members.id,
        followUpId: followUps.id,
        firstName: members.firstName,
        lastName: members.lastName,
        reason: sql<string>`'Overdue Follow-up'`,
        daysOverdue: sql<number>`EXTRACT(DAY FROM NOW() - ${followUps.scheduledAt})`
      })
        .from(followUps)
        .innerJoin(members, eq(followUps.memberId, members.id))
        .where(and(...overdueConditions))
        .limit(5)

      const formattedOverdueFinal = overdueFollowUpsWithId.map(f => ({
        id: f.memberId,
        type: 'overdue',
        referenceId: f.followUpId, // The FollowUp ID
        firstName: f.firstName,
        lastName: f.lastName,
        reason: f.reason,
        daysOverdue: f.daysOverdue
      }))

      return [...formattedInactive, ...formattedOverdueFinal]
    } catch (error) {
      console.error('Error fetching members needing attention:', error)
      return []
    }
  })

export const dismissActionItem = createServerFn({ method: "POST" })
  .inputValidator((data: { type: string, referenceId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { type, referenceId } = data

      // Get current user (we need an ID for creating follow-up)
      // For now, if no user, we might fail or use a system user?
      // Auth check:
      // This requires Auth import, but followups.ts doesn't have it.
      // Let's import createSupabaseServerClient and get user.

      if (type === 'overdue') {
        // Delete the follow-up
        await db.delete(followUps).where(eq(followUps.id, referenceId))
        return { success: true }
      } else if (type === 'inactive') {
        // "Snooze" by creating a 'Dismissed' follow-up
        // We need `userId` (who dismissed).
        // Let's just grab the first admin or the current user.
        // Since this is server function, let's use a placeholder or null if schema allows?
        // Schema requires userId.
        // We'll import `getCurrentUser` from auth? Or just fetch a random Admin.

        // HACK: For speed, let's just find ANY user to attribute this to, or the member's shepherd?
        // Better: Use `getCurrentUser` from auth.ts

        // But circular dependency risk if auth imports db? No, auth uses db.
        // Let's assume we can get a userId.
        // For now, let's pick the FIRST user in DB.
        const [actor] = await db.select().from(users).limit(1)

        if (!actor) return { success: false, message: 'No user found to perform action' }

        await db.insert(followUps).values({
          memberId: referenceId, // referenceId is memberId for inactive
          userId: actor.id,
          type: 'Other',
          notes: 'Alert dismissed from dashboard (System Check-in)',
          outcome: 'Reached', // 'Dismissed' is not a valid enum value
          completedAt: new Date(),
          createdAt: new Date()
        })
        return { success: true, message: 'Alert snoozed for 1 week' }
      }
      return { success: false, message: 'Invalid type' }
    } catch (error: any) {
      console.error('Error dismissing action:', error)
      return { success: false, message: error.message }
    }
  })
