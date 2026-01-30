import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { followUps, members, users, roleEnum } from '@/db/schema'
import { desc, eq, sql, and, gte, lte, ilike, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'

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
