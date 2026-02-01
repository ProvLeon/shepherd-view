import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { events, attendance, members, memberAssignments, users } from '@/db/schema'
import { eq, desc, sql, and, inArray } from 'drizzle-orm'
import { createSupabaseServerClient } from './supabase'

// Helper function to get current user from context
async function getCurrentUserFromContext(context: any) {
  try {
    const supabase = createSupabaseServerClient(context)

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user profile from our database
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!userProfile) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      role: userProfile.role,
      memberId: userProfile.memberId,
      campId: userProfile.campId || '',
    }
  } catch (error) {
    console.error('[Helper] Error getting current user:', error)
    return null
  }
}

// Get all events with attendance counts (filtered by user's camp)
export const getEvents = createServerFn({ method: "GET" })
  .handler(async (context) => {
    try {
      const currentUser = await getCurrentUserFromContext(context)

      // Build where conditions
      const whereConditions = []
      if (currentUser && currentUser.role !== 'Admin' && currentUser.campId) {
        whereConditions.push(eq(events.campId, currentUser.campId))
      }

      const eventsQuery = db.select({
        id: events.id,
        name: events.name,
        date: events.date,
        type: events.type,
        description: events.description,
        meetingUrl: events.meetingUrl,
        isRecurring: events.isRecurring,
        createdAt: events.createdAt,
        campId: events.campId,
      })
        .from(events)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(events.date))

      const allEvents = await eventsQuery

      // Get attendance counts for each event (with camp filtering)
      const eventsWithCounts = await Promise.all(
        allEvents.map(async (event) => {
          // Build where conditions
          const attendanceWhereConditions = [eq(attendance.eventId, event.id)]

          // Filter by camp for non-Admin users
          if (currentUser && currentUser.role !== 'Admin' && currentUser.campId) {
            attendanceWhereConditions.push(eq(members.campId, currentUser.campId))
          }

          const counts = await db.select({
            status: attendance.status,
            count: sql<number>`count(*)`,
          })
            .from(attendance)
            .innerJoin(members, eq(attendance.memberId, members.id))
            .where(and(...attendanceWhereConditions))
            .groupBy(attendance.status)

          const present = counts.find(c => c.status === 'Present')?.count || 0
          const absent = counts.find(c => c.status === 'Absent')?.count || 0
          const excused = counts.find(c => c.status === 'Excused')?.count || 0

          return {
            ...event,
            presentCount: Number(present),
            absentCount: Number(absent),
            excusedCount: Number(excused),
            totalCount: Number(present) + Number(absent) + Number(excused),
          }
        })
      )

      return eventsWithCounts
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  })

// Create a new event
export const createEvent = createServerFn({ method: "POST" })
  .handler(async (context) => {
    if (!context.data) {
      return { success: false, message: "No data provided" }
    }

    const { name, date, type, description, meetingUrl } = context.data as {
      name: string
      date: string
      type: 'Service' | 'Retreat' | 'Meeting' | 'Outreach'
      description?: string
      meetingUrl?: string
    }

    try {
      const currentUser = await getCurrentUserFromContext(context)

      if (!currentUser) {
        return { success: false, message: "Unauthorized" }
      }

      // Leaders and Shepherds can only create events for their camp
      const campIdToUse = currentUser.role === 'Admin' ? null : currentUser.campId

      const [newEvent] = await db.insert(events).values({
        name,
        date: new Date(date),
        type,
        description: description || null,
        meetingUrl: meetingUrl || null,
        campId: campIdToUse || null,
      }).returning()

      return { success: true, event: newEvent }
    } catch (error: any) {
      console.error('Error creating event:', error)
      return { success: false, message: error.message }
    }
  })

