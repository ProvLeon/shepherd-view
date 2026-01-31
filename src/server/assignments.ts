import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users, members, memberAssignments, leaderCampuses, camps } from '@/db/schema'
import { eq, inArray, and } from 'drizzle-orm'
import { z } from 'zod'

// --- Shepherd <-> Member Assignments ---

export const getShepherdMembers = createServerFn({ method: "GET" })
    .inputValidator((data: { shepherdId: string }) => data)
    .handler(async ({ data }) => {
        try {
            const assignedMembers = await db.select({
                member: members,
                assignedAt: memberAssignments.assignedAt
            })
                .from(memberAssignments)
                .innerJoin(members, eq(memberAssignments.memberId, members.id))
                .where(eq(memberAssignments.shepherdId, data.shepherdId))

            return assignedMembers.map(r => ({ ...r.member, assignedAt: r.assignedAt }))
        } catch (error) {
            console.error('Error fetching shepherd members:', error)
            return []
        }
    })

export const assignMembersToShepherd = createServerFn({ method: "POST" })
    .inputValidator((data: { shepherdId: string, memberIds: string[] }) => data)
    .handler(async ({ data }) => {
        try {
            if (data.memberIds.length === 0) return { success: true, message: "No members to assign" }

            // Insert ignoring duplicates (if using ON CONFLICT, but here simple insert)
            // Ideally we check if already assigned to THIS shepherd.
            // Or we wipe and re-assign? Usually additive is safer.
            // Let's check existing to avoid duplicates.

            const existing = await db.select()
                .from(memberAssignments)
                .where(and(
                    eq(memberAssignments.shepherdId, data.shepherdId),
                    inArray(memberAssignments.memberId, data.memberIds)
                ))

            const existingIds = new Set(existing.map(e => e.memberId))
            const newIds = data.memberIds.filter(id => !existingIds.has(id))

            if (newIds.length > 0) {
                await db.insert(memberAssignments).values(
                    newIds.map(memberId => ({
                        shepherdId: data.shepherdId,
                        memberId
                    }))
                )
            }

            return { success: true, message: `Assigned ${newIds.length} new members.` }
        } catch (error) {
            console.error('Error assigning members:', error)
            return { success: false, message: 'Failed to assign members' }
        }
    })

export const removeMemberFromShepherd = createServerFn({ method: "POST" })
    .inputValidator((data: { shepherdId: string, memberId: string }) => data)
    .handler(async ({ data }) => {
        try {
            await db.delete(memberAssignments)
                .where(and(
                    eq(memberAssignments.shepherdId, data.shepherdId),
                    eq(memberAssignments.memberId, data.memberId)
                ))
            return { success: true }
        } catch (error) {
            return { success: false, message: 'Failed to remove assignment' }
        }
    })

// --- Leader <-> Campus Assignments ---

export const getLeaderCampuses = createServerFn({ method: "GET" })
    .inputValidator((data: { leaderId: string }) => data)
    .handler(async ({ data }) => {
        try {
            const results = await db.select()
                .from(leaderCampuses)
                .where(eq(leaderCampuses.leaderId, data.leaderId))

            return results.map(r => r.campus)
        } catch (error) {
            console.error('Error fetching leader campuses:', error)
            return []
        }
    })

export const updateLeaderCampuses = createServerFn({ method: "POST" })
    .inputValidator((data: { leaderId: string, campuses: string[] }) => data)
    .handler(async ({ data }) => {
        try {
            // Full replace strategy for simpler UI "multi-select" state
            await db.delete(leaderCampuses).where(eq(leaderCampuses.leaderId, data.leaderId))

            if (data.campuses.length > 0) {
                await db.insert(leaderCampuses).values(
                    data.campuses.map(campus => ({
                        leaderId: data.leaderId,
                        campus: campus as any
                    }))
                )
            }
            return { success: true, message: "Campuses updated" }
        } catch (error) {
            console.error('Error updating leader campuses:', error)
            return { success: false, message: "Failed to update campuses" }
        }
    })

// Helper: Get Unassigned Members (optional, or just get all members to pick from)
export const getAvailableMembers = createServerFn({ method: "GET" })
    .handler(async () => {
        // Return all members + their assignment status if needed.
        // For now, simple list.
        return await db.select({
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            campName: camps.name,
            role: members.role
        }).from(members).leftJoin(camps, eq(members.campId, camps.id))
    })

export const getShepherds = createServerFn({ method: "GET" })
    .handler(async () => {
        return await db.select({
            id: users.id,
            email: users.email,
        })
            .from(users)
            .where(eq(users.role, 'Shepherd'))
    })

export const getLeaders = createServerFn({ method: "GET" })
    .handler(async () => {
        return await db.select({
            id: users.id,
            email: users.email,
        })
            .from(users)
            .where(inArray(users.role, ['Leader', 'Admin']))
    })
