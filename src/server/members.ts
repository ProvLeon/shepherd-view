import { createServerFn } from '@tanstack/react-start'
import { desc, and, eq, inArray, sql, or } from 'drizzle-orm'
import { db } from '@/db'
import { members, camps, users, memberAssignments } from '@/db/schema'
import { v4 as uuidv4 } from 'uuid'
import { getCurrentUser } from './auth'

// Get members with RBAC scoping and canEdit flag
export const getMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const currentUser = await getCurrentUser()

      // For Shepherds, get only assigned members
      if (currentUser && currentUser.role === 'Shepherd') {
        const assignedMemberIds = await db.select({ memberId: memberAssignments.memberId })
          .from(memberAssignments)
          .where(eq(memberAssignments.shepherdId, currentUser.id))

        if (assignedMemberIds.length === 0) {
          return []
        }

        const memberIdsList = assignedMemberIds.map(a => a.memberId)

        const membersList = await db.select({
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
          campId: members.campId,
        })
          .from(members)
          .leftJoin(camps, eq(members.campId, camps.id))
          .where(inArray(members.id, memberIdsList))
          .orderBy(desc(members.createdAt))

        // Shepherds can edit their assigned members
        return membersList.map(member => ({
          ...member,
          canEdit: true,
        }))
      }

      // For Admin and Leaders, apply camp filtering
      let whereCondition = undefined as any

      if (currentUser && currentUser.role !== 'Admin' && currentUser.campId) {
        whereCondition = eq(members.campId, currentUser.campId)
      }

      const baseQuery = db.select({
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
        campId: members.campId,
      })
        .from(members)
        .leftJoin(camps, eq(members.campId, camps.id))

      const membersList = await (whereCondition
        ? baseQuery.where(whereCondition).orderBy(desc(members.createdAt))
        : baseQuery.orderBy(desc(members.createdAt))
      )

      // Add canEdit flag for Admin and Leaders
      const membersWithCanEdit = membersList.map((member) => {
        let canEdit = false

        if (currentUser) {
          if (currentUser.role === 'Admin') {
            canEdit = true
          } else if (currentUser.role === 'Leader') {
            // Leaders can edit members in their camp
            canEdit = member.campId === currentUser.campId
          }
        }

        return {
          ...member,
          canEdit,
        }
      })

      return membersWithCanEdit
    } catch (error) {
      console.error('Error fetching members:', error)
      return []
    }
  })

export const getMemberById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    try {
      const currentUser = await getCurrentUser()

      // For Shepherds, enforce assignment requirement
      if (currentUser && currentUser.role === 'Shepherd') {
        const assignment = await db.select()
          .from(memberAssignments)
          .where(
            and(
              eq(memberAssignments.memberId, data.id),
              eq(memberAssignments.shepherdId, currentUser.id)
            )
          )
          .limit(1)

        if (assignment.length === 0) {
          // Shepherd is not assigned to this member
          return null
        }
      }

      // Build where conditions
      const conditions = [eq(members.id, data.id)]

      // Apply camp filtering for Leaders
      if (currentUser && currentUser.role === 'Leader' && currentUser.campId) {
        conditions.push(eq(members.campId, currentUser.campId))
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
        residence: members.residence,
        guardian: members.guardian,
        region: members.region,
        guardianContact: members.guardianContact,
        guardianLocation: members.guardianLocation,
        profilePicture: members.profilePicture,
        campId: members.campId,
      })
        .from(members)
        .leftJoin(camps, eq(members.campId, camps.id))
        .where(and(...conditions))
        .limit(1)

      if (!result[0]) {
        return null
      }

      // Compute canEdit flag
      let canEdit = false
      const member = result[0]

      if (currentUser) {
        if (currentUser.role === 'Admin') {
          canEdit = true
        } else if (currentUser.role === 'Leader') {
          canEdit = member.campId === currentUser.campId
        } else if (currentUser.role === 'Shepherd') {
          // Already verified assignment above
          canEdit = true
        }
      }

      return {
        ...member,
        canEdit,
      }
    } catch (error) {
      console.error('Error fetching member by ID:', error)
      return null
    }
  })

