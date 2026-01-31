
import { db } from '../db';
import { members, events, attendance, memberAssignments, users } from '../db/schema';
import { sql } from 'drizzle-orm';

async function checkCounts() {
    try {
        console.log('Checking database counts...');

        const memberCount = await db.select({ count: sql<number>`count(*)` }).from(members);
        console.log(`Members: ${memberCount[0].count}`);

        const eventCount = await db.select({ count: sql<number>`count(*)` }).from(events);
        console.log(`Events: ${eventCount[0].count}`);

        const attendanceCount = await db.select({ count: sql<number>`count(*)` }).from(attendance);
        console.log(`Attendance Records: ${attendanceCount[0].count}`);

        const assignmentCount = await db.select({ count: sql<number>`count(*)` }).from(memberAssignments);
        console.log(`Member Assignments: ${assignmentCount[0].count}`);

        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
        console.log(`Users (Shepherds): ${userCount[0].count}`);

        if (Number(attendanceCount[0].count) > 0) {
            const sample = await db.select().from(attendance).limit(5);
            console.log('Sample Attendance:', JSON.stringify(sample, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error checking DB:', error);
        process.exit(1);
    }
}

checkCounts();
