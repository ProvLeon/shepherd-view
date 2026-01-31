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

// Bulk SMS with template support
const bulkSmsSchema = z.object({
    recipients: z.array(z.object({
        phone: z.string(),
        name: z.string(),
        campName: z.string().optional().nullable()
    })),
    message: z.string(),
    senderId: z.string().optional()
})

export const sendBulkSms = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => bulkSmsSchema.parse(data))
    .handler(async ({ data }) => {
        const apiKey = process.env.ARKESEL_API_KEY
        const senderId = data.senderId || process.env.ARKESEL_SENDER_ID || 'Shepherd'

        if (!apiKey) {
            return { success: false, message: 'SMS configuration missing' }
        }

        // Check if message contains template tags
        const hasTemplates = data.message.includes('{firstName}') || data.message.includes('{campName}')

        if (!hasTemplates) {
            // Optimization: If no templates, send as single bulk request
            const phones = data.recipients.map(r => r.phone)
            // Reuse existing logic or call Arkesel bulk
            try {
                const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
                    method: 'POST',
                    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender: senderId,
                        message: data.message,
                        recipients: phones
                    })
                })
                const result = await response.json() as ArkeselResponse
                return result.status === 'success' ? { success: true, count: phones.length } : { success: false, message: result.message }
            } catch (error) {
                console.error('Bulk send error:', error)
                return { success: false, message: 'Failed to send bulk SMS' }
            }
        } else {
            // Template processing: We must send individually or group by unique message content
            // For simplicity/MVP, we'll iterate. For production scale, use a queue.
            let successCount = 0

            // Limit concurrency
            const batchSize = 5
            for (let i = 0; i < data.recipients.length; i += batchSize) {
                const batch = data.recipients.slice(i, i + batchSize)
                await Promise.all(batch.map(async (recipient) => {
                    let personalizedMessage = data.message
                    personalizedMessage = personalizedMessage.replace(/{firstName}/g, recipient.name.split(' ')[0])
                    personalizedMessage = personalizedMessage.replace(/{campName}/g, recipient.campName || '')

                    try {
                        const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
                            method: 'POST',
                            headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sender: senderId,
                                message: personalizedMessage,
                                recipients: [recipient.phone]
                            })
                        })
                        const result = await response.json() as ArkeselResponse
                        if (result.status === 'success') successCount++
                    } catch (e) {
                        console.error('Individual send error:', e)
                    }
                }))
            }

            return { success: true, count: successCount, total: data.recipients.length }
        }
    })