export const deleteMembers = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        return { success: false, message: "Unauthorized" }
      }

      if (!data.ids || data.ids.length === 0) {
        return { success: false, message: "No IDs provided" }
      }

      // Verify authorization for each member
      const membersToDelete = await db.select({
        id: members.id,
        campId: members.campId,
      })
        .from(members)
        .where(inArray(members.id, data.ids))

      for (const member of membersToDelete) {
        let isAuthorized = false

        if (currentUser.role === 'Admin') {
          isAuthorized = true
        } else if (currentUser.role === 'Leader') {
          isAuthorized = member.campId === currentUser.campId
        } else if (currentUser.role === 'Shepherd') {
          const assignment = await db.select()
            .from(memberAssignments)
            .where(
              and(
                eq(memberAssignments.memberId, member.id),
                eq(memberAssignments.shepherdId, currentUser.id)
              )
            )
            .limit(1)
          isAuthorized = assignment.length > 0
        }

        if (!isAuthorized) {
          return { success: false, message: `Unauthorized to delete member ${member.id}` }
        }
      }

      // Delete the members
      await db.delete(members).where(inArray(members.id, data.ids))

      return { success: true, message: `Deleted ${data.ids.length} members.` }
    } catch (error: any) {
      console.error('Error deleting members:', error)
      return { success: false, message: error.message }
    }
  })

export const createMember = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
    const { firstName, lastName, email, phone, role, campus, category, birthday, region, guardianContact, guardianLocation } = data as {
      firstName: string
      lastName: string
      email?: string
      phone?: string
      role?: 'Leader' | 'Shepherd' | 'Member' | 'New Convert' | 'Guest'
      campus?: 'CoHK' | 'KNUST' | 'Legon' | 'Other'
      category?: 'Student' | 'Workforce' | 'NSS' | 'Alumni'
      birthday?: string
      region?: string
      guardianContact?: string
      guardianLocation?: string
    }

    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        return { success: false, message: "Unauthorized" }
      }

      // Get user's campId
      let campIdToUse = currentUser.campId || undefined

      // Admins can specify any camp, Leaders/Shepherds are restricted to their camp
      if (currentUser.role !== 'Admin' && currentUser.campId) {
        campIdToUse = currentUser.campId
      }

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
        campId: campIdToUse || null,
      }).returning()

      // Auto-sync to Users if role is Leader or Shepherd
      if (role && (role === 'Leader' || role === 'Shepherd')) {
        const memberEmail = newMember.email
        if (memberEmail) {
          try {
            const supabaseUrl = process.env.VITE_SUPABASE_URL
            const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

            let authId: string | undefined

            if (supabaseUrl && serviceRoleKey) {
              const { createClient } = await import('@supabase/supabase-js')
              const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

              const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: memberEmail,
                password: 'Shepherd123!',
                email_confirm: true,
                user_metadata: { role: role }
              })

              if (!authError && authData.user) {
                authId = authData.user.id
              } else if (authError?.message.includes("already registered")) {
                console.warn("User already registered in Auth, proceeding with sync.")
              }
            }

            const userIdToUse = authId || uuidv4()

            const existingUser = await db.select().from(users).where(eq(users.email, memberEmail)).limit(1)
            if (existingUser.length === 0) {
              await db.insert(users).values({
                id: userIdToUse,
                email: memberEmail,
                role: role,
                memberId: newMember.id,
                campId: newMember.campId
              }).onConflictDoNothing()
            } else {
              await db.update(users).set({
                role: role,
                memberId: newMember.id,
                campId: newMember.campId
              }).where(eq(users.email, memberEmail))
            }
          } catch (syncError) {
            console.error("Auto-sync failed:", syncError)
          }
        }
      }

      return { success: true, member: newMember }
    } catch (error: any) {
      console.error('Error creating member:', error)
      return { success: false, message: error.message }
    }
  })

