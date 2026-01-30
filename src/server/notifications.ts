import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { members, events } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { sendEmail, emailTemplates } from '../lib/email'
import { sendSMS, sendBulkSMS, smsTemplates } from '../lib/sms'

// Send event notification to all active members
export const sendEventNotification = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { eventId, channels } = data as {
            eventId: string
            channels: ('email' | 'sms')[]
        }

        try {
            // Get event details
            const [event] = await db.select()
                .from(events)
                .where(eq(events.id, eventId))
                .limit(1)

            if (!event) {
                return { success: false, message: 'Event not found' }
            }

            // Get all active members with contact info
            const activeMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                phone: members.phone,
            })
                .from(members)
                .where(eq(members.status, 'Active'))

            const results = {
                email: { sent: 0, failed: 0 },
                sms: { sent: 0, failed: 0 },
            }

            const eventDate = new Date(event.date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            })
            const eventTime = new Date(event.date).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
            })

            // Send emails
            if (channels.includes('email')) {
                const membersWithEmail = activeMembers.filter(m => m.email)
                for (const member of membersWithEmail) {
                    const template = emailTemplates.eventReminder(
                        member.firstName,
                        event.name,
                        eventDate,
                        eventTime
                    )
                    const result = await sendEmail({
                        to: member.email!,
                        ...template,
                    })
                    if (result.success) {
                        results.email.sent++
                    } else {
                        results.email.failed++
                    }
                }
            }

            // Send SMS
            if (channels.includes('sms')) {
                const membersWithPhone = activeMembers.filter(m => m.phone)
                const smsResult = await sendBulkSMS(
                    membersWithPhone.map(m => ({
                        phone: m.phone!,
                        name: m.firstName,
                    })),
                    (name) => smsTemplates.eventReminder(name, event.name, eventDate)
                )
                results.sms.sent = smsResult.sent
                results.sms.failed = smsResult.failed
            }

            return {
                success: true,
                results,
                totalRecipients: activeMembers.length,
            }
        } catch (error: any) {
            console.error('Error sending event notification:', error)
            return { success: false, message: error.message }
        }
    })

// Send birthday wishes to members with birthday today
export const sendBirthdayWishes = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { channels } = data as { channels: ('email' | 'sms')[] }

        try {
            // Get members with birthday today
            const today = new Date()
            const month = today.getMonth() + 1
            const day = today.getDate()

            const birthdayMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
                email: members.email,
                phone: members.phone,
            })
                .from(members)
                .where(
                    and(
                        eq(members.status, 'Active'),
                        sql`EXTRACT(MONTH FROM ${members.birthday}) = ${month}`,
                        sql`EXTRACT(DAY FROM ${members.birthday}) = ${day}`
                    )
                )

            const results = {
                email: { sent: 0, failed: 0 },
                sms: { sent: 0, failed: 0 },
            }

            for (const member of birthdayMembers) {
                // Send email
                if (channels.includes('email') && member.email) {
                    const template = emailTemplates.birthdayWish(member.firstName)
                    const result = await sendEmail({
                        to: member.email,
                        ...template,
                    })
                    if (result.success) {
                        results.email.sent++
                    } else {
                        results.email.failed++
                    }
                }

                // Send SMS
                if (channels.includes('sms') && member.phone) {
                    const result = await sendSMS({
                        to: member.phone,
                        message: smsTemplates.birthdayWish(member.firstName),
                    })
                    if (result.success) {
                        results.sms.sent++
                    } else {
                        results.sms.failed++
                    }
                }
            }

            return {
                success: true,
                results,
                birthdayCount: birthdayMembers.length,
            }
        } catch (error: any) {
            console.error('Error sending birthday wishes:', error)
            return { success: false, message: error.message }
        }
    })

// Send a message to a specific member
export const sendMemberNotification = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { memberId, channel, subject, message } = data as {
            memberId: string
            channel: 'email' | 'sms'
            subject?: string
            message: string
        }

        try {
            const [member] = await db.select()
                .from(members)
                .where(eq(members.id, memberId))
                .limit(1)

            if (!member) {
                return { success: false, message: 'Member not found' }
            }

            if (channel === 'email') {
                if (!member.email) {
                    return { success: false, message: 'Member has no email' }
                }
                const result = await sendEmail({
                    to: member.email,
                    subject: subject || 'Message from Agape Ministry',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                                <h1 style="color: white; margin: 0;">Shepherd's View</h1>
                            </div>
                            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
                                <h2 style="color: #1f2937;">Hi ${member.firstName}! 👋</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                                <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
                                    — Agape Ministry
                                </p>
                            </div>
                        </div>
                    `,
                })
                return result
            } else {
                if (!member.phone) {
                    return { success: false, message: 'Member has no phone number' }
                }
                return await sendSMS({
                    to: member.phone,
                    message: `Hi ${member.firstName}, ${message} - Agape Ministry`,
                })
            }
        } catch (error: any) {
            console.error('Error sending member notification:', error)
            return { success: false, message: error.message }
        }
    })

// Send announcement to all active members
export const sendAnnouncement = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { subject, message, channels } = data as {
            subject: string
            message: string
            channels: ('email' | 'sms')[]
        }

        try {
            const activeMembers = await db.select({
                id: members.id,
                firstName: members.firstName,
                email: members.email,
                phone: members.phone,
            })
                .from(members)
                .where(eq(members.status, 'Active'))

            const results = {
                email: { sent: 0, failed: 0 },
                sms: { sent: 0, failed: 0 },
            }

            for (const member of activeMembers) {
                // Send email
                if (channels.includes('email') && member.email) {
                    const result = await sendEmail({
                        to: member.email,
                        subject,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                                    <h1 style="color: white; margin: 0;">📢 Announcement</h1>
                                </div>
                                <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
                                    <h2 style="color: #1f2937;">Hi ${member.firstName}! 👋</h2>
                                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                                    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
                                        — Agape Ministry
                                    </p>
                                </div>
                            </div>
                        `,
                    })
                    if (result.success) {
                        results.email.sent++
                    } else {
                        results.email.failed++
                    }
                }

                // Send SMS
                if (channels.includes('sms') && member.phone) {
                    const result = await sendSMS({
                        to: member.phone,
                        message: smsTemplates.generalAnnouncement(message),
                    })
                    if (result.success) {
                        results.sms.sent++
                    } else {
                        results.sms.failed++
                    }
                }
            }

            return {
                success: true,
                results,
                totalRecipients: activeMembers.length,
            }
        } catch (error: any) {
            console.error('Error sending announcement:', error)
            return { success: false, message: error.message }
        }
    })
