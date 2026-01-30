import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { camps, members, events, attendance, users, memberAssignments, followUps } from '@/db/schema'
import { eq, sql, desc, and, count } from 'drizzle-orm'

// Get all camps with stats
export const getCamps = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const allCamps = await db.select({
                id: camps.id,
                name: camps.name,
                leaderId: camps.leaderId,
                createdAt: camps.createdAt,
            }).from(camps)

            // Get member counts for each camp
            const campStats = await Promise.all(
                allCamps.map(async (camp) => {
                    const [memberCount] = await db.select({
                        count: sql<number>`count(*)`,
                    })
                        .from(members)
                        .where(eq(members.campId, camp.id))

                    return {
                        ...camp,
                        memberCount: Number(memberCount?.count || 0),
                    }
                })
            )

            return campStats
        } catch (error) {
            console.error('Error fetching camps:', error)
            return []
        }
    })

// Get camp details with all stats
export const getCampDetails = createServerFn({ method: "GET" })
    .inputValidator((data: { campId: string }) => data)
    .handler(async ({ data }) => {
        try {
            const [camp] = await db.select()
                .from(camps)
                .where(eq(camps.id, data.campId))
                .limit(1)

            if (!camp) {
                return null
            }

            // Get camp members
            const campMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                phone: members.phone,
                role: members.role,
                status: members.status,
                category: members.category,
            })
                .from(members)
                .where(eq(members.campId, data.campId))

            // Get camp stats
            const stats = {
                totalMembers: campMembers.length,
                activeMembers: campMembers.filter(m => m.status === 'Active').length,
                leaders: campMembers.filter(m => m.role === 'Leader' || m.role === 'Shepherd').length,
                newConverts: campMembers.filter(m => m.role === 'New Convert').length,
            }

            // Get camp leader info
            let leader = null
            if (camp.leaderId) {
                const [leaderUser] = await db.select({
                    id: users.id,
                    email: users.email,
                    role: users.role,
                })
                    .from(users)
                    .where(eq(users.id, camp.leaderId))
                    .limit(1)
                leader = leaderUser
            }

            return {
                ...camp,
                leader,
                members: campMembers,
                stats,
            }
        } catch (error) {
            console.error('Error fetching camp details:', error)
            return null
        }
    })

// Create a new camp
export const createCamp = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { name, leaderId } = data as {
            name: string
            leaderId?: string
        }

        try {
            const [newCamp] = await db.insert(camps).values({
                name,
                leaderId: leaderId || null,
            }).returning()

            return { success: true, camp: newCamp }
        } catch (error: any) {
            console.error('Error creating camp:', error)
            return { success: false, message: error.message }
        }
    })

// Update camp
export const updateCamp = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { id, name, leaderId } = data as {
            id: string
            name?: string
            leaderId?: string
        }

        try {
            const updateData: Record<string, any> = {}
            if (name !== undefined) updateData.name = name
            if (leaderId !== undefined) updateData.leaderId = leaderId

            const [updated] = await db.update(camps)
                .set(updateData)
                .where(eq(camps.id, id))
                .returning()

            return { success: true, camp: updated }
        } catch (error: any) {
            console.error('Error updating camp:', error)
            return { success: false, message: error.message }
        }
    })

// Delete camp (only if no members)
export const deleteCamp = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { id } = data as { id: string }

        try {
            // Check if camp has members
            const [memberCount] = await db.select({
                count: sql<number>`count(*)`,
            })
                .from(members)
                .where(eq(members.campId, id))

            if (Number(memberCount?.count) > 0) {
                return { success: false, message: 'Cannot delete camp with members. Reassign members first.' }
            }

            await db.delete(camps).where(eq(camps.id, id))
            return { success: true }
        } catch (error: any) {
            console.error('Error deleting camp:', error)
            return { success: false, message: error.message }
        }
    })

// Assign member to shepherd
export const assignMemberToShepherd = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { memberId, shepherdId } = data as {
            memberId: string
            shepherdId: string
        }

        try {
            // Remove any existing assignment
            await db.delete(memberAssignments)
                .where(eq(memberAssignments.memberId, memberId))

            // Create new assignment
            const [assignment] = await db.insert(memberAssignments).values({
                memberId,
                shepherdId,
            }).returning()

            return { success: true, assignment }
        } catch (error: any) {
            console.error('Error assigning member:', error)
            return { success: false, message: error.message }
        }
    })

// Get members assigned to a shepherd
export const getShepherdMembers = createServerFn({ method: "GET" })
    .inputValidator((data: { shepherdId: string }) => data)
    .handler(async ({ data }) => {
        try {
            const assignments = await db.select({
                assignmentId: memberAssignments.id,
                assignedAt: memberAssignments.assignedAt,
                memberId: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                phone: members.phone,
                status: members.status,
            })
                .from(memberAssignments)
                .innerJoin(members, eq(memberAssignments.memberId, members.id))
                .where(eq(memberAssignments.shepherdId, data.shepherdId))

            return assignments
        } catch (error) {
            console.error('Error fetching shepherd members:', error)
            return []
        }
    })

// Get camp dashboard stats for a leader
export const getCampDashboard = createServerFn({ method: "GET" })
    .inputValidator((data: { campId: string }) => data)
    .handler(async ({ data }) => {
        try {
            // Get camp info
            const [camp] = await db.select()
                .from(camps)
                .where(eq(camps.id, data.campId))
                .limit(1)

            if (!camp) {
                return null
            }

            // Get member stats
            const memberStats = await db.select({
                total: sql<number>`count(*)`,
                active: sql<number>`sum(case when ${members.status} = 'Active' then 1 else 0 end)`,
                inactive: sql<number>`sum(case when ${members.status} = 'Inactive' then 1 else 0 end)`,
                newConverts: sql<number>`sum(case when ${members.role} = 'New Convert' then 1 else 0 end)`,
            })
                .from(members)
                .where(eq(members.campId, data.campId))

            // Get recent follow-ups for this camp
            const recentFollowUps = await db.select({
                id: followUps.id,
                type: followUps.type,
                outcome: followUps.outcome,
                createdAt: followUps.createdAt,
                memberFirstName: members.firstName,
                memberLastName: members.lastName,
            })
                .from(followUps)
                .innerJoin(members, eq(followUps.memberId, members.id))
                .where(eq(members.campId, data.campId))
                .orderBy(desc(followUps.createdAt))
                .limit(10)

            // Get shepherds in this camp
            const campShepherds = await db.select({
                id: users.id,
                email: users.email,
                role: users.role,
            })
                .from(users)
                .where(
                    and(
                        eq(users.campId, data.campId),
                        eq(users.role, 'Shepherd')
                    )
                )

            return {
                camp,
                stats: memberStats[0] || { total: 0, active: 0, inactive: 0, newConverts: 0 },
                recentFollowUps,
                shepherds: campShepherds,
            }
        } catch (error) {
            console.error('Error fetching camp dashboard:', error)
            return null
        }
    })
