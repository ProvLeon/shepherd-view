import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { members, events, attendance, memberAssignments, users } from '@/db/schema'
import { sql } from 'drizzle-orm'

const checkCounts = createServerFn({ method: "GET" }).handler(async () => {
    try {
        const memberCount = await db.select({ count: sql<number>`count(*)` }).from(members);
        const eventCount = await db.select({ count: sql<number>`count(*)` }).from(events);
        const attendanceCount = await db.select({ count: sql<number>`count(*)` }).from(attendance);
        const assignmentCount = await db.select({ count: sql<number>`count(*)` }).from(memberAssignments);
        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);

        return {
            members: memberCount[0].count,
            events: eventCount[0].count,
            attendance: attendanceCount[0].count,
            assignments: assignmentCount[0].count,
            users: userCount[0].count
        }
    } catch (error: any) {
        return { error: error.message }
    }
})

export const Route = createFileRoute('/debug-db')({
    component: DebugDb,
    loader: () => checkCounts(),
})

function DebugDb() {
    const data = Route.useLoaderData()
    return <pre>{JSON.stringify(data, null, 2)}</pre>
}
