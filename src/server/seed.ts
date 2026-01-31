import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { camps, members, events, attendance, users, memberAssignments, followUps } from '@/db/schema'
import { v4 as uuidv4 } from 'uuid'
import { subWeeks } from 'date-fns'
import { createSupabaseServerClient } from './supabase'
import { ne, eq } from 'drizzle-orm'

export const seedDatabase = createServerFn({ method: "POST" }).handler(async () => {
    try {
        console.log('Starting seed...')

        // 1. Create Camps
        const campNames = ['CoHK', 'KNUST', 'Legon']
        const createdCamps = []
        for (const name of campNames) {
            const [camp] = await db.insert(camps).values({
                name,
                leaderId: null
            }).returning()
            createdCamps.push(camp)
        }

        // 2. Create Users (Shepherds)
        const shepherds = []
        for (let i = 0; i < 5; i++) {
            const [member] = await db.insert(members).values({
                firstName: `Shepherd${i}`,
                lastName: `Leader`,
                email: `shepherd${i}@example.com`,
                phone: `555-010${i}`,
                role: 'Shepherd',
                status: 'Active',
                campus: 'CoHK',
                campId: createdCamps[0].id
            }).returning()

            const [user] = await db.insert(users).values({
                id: uuidv4(),
                email: `shepherd${i}@test.com`,
                role: 'Shepherd',
                memberId: member.id,
                campId: createdCamps[0].id
            }).returning()
            shepherds.push(user)
        }

        // 3. Create Members (Regular)
        const regularMembers = []
        for (let i = 0; i < 50; i++) {
            const camp = createdCamps[Math.floor(Math.random() * createdCamps.length)]
            const [member] = await db.insert(members).values({
                firstName: `Member${i}`,
                lastName: `User`,
                email: `member${i}@example.com`,
                phone: `555-09${i}`,
                role: 'Member',
                status: 'Active',
                campus: 'CoHK',
                campId: camp.id,
                category: i % 2 === 0 ? 'Student' : 'Workforce'
            }).returning()
            regularMembers.push(member)
        }

        // 4. Assign Members to Shepherds
        for (const member of regularMembers) {
            const shepherd = shepherds[Math.floor(Math.random() * shepherds.length)]
            await db.insert(memberAssignments).values({
                memberId: member.id,
                shepherdId: shepherd.id
            })
        }

        // 5. Create Events (Past 12 weeks)
        const createdEvents = []
        const now = new Date()
        for (let i = 0; i < 12; i++) {
            const date = subWeeks(now, 12 - i)
            const [event] = await db.insert(events).values({
                name: `Sunday Service Week ${i + 1}`,
                date: date,
                type: 'Service'
            }).returning()
            createdEvents.push(event)
        }

        // 6. Create Attendance
        let totalAttendance = 0
        for (const event of createdEvents) {
            // Randomly select 70% of members to attend
            for (const member of regularMembers) {
                if (Math.random() > 0.3) {
                    await db.insert(attendance).values({
                        memberId: member.id,
                        eventId: event.id,
                        status: 'Present'
                    })
                    totalAttendance++
                }
            }
            // Also shepherds attend
            for (const sUser of shepherds) {
                if (sUser.memberId) {
                    await db.insert(attendance).values({
                        memberId: sUser.memberId,
                        eventId: event.id,
                        status: 'Present'
                    })
                }
            }
        }

        return { success: true, message: `Seeded: ${regularMembers.length} members, ${createdEvents.length} events, ${totalAttendance} attendance records.` }

    } catch (error: any) {
        console.error('Seed error:', error)
        return { success: false, error: error.message }
    }
})

export const clearDatabase = createServerFn({ method: "POST" }).handler(async () => {
    try {
        console.log('Clearing database...')

        // Get current user to preserve them
        const supabase = createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Delete in reverse order of dependencies
        await db.delete(attendance)
        await db.delete(memberAssignments)
        await db.delete(followUps)
        await db.delete(events)

        if (user) {
            // Decouple current user from member/camp before deleting those tables
            await db.update(users)
                .set({ memberId: null, campId: null })
                .where(eq(users.id, user.id))

            // Delete all other users
            await db.delete(users).where(ne(users.id, user.id))
        } else {
            await db.delete(users)
        }

        await db.delete(members)
        await db.delete(camps)

        return { success: true, message: 'Database cleared successfully (current user preserved)' }
    } catch (error: any) {
        console.error('Clear DB error:', error)
        return { success: false, error: error.message }
    }
})
