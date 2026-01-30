import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Default sender email (must be verified in Resend dashboard)
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Shepherd\'s View <noreply@shepherdsview.org>'

interface EmailOptions {
    to: string | string[]
    subject: string
    html: string
    text?: string
}

/**
 * Send a single email
 */
export async function sendEmail(options: EmailOptions) {
    try {
        const { data, error } = await resend.emails.send({
            from: DEFAULT_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        })

        if (error) {
            console.error('Email send error:', error)
            return { success: false, error: error.message }
        }

        return { success: true, id: data?.id }
    } catch (error: any) {
        console.error('Email send failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Send bulk emails (Resend supports batch sending)
 */
export async function sendBulkEmails(emails: EmailOptions[]) {
    try {
        const results = await Promise.allSettled(
            emails.map(email => sendEmail(email))
        )

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
        const failed = results.length - successful

        return {
            success: true,
            sent: successful,
            failed,
            total: results.length,
        }
    } catch (error: any) {
        console.error('Bulk email send failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Email templates
 */
export const emailTemplates = {
    eventReminder: (memberName: string, eventName: string, eventDate: string, eventTime: string) => ({
        subject: `Reminder: ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0;">Shepherd's View</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #1f2937;">Hello ${memberName}! 👋</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        This is a friendly reminder about the upcoming event:
                    </p>
                    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                        <h3 style="color: #1f2937; margin: 0 0 10px 0;">${eventName}</h3>
                        <p style="color: #6b7280; margin: 5px 0;">📅 ${eventDate}</p>
                        <p style="color: #6b7280; margin: 5px 0;">🕐 ${eventTime}</p>
                    </div>
                    <p style="color: #4b5563; font-size: 16px;">
                        We look forward to seeing you there!
                    </p>
                    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
                        — The Agape Ministry Team
                    </p>
                </div>
            </div>
        `,
    }),

    birthdayWish: (memberName: string) => ({
        subject: `🎂 Happy Birthday, ${memberName}!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 36px;">🎉 Happy Birthday! 🎂</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                    <h2 style="color: #1f2937;">Dear ${memberName},</h2>
                    <p style="color: #4b5563; font-size: 18px; line-height: 1.6;">
                        On this special day, we want you to know how much you mean to our ministry family!
                    </p>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        May God bless you with joy, peace, and abundant grace in the year ahead. 🙏
                    </p>
                    <div style="margin: 30px 0;">
                        <span style="font-size: 48px;">🎁🎈🎊</span>
                    </div>
                    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
                        With love,<br/>The Agape Ministry Family
                    </p>
                </div>
            </div>
        `,
    }),

    followUpReminder: (shepherdName: string, memberName: string, memberPhone: string) => ({
        subject: `Follow-up Reminder: ${memberName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10B981 0%, #3B82F6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0;">Follow-up Reminder</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #1f2937;">Hi ${shepherdName}! 👋</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Just a reminder to follow up with:
                    </p>
                    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                        <h3 style="color: #1f2937; margin: 0 0 10px 0;">${memberName}</h3>
                        <p style="color: #6b7280; margin: 5px 0;">📱 ${memberPhone}</p>
                    </div>
                    <p style="color: #4b5563; font-size: 16px;">
                        Remember to pray with them and share the Word!
                    </p>
                </div>
            </div>
        `,
    }),
}
