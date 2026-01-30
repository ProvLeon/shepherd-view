import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { events, attendance, members } from '../db/schema'
import { eq, desc, sql, and } from 'drizzle-orm'

// Get all events with attendance counts
export const getEvents = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const allEvents = await db.select({
        id: events.id,
        name: events.name,
        date: events.date,
        type: events.type,
        description: events.description,
        meetingUrl: events.meetingUrl,
        isRecurring: events.isRecurring,
        createdAt: events.createdAt,
      })
        .from(events)
        .orderBy(desc(events.date));

      // Get attendance counts for each event
      const eventsWithCounts = await Promise.all(
        allEvents.map(async (event) => {
          const counts = await db.select({
            status: attendance.status,
            count: sql<number>`count(*)`,
          })
            .from(attendance)
            .where(eq(attendance.eventId, event.id))
            .groupBy(attendance.status);

          const present = counts.find(c => c.status === 'Present')?.count || 0;
          const absent = counts.find(c => c.status === 'Absent')?.count || 0;
          const excused = counts.find(c => c.status === 'Excused')?.count || 0;

          return {
            ...event,
            presentCount: Number(present),
            absentCount: Number(absent),
            excusedCount: Number(excused),
            totalCount: Number(present) + Number(absent) + Number(excused),
          };
        })
      );

      return eventsWithCounts;
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  });

// Create a new event
export const createEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; date: string; type: 'Service' | 'Retreat' | 'Meeting' | 'Outreach'; description?: string; meetingUrl?: string }) => data)
  .handler(async ({ data }) => {
    const { name, date, type, description, meetingUrl } = data;

    try {
      const [newEvent] = await db.insert(events).values({
        name,
        date: new Date(date),
        type,
        description: description || null,
        meetingUrl: meetingUrl || null,
      }).returning();

      return { success: true, event: newEvent };
    } catch (error: any) {
      console.error('Error creating event:', error);
      return { success: false, message: error.message };
    }
  });

// Get attendance for a specific event
export const getEventAttendance = createServerFn({ method: "POST" })
  .inputValidator((data: { eventId: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Get all active members
      const allMembers = await db.select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        role: members.role,
      })
        .from(members)
        .where(eq(members.status, 'Active'));

      // Get attendance records for this event
      const attendanceRecords = await db.select()
        .from(attendance)
        .where(eq(attendance.eventId, data.eventId));

      // Map attendance status to members
      const membersWithAttendance = allMembers.map(member => {
        const record = attendanceRecords.find(a => a.memberId === member.id);
        return {
          ...member,
          attendanceId: record?.id || null,
          attendanceStatus: record?.status || null,
          notes: record?.notes || null,
        };
      });

      return membersWithAttendance;
    } catch (error) {
      console.error('Error fetching event attendance:', error);
      return [];
    }
  });

// Mark attendance for a member at an event
export const markAttendance = createServerFn({ method: "POST" })
  .inputValidator((data: { eventId: string; memberId: string; status: 'Present' | 'Absent' | 'Excused'; notes?: string }) => data)
  .handler(async ({ data }) => {
    const { eventId, memberId, status, notes } = data;

    try {
      // Check if record exists
      const existing = await db.select()
        .from(attendance)
        .where(and(
          eq(attendance.eventId, eventId),
          eq(attendance.memberId, memberId)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db.update(attendance)
          .set({ status, notes: notes || null })
          .where(eq(attendance.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(attendance).values({
          eventId,
          memberId,
          status,
          notes: notes || null,
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      return { success: false, message: error.message };
    }
  });

// Bulk mark attendance for multiple members
export const bulkMarkAttendance = createServerFn({ method: "POST" })
  .inputValidator((data: { eventId: string; memberIds: string[]; status: 'Present' | 'Absent' | 'Excused' }) => data)
  .handler(async ({ data }) => {
    const { eventId, memberIds, status } = data;

    try {
      for (const memberId of memberIds) {
        const existing = await db.select()
          .from(attendance)
          .where(and(
            eq(attendance.eventId, eventId),
            eq(attendance.memberId, memberId)
          ))
          .limit(1);

        if (existing.length > 0) {
          await db.update(attendance)
            .set({ status })
            .where(eq(attendance.id, existing[0].id));
        } else {
          await db.insert(attendance).values({
            eventId,
            memberId,
            status,
          });
        }
      }

      return { success: true, count: memberIds.length };
    } catch (error: any) {
      console.error('Error bulk marking attendance:', error);
      return { success: false, message: error.message };
    }
  });

// Delete an event
export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { eventId: string }) => data)
  .handler(async ({ data }) => {
    const { eventId } = data;

    try {
      // Delete attendance records first
      await db.delete(attendance).where(eq(attendance.eventId, eventId));
      // Then delete the event
      await db.delete(events).where(eq(events.id, eventId));

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting event:', error);
      return { success: false, message: error.message };
    }
  });