export const updateMember = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
    const { id, firstName, lastName, email, phone, role, campus, category, birthday, status, residence, guardian, region, guardianContact, guardianLocation, profilePicture } = data as {
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
      residence?: string
      guardian?: string
      region?: string
      guardianContact?: string
      guardianLocation?: string
      profilePicture?: string | null
    }

    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        return { success: false, message: "Unauthorized" }
      }

      // Verify authorization
      const memberToUpdate = await db.select({
        id: members.id,
        campId: members.campId,
      })
        .from(members)
        .where(eq(members.id, id))
        .limit(1)

      if (!memberToUpdate[0]) {
        return { success: false, message: "Member not found" }
      }

      let isAuthorized = false
      if (currentUser.role === 'Admin') {
        isAuthorized = true
      } else if (currentUser.role === 'Leader') {
        isAuthorized = memberToUpdate[0].campId === currentUser.campId
      } else if (currentUser.role === 'Shepherd') {
        const assignment = await db.select()
          .from(memberAssignments)
          .where(
            and(
              eq(memberAssignments.memberId, id),
              eq(memberAssignments.shepherdId, currentUser.id)
            )
          )
          .limit(1)
        isAuthorized = assignment.length > 0
      }

      if (!isAuthorized) {
        return { success: false, message: "Unauthorized to update this member" }
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
      if (residence !== undefined) updateData.residence = residence || null
      if (guardian !== undefined) updateData.guardian = guardian || null
      if (region !== undefined) updateData.region = region || null
      if (guardianContact !== undefined) updateData.guardianContact = guardianContact || null
      if (guardianLocation !== undefined) updateData.guardianLocation = guardianLocation || null
      if (profilePicture !== undefined) updateData.profilePicture = profilePicture || null

      // Handle Status Changes (Suspension/Activation)
      if (updateData.status) {
        const linkedUser = await db.select({ id: users.id }).from(users).where(eq(users.memberId, id)).limit(1)
        if (linkedUser.length > 0) {
          try {
            const supabaseUrl = process.env.VITE_SUPABASE_URL
            const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

            if (supabaseUrl && serviceRoleKey) {
              const { createClient } = await import('@supabase/supabase-js')
              const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
              const authUserId = linkedUser[0].id

              if (updateData.status === 'Archived') {
                console.log(`Suspending user ${authUserId} due to status change to ${updateData.status}`)
                await supabaseAdmin.auth.admin.updateUserById(authUserId, {
                  ban_duration: '876000h'
                })
              } else if (updateData.status === 'Active' || updateData.status === 'Inactive') {
                console.log(`Activating user ${authUserId}`)
                await supabaseAdmin.auth.admin.updateUserById(authUserId, {
                  ban_duration: 'none'
                })
              }
            }
          } catch (statusErr) {
            console.error("Error updating user status:", statusErr)
          }
        }
      }

      // Check if email is being updated and sync to Auth User if needed
      if (updateData.email) {
        const currentMember = await db.select({ email: members.email }).from(members).where(eq(members.id, id)).limit(1)
        if (currentMember[0] && currentMember[0].email !== updateData.email) {
          const linkedUser = await db.select({ id: users.id }).from(users).where(eq(users.memberId, id)).limit(1)
          if (linkedUser.length > 0) {
            try {
              const supabaseUrl = process.env.VITE_SUPABASE_URL
              const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
              if (supabaseUrl && serviceRoleKey) {
                const { createClient } = await import('@supabase/supabase-js')
                const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

                await supabaseAdmin.auth.admin.updateUserById(linkedUser[0].id, {
                  email: updateData.email,
                  email_confirm: true
                })
                console.log(`Synced email update for user ${linkedUser[0].id}`)

                await db.update(users).set({ email: updateData.email }).where(eq(users.id, linkedUser[0].id))
              }
            } catch (authErr) {
              console.error("Failed to sync email update to Auth:", authErr)
            }
          }
        }
      }

      const [updatedMember] = await db.update(members)
        .set(updateData)
        .where(eq(members.id, id))
        .returning()

      // Auto-sync: Handle Promotion and Demotion
      if (updateData.role) {
        if (updateData.role === 'Leader' || updateData.role === 'Shepherd') {
          const memberEmail = updatedMember.email
          if (memberEmail) {
            try {
              const supabaseUrl = process.env.VITE_SUPABASE_URL
              const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
              let authId: string | undefined

              if (supabaseUrl && serviceRoleKey) {
                const { createClient } = await import('@supabase/supabase-js')
                const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                  email: memberEmail,
                  password: 'Shepherd123!',
                  email_confirm: true,
                  user_metadata: { role: updateData.role }
                })
                if (!authError && authData.user) authId = authData.user.id
              }

              const userIdToUse = authId || uuidv4()
              const existingUser = await db.select().from(users).where(eq(users.email, memberEmail)).limit(1)

              if (existingUser.length === 0) {
                await db.insert(users).values({
                  id: userIdToUse,
                  email: memberEmail,
                  role: updateData.role,
                  memberId: updatedMember.id,
                  campId: updatedMember.campId
                }).onConflictDoNothing()
              } else {
                await db.update(users).set({
                  role: updateData.role,
                  memberId: updatedMember.id,
                  campId: updatedMember.campId
                }).where(eq(users.email, memberEmail))
              }
            } catch (err) {
              console.error("Auto-sync error", err)
            }
          }
        } else {
          const linkedUser = await db.select().from(users).where(eq(users.memberId, id)).limit(1)
          if (linkedUser.length > 0) {
            try {
              console.log(`Demoting member ${id}: removing user account ${linkedUser[0].id}`)

              const supabaseUrl = process.env.VITE_SUPABASE_URL
              const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

              if (supabaseUrl && serviceRoleKey) {
                const { createClient } = await import('@supabase/supabase-js')
                const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
                await supabaseAdmin.auth.admin.deleteUser(linkedUser[0].id)
                console.log("Auth user deleted.")
              }

              await db.delete(users).where(eq(users.id, linkedUser[0].id))
              console.log("Public user record deleted.")
            } catch (demotionError) {
              console.error("Error removing user during demotion:", demotionError)
            }
          }
        }
      }

      return { success: true, member: updatedMember }
    } catch (error: any) {
      console.error('Error updating member:', error)
      return { success: false, message: error.message }
    }
  })

