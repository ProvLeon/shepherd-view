import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@/db'
import { members } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// Schema for profile update
const profileUpdateSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    birthday: z.string().optional().nullable(),
    residence: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    guardian: z.string().optional().nullable(),
    guardianContact: z.string().optional().nullable(),
    guardianLocation: z.string().optional().nullable(),
    profilePicture: z.string().url().optional().nullable()
})

// Generate a secure update token for a member
export const generateUpdateToken = createServerFn({ method: "POST" })
    .inputValidator((data: { memberId: string }) => data)
    .handler(async ({ data }) => {
        try {
            const token = randomUUID()
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

            await db.update(members)
                .set({
                    updateToken: token,
                    tokenExpiresAt: expiresAt
                })
                .where(eq(members.id, data.memberId))

            // Get member for the message
            const member = await db.select({
                firstName: members.firstName,
                phone: members.phone
            })
                .from(members)
                .where(eq(members.id, data.memberId))
                .limit(1)

            if (!member[0]) {
                return { success: false, message: 'Member not found' }
            }

            const baseUrl = process.env.APP_URL || 'http://localhost:3000'
            const updateUrl = `${baseUrl}/update/${token}`

            return {
                success: true,
                token,
                url: updateUrl,
                memberName: member[0].firstName,
                memberPhone: member[0].phone
            }
        } catch (error) {
            console.error('Error generating update token:', error)
            return { success: false, message: 'Failed to generate update link' }
        }
    })

// Validate token and get member data
export const validateUpdateToken = createServerFn({ method: "GET" })
    .inputValidator((data: { token: string }) => data)
    .handler(async ({ data }) => {
        try {
            const now = new Date()

            const result = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                phone: members.phone,
                birthday: members.birthday,
                residence: members.residence,
                region: members.region,
                guardian: members.guardian,
                guardianContact: members.guardianContact,
                guardianLocation: members.guardianLocation,
                profilePicture: members.profilePicture,
                campus: members.campus
            })
                .from(members)
                .where(
                    and(
                        eq(members.updateToken, data.token),
                        gt(members.tokenExpiresAt, now)
                    )
                )
                .limit(1)

            if (!result[0]) {
                return { valid: false, message: 'Invalid or expired link' }
            }

            return { valid: true, member: result[0] }
        } catch (error) {
            console.error('Error validating token:', error)
            return { valid: false, message: 'Error validating link' }
        }
    })

// Update member profile using token
export const updateMemberProfile = createServerFn({ method: "POST" })
    .inputValidator((data: { token: string; updates: z.infer<typeof profileUpdateSchema> }) => ({
        token: data.token,
        updates: profileUpdateSchema.parse(data.updates)
    }))
    .handler(async ({ data }) => {
        try {
            const now = new Date()

            // Validate token first
            const memberResult = await db.select({ id: members.id })
                .from(members)
                .where(
                    and(
                        eq(members.updateToken, data.token),
                        gt(members.tokenExpiresAt, now)
                    )
                )
                .limit(1)

            if (!memberResult[0]) {
                return { success: false, message: 'Invalid or expired link' }
            }

            // Update member and invalidate token
            await db.update(members)
                .set({
                    ...data.updates,
                    updateToken: null,
                    tokenExpiresAt: null
                })
                .where(eq(members.id, memberResult[0].id))

            return { success: true, message: 'Profile updated successfully!' }
        } catch (error) {
            console.error('Error updating profile:', error)
            return { success: false, message: 'Failed to update profile' }
        }
    })

// Get message templates for SMS/WhatsApp
export const getUpdateLinkMessage = (memberName: string, updateUrl: string, channel: 'sms' | 'whatsapp') => {
    if (channel === 'sms') {
        return `Hi ${memberName}! 👋\nAgape Ministries invites you to update your profile.\nTap here: ${updateUrl}\nLink expires in 7 days.`
    }

    return `Hi ${memberName}! 👋

Agape Incorporated Ministries invites you to update your profile information.

📝 Tap to update: ${updateUrl}

This link expires in 7 days.`
}
