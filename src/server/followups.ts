import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { followUps, members, users } from '../db/schema'
import { eq, desc, and, isNull, lte } from 'drizzle-orm'

// Get all follow-ups for a member
export const getMemberFollowUps = createServerFn({ method: "POST" })
  .inputValidator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const memberFollowUps = await db.select({
        id: followUps.id,
        type: followUps.type,
        notes: followUps.notes,
        outcome: followUps.outcome,
        scheduledAt: followUps.scheduledAt,
        completedAt: followUps.completedAt,
        createdAt: followUps.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
        .from(followUps)
        .leftJoin(users, eq(followUps.userId, users.id))
        .where(eq(followUps.memberId, data.memberId))
        .orderBy(desc(followUps.createdAt))

      return memberFollowUps
    } catch (error) {
      console.error('Error fetching member follow-ups:', error)
      return []
    }
  })

// Create a new follow-up
export const createFollowUp = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
    const { memberId, userId, type, notes, outcome, scheduledAt } = data as {
      memberId: string
      userId: string
      type: 'Call' | 'WhatsApp' | 'Prayer' | 'Visit' | 'Other'
      notes?: string
      outcome?: 'Reached' | 'NoAnswer' | 'ScheduledCallback'
      scheduledAt?: string
    }

    try {
      const [newFollowUp] = await db.insert(followUps).values({
        memberId,
        userId,
        type,
        notes: notes || null,
        outcome: outcome || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: outcome ? new Date() : null,
      }).returning()

      return { success: true, followUp: newFollowUp }
    } catch (error: any) {
      console.error('Error creating follow-up:', error)
      return { success: false, message: error.message }
    }
  })

// Mark a follow-up as completed
export const completeFollowUp = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
    const { id, outcome, notes } = data as {
      id: string
      outcome: 'Reached' | 'NoAnswer' | 'ScheduledCallback'
      notes?: string
    }

    try {
      const [updated] = await db.update(followUps)
        .set({
          outcome,
          notes: notes || null,
          completedAt: new Date(),
        })
        .where(eq(followUps.id, id))
        .returning()

      return { success: true, followUp: updated }
    } catch (error: any) {
      console.error('Error completing follow-up:', error)
      return { success: false, message: error.message }
    }
  })

// Get pending/scheduled follow-ups for a user
export const getPendingFollowUps = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const pending = await db.select({
        id: followUps.id,
        type: followUps.type,
        notes: followUps.notes,
        scheduledAt: followUps.scheduledAt,
        createdAt: followUps.createdAt,
        memberId: members.id,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
      })
        .from(followUps)
        .innerJoin(members, eq(followUps.memberId, members.id))
        .where(
          and(
            eq(followUps.userId, data.userId),
            isNull(followUps.completedAt)
          )
        )
        .orderBy(followUps.scheduledAt)

      return pending
    } catch (error) {
      console.error('Error fetching pending follow-ups:', error)
      return []
    }
  })

// Get overdue follow-ups (scheduled in the past but not completed)
export const getOverdueFollowUps = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const now = new Date()
      const overdue = await db.select({
        id: followUps.id,
        type: followUps.type,
        notes: followUps.notes,
        scheduledAt: followUps.scheduledAt,
        memberId: members.id,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
      })
        .from(followUps)
        .innerJoin(members, eq(followUps.memberId, members.id))
        .where(
          and(
            eq(followUps.userId, data.userId),
            isNull(followUps.completedAt),
            lte(followUps.scheduledAt, now)
          )
        )
        .orderBy(followUps.scheduledAt)

      return overdue
    } catch (error) {
      console.error('Error fetching overdue follow-ups:', error)
      return []
    }
  })

// Delete a follow-up
export const deleteFollowUp = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
    const { id } = data as { id: string }

    try {
      await db.delete(followUps).where(eq(followUps.id, id))
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting follow-up:', error)
      return { success: false, message: error.message }
    }
  })