export const getMembersByCampus = createServerFn({ method: "GET" })
  .inputValidator((data: { campId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        return []
      }

      // For Shepherds, only see assigned members in the camp
      if (currentUser.role === 'Shepherd') {
        const assignedMembers = await db.select({ memberId: memberAssignments.memberId })
          .from(memberAssignments)
          .where(eq(memberAssignments.shepherdId, currentUser.id))

        if (assignedMembers.length === 0) {
          return []
        }

        const memberIdsList = assignedMembers.map(a => a.memberId)

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
          campId: members.campId,
        })
          .from(members)
          .leftJoin(camps, eq(members.campId, camps.id))
          .where(and(
            inArray(members.id, memberIdsList),
            eq(members.campId, data.campId)
          ))

        return campusMembers
      }

      // Leaders can only see their own camp
      if (currentUser.role === 'Leader' && currentUser.campId) {
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
          campId: members.campId,
        })
          .from(members)
          .leftJoin(camps, eq(members.campId, camps.id))
          .where(eq(members.campId, data.campId))

        return campusMembers
      }

      // Admin can see any camp
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
        campId: members.campId,
      })
        .from(members)
        .leftJoin(camps, eq(members.campId, camps.id))
        .where(eq(members.campId, data.campId))

      return campusMembers
    } catch (error) {
      console.error('Error fetching members by campus:', error)
      return []
    }
  })

export const getMembersByCategory = createServerFn({ method: "GET" })
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data }) => {
    try {
      const currentUser = await getCurrentUser()

      const conditions = [eq(members.category, data.category as any)]

      // Apply camp filtering for non-Admin users
      if (currentUser && currentUser.role !== 'Admin' && currentUser.campId) {
        conditions.push(eq(members.campId, currentUser.campId))
      }

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
        campId: members.campId,
      })
        .from(members)
        .leftJoin(camps, eq(members.campId, camps.id))
        .where(and(...conditions))

      return categoryMembers
    } catch (error) {
      console.error('Error fetching members by category:', error)
      return []
    }
  })

export const getCampusStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const currentUser = await getCurrentUser()

      const stats: Record<string, number> = {
        cohk: 0,
        knust: 0,
        legon: 0,
        workforce: 0,
        nss: 0,
        alumni: 0,
      }

      let whereClause = undefined as any

      // Apply camp filtering for non-Admin users
      if (currentUser && currentUser.role !== 'Admin' && currentUser.campId) {
        whereClause = eq(members.campId, currentUser.campId)
      }

      const baseCountQuery = db.select({
        campus: members.campus,
        count: sql<number>`count(*)`,
      })
        .from(members)
        .groupBy(members.campus)

      const result = await (whereClause
        ? baseCountQuery.where(whereClause)
        : baseCountQuery
      )

      result.forEach(row => {
        const campus = row.campus?.toLowerCase()
        if (campus && campus in stats) {
          stats[campus] = Number(row.count)
        }
      })

      return {
        CoHK: stats.cohk,
        KNUST: stats.knust,
        Legon: stats.legon,
        Workforce: stats.workforce,
        NSS: stats.nss,
        Alumni: stats.alumni,
      }
    } catch (error) {
      console.error('Error fetching campus stats:', error)
      return {
        CoHK: 0,
        KNUST: 0,
        Legon: 0,
        Workforce: 0,
        NSS: 0,
        Alumni: 0,
      }
    }
  })