// Get attendance for a specific event (with RBAC)
export const getEventAttendance = createServerFn({ method: "GET" })
  .inputValidator((data: { eventId: string }) => data)
  .handler(async (context) => {
    try {
      const currentUser = await getCurrentUserFromContext(context)

      if (!currentUser) {
        return []
      }

      // Verify user has access to this event
      const eventToAccess = await db.select({
        id: events.id,
        campId: events.campId,
      })
        .from(events)
        .where(eq(events.id, context.data.eventId))
        .limit(1)

      if (!eventToAccess[0]) {
        return []
      }

      // Check authorization
      if (currentUser.role !== 'Admin' && eventToAccess[0].campId !== currentUser.campId) {
        return []
      }

      // For Shepherds, show all members in their camp but only allow editing assigned ones
      if (currentUser.role === 'Shepherd') {
        // Get assigned member IDs for canEdit flag
        const assignedMembers = await db.select({ memberId: memberAssignments.memberId })
          .from(memberAssignments)
          .where(eq(memberAssignments.shepherdId, currentUser.id))

        const assignedIds = new Set(assignedMembers.map(a => a.memberId))

        // Fetch ALL active members in the Shepherd's camp
        const allMembers = await db.select({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          role: members.role,
          campId: members.campId,
        })
          .from(members)
          .where(and(
            eq(members.status, 'Active'),
            currentUser.campId ? eq(members.campId, currentUser.campId) : undefined
          ))

        // Get attendance records for this event
        const attendanceRecords = await db.select()
          .from(attendance)
          .where(eq(attendance.eventId, context.data.eventId))

        // Map attendance status to members
        const membersWithAttendance = allMembers.map(member => {
          const record = attendanceRecords.find(a => a.memberId === member.id)
          return {
            ...member,
            attendanceId: record?.id || null,
            attendanceStatus: record?.status || null,
            notes: record?.notes || null,
            canEdit: assignedIds.has(member.id), // Only assigned members can be edited
          }
        })

        return membersWithAttendance
      }

      // Get active members in the user's camp (Leaders and Admins)
      const memberWhereConditions = [eq(members.status, 'Active')]

      if (currentUser.role !== 'Admin' && currentUser.campId) {
        memberWhereConditions.push(eq(members.campId, currentUser.campId))
      }

      const allMembers = await db.select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        role: members.role,
        campId: members.campId,
      })
        .from(members)
        .where(and(...memberWhereConditions))

      // Get attendance records for this event
      const attendanceRecords = await db.select()
        .from(attendance)
        .where(eq(attendance.eventId, context.data.eventId))

      // Map attendance status to members
      const membersWithAttendance = allMembers.map(member => {
        const record = attendanceRecords.find(a => a.memberId === member.id)
        return {
          ...member,
          attendanceId: record?.id || null,
          attendanceStatus: record?.status || null,
          notes: record?.notes || null,
          canEdit: true, // Admins and Leaders can edit all members in their scope
        }
      })

      return membersWithAttendance
    } catch (error) {
      console.error('Error fetching event attendance:', error)
      return []
    }
  })

// Mark attendance for a member at an event
export const markAttendance = createServerFn({ method: "POST" })
  .handler(async (context) => {
    if (!context.data) {
      return { success: false, message: "No data provided" }
    }

    const { eventId, memberId, status, notes } = context.data as {
      eventId: string
      memberId: string
      status: 'Present' | 'Absent' | 'Excused'
      notes?: string
    }

    try {
      const currentUser = await getCurrentUserFromContext(context)

      if (!currentUser) {
        return { success: false, message: "Unauthorized" }
      }

      // Verify user can mark attendance (has access to member)
      const memberToCheck = await db.select({
        id: members.id,
        campId: members.campId,
      })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1)

      if (!memberToCheck[0]) {
        return { success: false, message: "Member not found" }
      }

      // Check authorization based on role
      if (currentUser.role === 'Shepherd') {
        const assignment = await db.select()
          .from(memberAssignments)
          .where(and(
            eq(memberAssignments.memberId, memberId),
            eq(memberAssignments.shepherdId, currentUser.id)
          ))
          .limit(1)

        if (assignment.length === 0) {
          return { success: false, message: "Unauthorized - member not assigned to you" }
        }
      } else if (currentUser.role === 'Leader' && memberToCheck[0].campId !== currentUser.campId) {
        return { success: false, message: "Unauthorized - member not in your camp" }
      }

      // Check if record exists
      const existing = await db.select()
        .from(attendance)
        .where(and(
          eq(attendance.eventId, eventId),
          eq(attendance.memberId, memberId)
        ))
        .limit(1)

      if (existing.length > 0) {
        await db.update(attendance)
          .set({ status, notes: notes || null })
          .where(eq(attendance.id, existing[0].id))
      } else {
        await db.insert(attendance).values({
          eventId,
          memberId,
          status,
          notes: notes || null,
        })
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error marking attendance:', error)
      return { success: false, message: error.message }
    }
  })

