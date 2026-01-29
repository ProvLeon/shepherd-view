import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { members } from '../db/schema'
import { eq, sql, and, gte, lte } from 'drizzle-orm'

export const getDashboardStats = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            // Get total members count
            const totalResult = await db.select({ count: sql<number>`count(*)` }).from(members);
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

            return {
                totalMembers: Number(totalMembers),
                newConverts: Number(newConverts),
                birthdaysToday: Number(birthdaysToday),
                activeMembers: Number(activeMembers),
                // Attendance percentage placeholder until events/attendance is implemented
                attendancePercentage: null,
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return {
                totalMembers: 0,
                newConverts: 0,
                birthdaysToday: 0,
                activeMembers: 0,
                attendancePercentage: null,
            };
        }
    });
