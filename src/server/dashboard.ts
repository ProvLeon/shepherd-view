import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { members, events, attendance, users } from '../db/schema'
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm'

export const getDashboardStats = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId

    // If no userId, return empty stats (unauthenticated)
    if (!userId) {
      return {
        totalMembers: 0,
        newConverts: 0,
        birthdaysToday: 0,
        activeMembers: 0,
        attendanceData: [],
        upcomingEvents: [],
        birthdaysThisWeek: [],
      }
    }

    // Get current user's role and camp
    const [userProfile] = await db.select({
      role: users.role,
      campId: users.campId,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!userProfile) {
      return {
        totalMembers: 0,
        newConverts: 0,
        birthdaysToday: 0,
        activeMembers: 0,
        attendanceData: [],
        upcomingEvents: [],
        birthdaysThisWeek: [],
      }
    }
    try {
      // Build where clause based on user role
      const memberFilter = userProfile.role === 'Admin' ? undefined : eq(members.campId, userProfile.campId!)

      // Get total members count
      const totalQuery = db.select({ count: sql<number>`count(*)` }).from(members)
      const totalResult = memberFilter ? await totalQuery.where(memberFilter) : await totalQuery
      const totalMembers = totalResult[0]?.count || 0;

      // Get new converts count (this month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newConvertsResult = await db.select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          and(
            eq(members.role, 'New Convert'),
            gte(members.createdAt, startOfMonth)
          )
        );
      const newConverts = newConvertsResult[0]?.count || 0;

      // Get birthdays today
      const today = now.toISOString().slice(5, 10); // Get MM-DD format
      const birthdaysResult = await db.select({ count: sql<number>`count(*)` })
        .from(members)
        .where(
          sql`to_char(${members.birthday}, 'MM-DD') = ${today}`
        );
      const birthdaysToday = birthdaysResult[0]?.count || 0;

      // Get active members count
      const activeResult = await db.select({ count: sql<number>`count(*)` })
        .from(members)
        .where(eq(members.status, 'Active'));
      const activeMembers = activeResult[0]?.count || 0;

      // Get recent events with attendance for chart
      const recentEvents = await db.select({
        id: events.id,
        name: events.name,
        date: events.date,
        type: events.type,
      })
        .from(events)
        .where(lte(events.date, now))
        .orderBy(desc(events.date))
        .limit(6);

      // Get attendance counts for each event
      const attendanceData = await Promise.all(
        recentEvents.map(async (event) => {
          const [counts] = await db.select({
            present: sql<number>`sum(case when ${attendance.status} = 'Present' then 1 else 0 end)`,
            absent: sql<number>`sum(case when ${attendance.status} = 'Absent' then 1 else 0 end)`,
          })
            .from(attendance)
            .where(eq(attendance.eventId, event.id));

          return {
            name: event.name.length > 15 ? event.name.slice(0, 12) + '...' : event.name,
            date: new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            present: Number(counts?.present || 0),
            absent: Number(counts?.absent || 0),
          };
        })
      );

      // Get upcoming events
      const upcomingEvents = await db.select({
        id: events.id,
        name: events.name,
        date: events.date,
        type: events.type,
      })
        .from(events)
        .where(gte(events.date, now))
        .orderBy(events.date)
        .limit(5);

      // Get members with birthdays this week
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + 7);
      const birthdaysThisWeek = await db.select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        birthday: members.birthday,
        phone: members.phone,
      })
        .from(members)
        .where(
          and(
            eq(members.status, 'Active'),
            sql`to_char(${members.birthday}, 'MM-DD') >= ${now.toISOString().slice(5, 10)}`,
            sql`to_char(${members.birthday}, 'MM-DD') <= ${endOfWeek.toISOString().slice(5, 10)}`
          )
        )
        .limit(5);

      return {
        totalMembers: Number(totalMembers),
        newConverts: Number(newConverts),
        birthdaysToday: Number(birthdaysToday),
        activeMembers: Number(activeMembers),
        attendanceData: attendanceData.reverse(), // Oldest first for chart
        upcomingEvents: upcomingEvents.map(e => ({
          ...e,
          date: new Date(e.date).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }),
        })),
        birthdaysThisWeek,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalMembers: 0,
        newConverts: 0,
        birthdaysToday: 0,
        activeMembers: 0,
        attendanceData: [],
        upcomingEvents: [],
        birthdaysThisWeek: [],
      };
    }
  });