// Bulk mark attendance for multiple members
export const bulkMarkAttendance = createServerFn({ method: "POST" })
  .handler(async (context) => {
    if (!context.data) {
      return { success: false, message: "No data provided" }
    }

    const { eventId, memberIds, status } = context.data as {
      eventId: string
      memberIds: string[]
      status: 'Present' | 'Absent' | 'Excused'
    }

    try {
      const currentUser = await getCurrentUserFromContext(context)

      if (!currentUser) {
        return { success: false, message: "Unauthorized" }
      }

      // Verify all members are in user's authorized scope
      const membersToCheck = await db.select({
        id: members.id,
        campId: members.campId,
      })
        .from(members)
        .where(inArray(members.id, memberIds))

      if (currentUser.role === 'Shepherd') {
        // Check if all members are assigned to this shepherd
        const assignedMembers = await db.select({ memberId: memberAssignments.memberId })
          .from(memberAssignments)
          .where(eq(memberAssignments.shepherdId, currentUser.id))

        const assignedMemberIds = assignedMembers.map(a => a.memberId)

        for (const memberId of memberIds) {
          if (!assignedMemberIds.includes(memberId)) {
            return { success: false, message: "Unauthorized to mark attendance for all selected members" }
          }
        }
      } else if (currentUser.role === 'Leader') {
        for (const member of membersToCheck) {
          if (member.campId !== currentUser.campId) {
            return { success: false, message: "Unauthorized to mark attendance for members outside your camp" }
          }
        }
      }

      for (const memberId of memberIds) {
        const existing = await db.select()
          .from(attendance)
          .where(and(
            eq(attendance.eventId, eventId),
            eq(attendance.memberId, memberId)
          ))
          .limit(1)

        if (existing.length > 0) {
          await db.update(attendance)
            .set({ status })
            .where(eq(attendance.id, existing[0].id))
        } else {
          await db.insert(attendance).values({
            eventId,
            memberId,
            status,
          })
        }
      }

      return { success: true, count: memberIds.length }
    } catch (error: any) {
      console.error('Error bulk marking attendance:', error)
      return { success: false, message: error.message }
    }
  })

// Delete an event
export const deleteEvent = createServerFn({ method: "POST" })
  .handler(async (context) => {
    if (!context.data) {
      return { success: false, message: "No data provided" }
    }

    const { eventId } = context.data as { eventId: string }

    try {
      const currentUser = await getCurrentUserFromContext(context)

      if (!currentUser) {
        return { success: false, message: "Unauthorized" }
      }

      // Verify user can delete this event
      const eventToDelete = await db.select({
        id: events.id,
        campId: events.campId,
      })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1)

      if (!eventToDelete[0]) {
        return { success: false, message: "Event not found" }
      }

      if (currentUser.role !== 'Admin' && eventToDelete[0].campId !== currentUser.campId) {
        return { success: false, message: "Unauthorized to delete this event" }
      }

      // Delete attendance records first
      await db.delete(attendance).where(eq(attendance.eventId, eventId))
      // Then delete the event
      await db.delete(events).where(eq(events.id, eventId))

      return { success: true }
    } catch (error: any) {
      console.error('Error deleting event:', error)
      return { success: false, message: error.message }
    }
  })
