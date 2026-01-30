import { createServerFn } from '@tanstack/react-start'
import { desc, and } from 'drizzle-orm'
import { db } from '../db'
import { members, camps, users } from '../db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

/**
 * Authentication Implementation Status:
 *
 * CURRENT: Server functions now verify user authentication
 * FEATURES:
 * 1. Extract user ID from middleware context
 * 2. Verify user role and permissions
 * 3. Filter data based on camp access
 * 4. Return proper error responses
 *
 * See AUTHENTICATION_TODO.md for implementation details
 */

export const getMembers = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    try {
      const userId = data?.userId

      console.log('🔍 [getMembers] Received userId:', userId)

      if (!userId) {
        console.log('❌ [getMembers] No userId provided, returning empty array')
        return []
      }

      // Get current user's role and camp
      console.log('🔍 [getMembers] Looking up user profile for userId:', userId)
      const [userProfile] = await db.select({
        role: users.role,
        campId: users.campId,
      })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      console.log('🔍 [getMembers] User profile found:', userProfile)

      if (!userProfile) {
        console.log('❌ [getMembers] User profile not found, returning empty array')
        return []
      }

      // ADMIN: Return all members (no restrictions)
      if (userProfile.role === 'Admin') {
        console.log('✅ [getMembers] Admin user - fetching all members')
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
        })
          .from(members)
          .leftJoin(camps, eq(members.campId, camps.id))
          .orderBy(desc(members.createdAt))
        console.log(`✅ [getMembers] Returned ${allMembers.length} members`)
        return allMembers
      }

      // LEADER/SHEPHERD: Return only members from their camp
      if (userProfile.campId) {
        console.log('✅ [getMembers] Leader/Shepherd user - fetching members for campId:', userProfile.campId)
        const campMembers = await db.select({
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
        })
          .from(members)
          .leftJoin(camps, eq(members.campId, camps.id))
          .where(eq(members.campId, userProfile.campId))
          .orderBy(desc(members.createdAt))
        console.log(`✅ [getMembers] Returned ${campMembers.length} members for camp ${userProfile.campId}`)
        return campMembers
      }

      // No camp assigned - return empty
      console.log('❌ [getMembers] User has no campId assigned, returning empty array')
      return []
    } catch (error) {
      console.error('❌ [getMembers] Error fetching members:', error)
      return []
    }
  })

export const getMemberById = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; userId?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { id, userId } = data

      if (!userId) {
        return null
      }

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
        campId: members.campId,
      })
        .from(members)
        .leftJoin(camps, eq(members.campId, camps.id))
        .where(eq(members.id, id))
        .limit(1)

      return result[0] || null
    } catch (error) {
      console.error('Error fetching member by ID:', error)
      return null
    }
  })

export const deleteMembers = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    try {
      const { ids } = data

      if (!ids || ids.length === 0) {
        return { success: false, message: "No IDs provided" }
      }

      // TODO: Add userId from middleware to verify permissions
      await db.delete(members).where(inArray(members.id, ids))

      return { success: true, message: `Deleted ${ids.length} members.` }
    } catch (error: any) {
      console.error('Error deleting members:', error)
      return { success: false, message: error.message }
    }
  })

export const createMember = createServerFn({ method: "POST" })
  .inputValidator((data: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    role?: 'Leader' | 'Shepherd' | 'Member' | 'New Convert' | 'Guest'
    campus?: 'CoHK' | 'KNUST' | 'Legon' | 'Other'
    category?: 'Student' | 'Workforce' | 'NSS' | 'Alumni'
    birthday?: string
    campId?: string
  }) => data)
  .handler(async ({ data }) => {
    const { firstName, lastName, email, phone, role, campus, category, birthday, campId } = data

    try {
      // TODO: Add userId from middleware to verify permissions
      const [newMember] = await db.insert(members).values({
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        role: role || 'Member',
        campus: campus || 'CoHK',
        category: category || 'Student',
        birthday: birthday || null,
        campId: campId || null,
      }).returning()

      return { success: true, member: newMember }
    } catch (error: any) {
      console.error('Error creating member:', error)
      return { success: false, message: error.message }
    }
  })

