import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const generateWishSchema = z.object({
    memberName: z.string(),
    role: z.string().optional(),
    campus: z.string().optional(),
    tone: z.enum(['spiritual', 'casual', 'formal']).default('spiritual')
})

// Models that don't support system prompts (merge into user message instead)
const NO_SYSTEM_PROMPT_MODELS = ['gemma']

// Expanded fallback models - verified available on OpenRouter (as of Jan 2026)
const DEFAULT_FALLBACK_MODELS = [
    'deepseek/deepseek-r1-0528:free',
    'nous/hermes-3-llama-3.1-405b:free',
    'google/gemma-3-4b-it:free',
    'qwen/qwq-32b:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'microsoft/phi-3-mini-128k-instruct:free'
]

// Helper function to check if model supports system prompts
function supportsSystemPrompt(model: string): boolean {
    return !NO_SYSTEM_PROMPT_MODELS.some(prefix => model.toLowerCase().includes(prefix.toLowerCase()))
}

// Helper function to call OpenRouter API with a specific model
async function callOpenRouter(apiKey: string, model: string, prompt: string, systemPrompt: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
        // Build messages based on model support
        const messages = supportsSystemPrompt(model)
            ? [
                { "role": "system", "content": systemPrompt },
                { "role": "user", "content": prompt }
            ]
            : [
                { "role": "user", "content": `${systemPrompt}\n\n${prompt}` }
            ]

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json; charset=utf-8",
                "HTTP-Referer": "https://shepherd-view.app",
            },
            body: JSON.stringify({
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 150
            })
        })

        if (!response.ok) {
            const err = await response.text()
            console.error(`OpenRouter Error (model: ${model}):`, err)
            return { success: false, error: err }
        }

        const json = await response.json()
        let content = json.choices?.[0]?.message?.content?.trim().replace(/^"|"$/g, '') || ''

        // Fix encoding issues - replace replacement characters with common emojis
        content = content
            .replace(/\uFFFD/g, '✨')  // Replace unknown chars with sparkle
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // Remove control characters

        if (!content) {
            return { success: false, error: 'Empty response from model' }
        }

        console.log(`✅ Successfully generated wish using model: ${model}`)
        return { success: true, content }
    } catch (error) {
        console.error(`Error with model ${model}:`, error)
        return { success: false, error: String(error) }
    }
}

export const generateBirthdayMsg = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => generateWishSchema.parse(data))
    .handler(async ({ data }) => {
        const apiKey = process.env.OPENROUTER_API_KEY
        const primaryModel = process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1-0528:free"

        // Always use the expanded fallback list from code (not .env) for reliability
        const fallbackModels = DEFAULT_FALLBACK_MODELS

        // All models to try: primary first, then fallbacks (deduplicated)
        const modelsToTry = [...new Set([primaryModel, ...fallbackModels])]

        if (!apiKey) {
            return {
                success: false,
                message: 'AI configuration missing',
                content: `Happy Birthday ${data.memberName}! We pray for God's blessings over your life. Have a wonderful day! 🎂`
            }
        }

        const systemPrompt = "You are a helpful assistant for Agape Incorporated Ministries generating warm birthday wishes. Always output exactly ONE birthday message, never multiple options."
        const prompt = `Write exactly ONE short, warm, ${data.tone} birthday wish for ${data.memberName}${data.role ? `, who is a ${data.role}` : ''} at Agape Incorporated Ministries. 

Rules:
- Keep it under 200 characters total
- Add line breaks between greeting and blessing for readability
- Format it nicely for WhatsApp/SMS (use 2-3 short lines, not one long paragraph)
- Focus on blessings and spiritual growth
- Add 1-2 emojis
- Do NOT include hashtags
- Give only ONE final message ready to send, no options`

        // Try each model in order until one succeeds
        for (const model of modelsToTry) {
            console.log(`🔄 Attempting to generate wish with model: ${model}`)
            const result = await callOpenRouter(apiKey, model, prompt, systemPrompt)

            if (result.success && result.content) {
                return { success: true, content: result.content, model }
            }

            console.warn(`⚠️ Model ${model} failed, trying next...`)
        }

        // All models failed - return fallback message
        console.error('❌ All AI models failed. Returning static fallback.')
        return {
            success: false,
            message: 'All AI models failed',
            content: `Happy Birthday ${data.memberName}! May God bless your new age with grace and strength. 🎉`
        }
    })
