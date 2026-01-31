import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Schema for sending SMS
const sendSmsSchema = z.object({
    recipients: z.array(z.string()),
    message: z.string(),
    senderId: z.string().optional()
})

interface ArkeselResponse {
    status: string
    message: string
    data?: any
}

export const sendArkeselSms = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof sendSmsSchema>) => data)
    .handler(async ({ data }) => {
        const apiKey = process.env.ARKESEL_API_KEY

        // Use provided sender ID or default from env, fallback to 'Arkesel' or 'Shepherd'
        const senderId = data.senderId || process.env.ARKESEL_SENDER_ID || 'Shepherd'

        if (!apiKey) {
            console.warn('ARKESEL_API_KEY is not set')
            return { success: false, message: 'SMS configuration missing (API Key)' }
        }

        try {
            const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
                method: 'POST',
                headers: {
                    'api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: senderId,
                    message: data.message,
                    recipients: data.recipients
                })
            })

            const result = await response.json() as ArkeselResponse

            if (result.status === 'success' || response.ok) {
                return { success: true, data: result }
            } else {
                console.error('Arkesel API Error:', result)
                return { success: false, message: result.message || 'Failed to send SMS' }
            }

        } catch (error) {
            console.error('Error sending SMS via Arkesel:', error)
            return { success: false, message: 'Network error sending SMS' }
        }
    })