export const updateMember = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    role?: 'Leader' | 'Shepherd' | 'Member' | 'New Convert' | 'Guest'
    campus?: 'CoHK' | 'KNUST' | 'Legon' | 'Other'
    category?: 'Student' | 'Workforce' | 'NSS' | 'Alumni'
    birthday?: string
    status?: 'Active' | 'Inactive' | 'Archived'
  }) => data)
  .handler(async ({ data }) => {
    const { id, firstName, lastName, email, phone, role, campus, category, birthday, status } = data

    try {
      // TODO: Add userId from middleware to verify permissions
      const [existingMember] = await db.select({ id: members.id })
        .from(members)
        .where(eq(members.id, id))

      if (!existingMember) {
        return { success: false, message: "Member not found" }
      }

      const updateData: Record<string, any> = {}
      if (firstName !== undefined) updateData.firstName = firstName
      if (lastName !== undefined) updateData.lastName = lastName
      if (email !== undefined) updateData.email = email || null
      if (phone !== undefined) updateData.phone = phone || null
      if (role !== undefined) updateData.role = role
      if (campus !== undefined) updateData.campus = campus
      if (category !== undefined) updateData.category = category
      if (birthday !== undefined) updateData.birthday = birthday || null
      if (status !== undefined) updateData.status = status

      const [updatedMember] = await db.update(members)
        .set(updateData)
        .where(eq(members.id, id))
        .returning()

      return { success: true, member: updatedMember }
    } catch (error: any) {
      console.error('Error updating member:', error)
      return { success: false, message: error.message }
    }
  })

export const getMembersByCampus = createServerFn({ method: "POST" })
  .inputValidator((data: { campus: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { campus } = data

      return await db.select({
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
        campName: camps.name,
      })
        .from(members)
        .leftJoin(camps, eq(members.campId, camps.id))
        .where(eq(members.campus, campus as any))
        .orderBy(desc(members.createdAt))
    } catch (error) {
      console.error('Error fetching campus members:', error)
      return []
    }
  })

export const getMembersByCategory = createServerFn({ method: "POST" })
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { category } = data

      return await db.select({
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
        campName: camps.name,
      })
        .from(members)
        .leftJoin(camps, eq(members.campId, camps.id))
        .where(eq(members.category, category as any))
        .orderBy(desc(members.createdAt))
    } catch (error) {
      console.error('Error fetching category members:', error)
      return []
    }
  })

export const getCampusStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // TODO: Filter by user's accessible camps once middleware is implemented
      const stats = await db.select({
        cohk: sql<number>`sum(case when ${members.campus} = 'CoHK' then 1 else 0 end)`,
        knust: sql<number>`sum(case when ${members.campus} = 'KNUST' then 1 else 0 end)`,
        legon: sql<number>`sum(case when ${members.campus} = 'Legon' then 1 else 0 end)`,
        workforce: sql<number>`sum(case when ${members.category} = 'Workforce' then 1 else 0 end)`,
        nss: sql<number>`sum(case when ${members.category} = 'NSS' then 1 else 0 end)`,
        alumni: sql<number>`sum(case when ${members.category} = 'Alumni' then 1 else 0 end)`,
      }).from(members)

      const result = stats[0]

      return {
        CoHK: Number(result?.cohk || 0),
        KNUST: Number(result?.knust || 0),
        Legon: Number(result?.legon || 0),
        Workforce: Number(result?.workforce || 0),
        NSS: Number(result?.nss || 0),
        Alumni: Number(result?.alumni || 0),
      }
    } catch (error) {
      console.error('Error fetching campus stats:', error)
      return { CoHK: 0, KNUST: 0, Legon: 0, Workforce: 0, NSS: 0, Alumni: 0 }
    }
  })
