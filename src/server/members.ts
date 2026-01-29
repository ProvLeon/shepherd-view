import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import { db } from '../db'
import { members, camps } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

export const getMembers = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const allMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                role: members.role,
                status: members.status,
                campus: members.campus,
                phone: members.phone,
                joinDate: members.joinDate,
                campName: camps.name,
            })
                .from(members)
                .leftJoin(camps, eq(members.campId, camps.id))
                .orderBy(desc(members.createdAt));

            return allMembers;
        } catch (error) {
            console.error('Error fetching members:', error);
            return [];
        }
    });

export const deleteMembers = createServerFn({ method: "POST" })
    .inputValidator((data: { ids: string[] }) => data)
    .handler(async ({ data }) => {
        try {
            if (!data.ids || data.ids.length === 0) return { success: false, message: "No IDs provided" };

            // First delete attendance linkage if any (cascade usually handles this, but good to be safe if no cascade)
            // But strict schema we rely on our SQL.
            // Drizzle:
            await db.delete(members).where(inArray(members.id, data.ids));

            return { success: true, message: `Deleted ${data.ids.length} members.` };
        } catch (error: any) {
            console.error('Error deleting members:', error);
            return { success: false, message: error.message };
        }
    });
