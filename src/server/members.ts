import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { members, camps } from '@/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

export const getMembers = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const allMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                role: members.role,
                status: members.status,
                campus: members.campus,
                category: members.category,
                phone: members.phone,
                joinDate: members.joinDate,
                birthday: members.birthday,
                campName: camps.name,
                residence: members.residence,
                guardian: members.guardian,
                region: members.region,
                guardianContact: members.guardianContact,
                guardianLocation: members.guardianLocation,
                profilePicture: members.profilePicture,
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

export const getMemberById = createServerFn({ method: "GET" })
    .inputValidator((data: { id: string }) => data)
    .handler(async ({ data }) => {
        try {
            const result = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                role: members.role,
                status: members.status,
                campus: members.campus,
                category: members.category,
                phone: members.phone,
                joinDate: members.joinDate,
                birthday: members.birthday,
                campName: camps.name,
                residence: members.residence,
                guardian: members.guardian,
                region: members.region,
                guardianContact: members.guardianContact,
                guardianLocation: members.guardianLocation,
            })
                .from(members)
                .leftJoin(camps, eq(members.campId, camps.id))
                .where(eq(members.id, data.id))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            console.error('Error fetching member by ID:', error);
            return null;
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

export const createMember = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { firstName, lastName, email, phone, role, campus, category, birthday, region, guardianContact, guardianLocation } = data as {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            role?: 'Leader' | 'Shepherd' | 'Member' | 'New Convert' | 'Guest';
            campus?: 'CoHK' | 'KNUST' | 'Legon' | 'Other';
            category?: 'Student' | 'Workforce' | 'NSS' | 'Alumni';
            birthday?: string;
            region?: string;
            guardianContact?: string;
            guardianLocation?: string;
        };

        try {
            const [newMember] = await db.insert(members).values({
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                role: role || 'Member',
                campus: campus || 'CoHK',
                category: category || 'Student',
                birthday: birthday || null,
                region: region || null,
                guardianContact: guardianContact || null,
                guardianLocation: guardianLocation || null,
            }).returning();

            return { success: true, member: newMember };
        } catch (error: any) {
            console.error('Error creating member:', error);
            return { success: false, message: error.message };
        }
    });

export const updateMember = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { id, firstName, lastName, email, phone, role, campus, category, birthday, status, residence, guardian, region, guardianContact, guardianLocation } = data as {
            id: string;
            firstName?: string;
            lastName?: string;
            email?: string;
            phone?: string;
            role?: 'Leader' | 'Shepherd' | 'Member' | 'New Convert' | 'Guest';
            campus?: 'CoHK' | 'KNUST' | 'Legon' | 'Other';
            category?: 'Student' | 'Workforce' | 'NSS' | 'Alumni';
            birthday?: string;
            status?: 'Active' | 'Inactive' | 'Archived';
            residence?: string;
            guardian?: string;
            region?: string;
            guardianContact?: string;
            guardianLocation?: string;
            profilePicture?: string | null;
        };

        try {
            const updateData: Record<string, any> = {};
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (email !== undefined) updateData.email = email || null;
            if (phone !== undefined) updateData.phone = phone || null;
            if (role !== undefined) updateData.role = role;
            if (campus !== undefined) updateData.campus = campus;
            if (category !== undefined) updateData.category = category;
            if (birthday !== undefined) updateData.birthday = birthday || null;
            if (status !== undefined) updateData.status = status;
            if (residence !== undefined) updateData.residence = residence || null;
            if (guardian !== undefined) updateData.guardian = guardian || null;
            if (region !== undefined) updateData.region = region || null;
            if (guardianContact !== undefined) updateData.guardianContact = guardianContact || null;
            if (guardianLocation !== undefined) updateData.guardianLocation = guardianLocation || null;
            if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture || null;

            const [updatedMember] = await db.update(members)
                .set(updateData)
                .where(eq(members.id, id))
                .returning();

            return { success: true, member: updatedMember };
        } catch (error: any) {
            console.error('Error updating member:', error);
            return { success: false, message: error.message };
        }
    });

export const getMembersByCampus = createServerFn({ method: "GET" })
    .inputValidator((data: { campus: string }) => data)
    .handler(async ({ data }) => {
        try {
            const campusMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                role: members.role,
                status: members.status,
                category: members.category,
                campus: members.campus,
                phone: members.phone,
                joinDate: members.joinDate,
                birthday: members.birthday,
                residence: members.residence,
                guardian: members.guardian,
                region: members.region,
                guardianContact: members.guardianContact,
                guardianLocation: members.guardianLocation,
                campName: camps.name,
            })
                .from(members)
                .leftJoin(camps, eq(members.campId, camps.id))
                .where(eq(members.campus, data.campus as any))
                .orderBy(desc(members.createdAt));

            return campusMembers;
        } catch (error) {
            console.error('Error fetching campus members:', error);
            return [];
        }
    });

export const getMembersByCategory = createServerFn({ method: "GET" })
    .inputValidator((data: { category: string }) => data)
    .handler(async ({ data }) => {
        try {
            const categoryMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                role: members.role,
                status: members.status,
                category: members.category,
                campus: members.campus,
                phone: members.phone,
                joinDate: members.joinDate,
                birthday: members.birthday,
                residence: members.residence,
                guardian: members.guardian,
                region: members.region,
                guardianContact: members.guardianContact,
                guardianLocation: members.guardianLocation,
                campName: camps.name,
            })
                .from(members)
                .leftJoin(camps, eq(members.campId, camps.id))
                .where(eq(members.category, data.category as any))
                .orderBy(desc(members.createdAt));

            return categoryMembers;
        } catch (error) {
            console.error('Error fetching category members:', error);
            return [];
        }
    });

export const getCampusStats = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            // Optimize to a single query using conditional aggregation (CASE statements)
            // This prevents connection timeouts from opening too many parallel connections
            const stats = await db.select({
                cohk: sql<number>`sum(case when ${members.campus} = 'CoHK' then 1 else 0 end)`,
                knust: sql<number>`sum(case when ${members.campus} = 'KNUST' then 1 else 0 end)`,
                legon: sql<number>`sum(case when ${members.campus} = 'Legon' then 1 else 0 end)`,
                workforce: sql<number>`sum(case when ${members.category} = 'Workforce' then 1 else 0 end)`,
                nss: sql<number>`sum(case when ${members.category} = 'NSS' then 1 else 0 end)`,
                alumni: sql<number>`sum(case when ${members.category} = 'Alumni' then 1 else 0 end)`,
            }).from(members);

            const result = stats[0];

            return {
                CoHK: Number(result?.cohk || 0),
                KNUST: Number(result?.knust || 0),
                Legon: Number(result?.legon || 0),
                Workforce: Number(result?.workforce || 0),
                NSS: Number(result?.nss || 0),
                Alumni: Number(result?.alumni || 0),
            };
        } catch (error) {
            console.error('Error fetching campus stats:', error);
            // Return zeros on error to prevent UI crash
            return { CoHK: 0, KNUST: 0, Legon: 0, Workforce: 0, NSS: 0, Alumni: 0 };
        }
    });
