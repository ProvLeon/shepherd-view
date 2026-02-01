import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { members, events, attendance } from '@/db/schema'
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm'
import { getMembersNeedingAttention } from '@/server/followups'
import { getCurrentUser } from './auth'

export const getDashboardStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const currentUser = await getCurrentUser()

      // Build base filter for non-Admin users
      const campFilter = currentUser && currentUser.role !== 'Admin' && currentUser.campId
        ? eq(members.campId, currentUser.campId)
        : undefined

      // Get total members count
      const totalConditions = [campFilter].filter(Boolean)
      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(members)
        .where(totalConditions.length > 0 ? and(...totalConditions) : undefined)
      const totalMembers = totalResult[0]?.count || 0

      // Get new converts count (this month)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const newConvertsConditions = [
        eq(members.role, 'New Convert'),
        gte(members.createdAt, startOfMonth),
        campFilter
      ].filter(Boolean)
      const newConvertsResult = await db.select({ count: sql<number>`count(*)` })
        .from(members)
        .where(and(...newConvertsConditions))
      const newConverts = newConvertsResult[0]?.count || 0

      // Get birthdays today
      const today = now.toISOString().slice(5, 10)
      const birthdaysConditions = [
        sql`to_char(${members.birthday}, 'MM-DD') = ${today}`,
        campFilter
      ].filter(Boolean)
      const birthdaysResult = await db.select({ count: sql<number>`count(*)` })
        .from(members)
        .where(and(...birthdaysConditions))
      const birthdaysToday = birthdaysResult[0]?.count || 0

      // Get active members count
      const activeConditions = [
        eq(members.status, 'Active'),
        campFilter
      ].filter(Boolean)
      const activeResult = await db.select({ count: sql<number>`count(*)` })
        .from(members)
        .where(and(...activeConditions))
      const activeMembers = activeResult[0]?.count || 0

      // Get recent events with attendance for chart
      const recentEventsConditions = [
        lte(events.date, now),
        currentUser && currentUser.role !== 'Admin' && currentUser.campId ? eq(events.campId, currentUser.campId) : undefined
      ].filter(Boolean)

      const recentEvents = await db.select({
        id: events.id,
        name: events.name,
        date: events.date,
        type: events.type,
      })
        .from(events)
        .where(recentEventsConditions.length > 0 ? and(...recentEventsConditions) : undefined)
        .orderBy(desc(events.date))
        .limit(6)

      // Get attendance counts for each event (filtered by member's camp)
      const attendanceData = await Promise.all(
        recentEvents.map(async (event) => {
          const attendanceConditions = [
            eq(attendance.eventId, event.id),
            campFilter
          ].filter(Boolean)

          const [counts] = await db.select({
            present: sql<number>`sum(case when ${attendance.status} = 'Present' then 1 else 0 end)`,
            absent: sql<number>`sum(case when ${attendance.status} = 'Absent' then 1 else 0 end)`,
          })
            .from(attendance)
            .innerJoin(members, eq(attendance.memberId, members.id))
            .where(and(...attendanceConditions))

          return {
            name: event.name.length > 15 ? event.name.slice(0, 12) + '...' : event.name,
            date: new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            present: Number(counts?.present || 0),
            absent: Number(counts?.absent || 0),
          }
        })
      )

      // Get upcoming events
      const upcomingEventsConditions = [
        gte(events.date, now),
        currentUser && currentUser.role !== 'Admin' && currentUser.campId ? eq(events.campId, currentUser.campId) : undefined
      ].filter(Boolean)

      const upcomingEvents = await db.select({
        id: events.id,
        name: events.name,
        date: events.date,
        type: events.type,
      })
        .from(events)
        .where(upcomingEventsConditions.length > 0 ? and(...upcomingEventsConditions) : undefined)
        .orderBy(events.date)
        .limit(5)

      // Get members with birthdays this week
      const endOfWeek = new Date(now)
      endOfWeek.setDate(now.getDate() + 7)
      const birthdaysWeekConditions = [
        eq(members.status, 'Active'),
        sql`to_char(${members.birthday}, 'MM-DD') >= ${now.toISOString().slice(5, 10)}`,
        sql`to_char(${members.birthday}, 'MM-DD') <= ${endOfWeek.toISOString().slice(5, 10)}`,
        campFilter
      ].filter(Boolean)

      const birthdaysThisWeek = await db.select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        birthday: members.birthday,
        phone: members.phone,
        role: members.role,
        campus: members.campus,
      })
        .from(members)
        .where(and(...birthdaysWeekConditions))
        .limit(5)

      // Get members needing attention (filtered by camp)
      const needsAttention = await getMembersNeedingAttention()

      return {
        totalMembers: Number(totalMembers),
        newConverts: Number(newConverts),
        birthdaysToday: Number(birthdaysToday),
        activeMembers: Number(activeMembers),
        attendanceData: attendanceData.reverse(),
        upcomingEvents: upcomingEvents.map(e => ({
          ...e,
          date: new Date(e.date).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }),
        })),
        birthdaysThisWeek,
        needsAttention,
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalMembers: 0,
        newConverts: 0,
        birthdaysToday: 0,
        activeMembers: 0,
        attendanceData: [],
        upcomingEvents: [],
        birthdaysThisWeek: [],
        needsAttention: [],
      }
    }
  })
