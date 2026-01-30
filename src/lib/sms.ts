/**
 * Arkesel SMS Integration
 * 
 * Arkesel API Documentation: https://developers.arkesel.com/
 * 
 * Required env variables:
 * - ARKESEL_API_KEY: Your Arkesel API key
 * - ARKESEL_SENDER_ID: Your approved sender ID (e.g., "AgapeMin")
 */

const ARKESEL_API_URL = 'https://sms.arkesel.com/api/v2/sms/send'

interface SMSOptions {
    to: string | string[]
    message: string
}

/**
 * Format phone number to international format
 * Assumes Ghana numbers if no country code
 */
function formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // If starts with 0, assume Ghana and add country code
    if (cleaned.startsWith('0')) {
        cleaned = '233' + cleaned.substring(1)
    }

    // If doesn't start with +, add +
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned
    }

    return cleaned
}

/**
 * Send a single SMS
 */
export async function sendSMS(options: SMSOptions): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const apiKey = process.env.ARKESEL_API_KEY
    const senderId = process.env.ARKESEL_SENDER_ID || 'AgapeMin'

    if (!apiKey) {
        console.error('ARKESEL_API_KEY not configured')
        return { success: false, error: 'SMS not configured' }
    }

    try {
        const recipients = Array.isArray(options.to)
            ? options.to.map(formatPhoneNumber)
            : [formatPhoneNumber(options.to)]

        const response = await fetch(ARKESEL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                sender: senderId,
                recipients: recipients,
                message: options.message,
            }),
        })

        const data = await response.json()

        if (data.status === 'success') {
            return { success: true, messageId: data.data?.id }
        } else {
            console.error('SMS send error:', data)
            return { success: false, error: data.message || 'SMS send failed' }
        }
    } catch (error: any) {
        console.error('SMS send failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSMS(recipients: { phone: string; name?: string }[], messageTemplate: string | ((name: string) => string)) {
    const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
            const message = typeof messageTemplate === 'function'
                ? messageTemplate(recipient.name || 'Member')
                : messageTemplate

            return sendSMS({
                to: recipient.phone,
                message,
            })
        })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - successful

    return {
        success: true,
        sent: successful,
        failed,
        total: results.length,
    }
}

/**
 * SMS Templates
 */
export const smsTemplates = {
    eventReminder: (memberName: string, eventName: string, eventDate: string) =>
        `Hi ${memberName}! Reminder: ${eventName} on ${eventDate}. We hope to see you there! - Agape Ministry`,

    birthdayWish: (memberName: string) =>
        `🎂 Happy Birthday ${memberName}! May God bless you abundantly today and always. With love, Agape Ministry Family`,

    followUpMessage: (memberName: string) =>
        `Hi ${memberName}, we're thinking of you! How are you doing? Feel free to reach out if you need anything. God bless! - Agape Ministry`,

    newConvert: (memberName: string) =>
        `Welcome to the family, ${memberName}! 🙏 We're so excited to have you. Someone will reach out soon. - Agape Ministry`,

    generalAnnouncement: (message: string) =>
        `📢 Agape Ministry: ${message}`,
}

/**
 * Generate WhatsApp click-to-chat link
 * This opens WhatsApp with a pre-filled message (no API needed)
 */
export function getWhatsAppLink(phone: string, message?: string): string {
    const formattedPhone = formatPhoneNumber(phone).replace('+', '')
    const encodedMessage = message ? encodeURIComponent(message) : ''
    return `https://wa.me/${formattedPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}

/**
 * Generate call link for mobile
 */
export function getCallLink(phone: string): string {
    return `tel:${formatPhoneNumber(phone)}`
}
