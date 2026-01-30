import { createBrowserClient } from '@supabase/ssr'

// Create a Supabase client for use in the browser
export function createClient() {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY

    console.log('[Supabase] Creating client with:', {
        url: url ? '✓ set' : '✗ missing',
        key: key ? '✓ set' : '✗ missing',
    })

    if (!url || !key) {
        console.error('[Supabase] Missing environment variables:', {
            url: !!url,
            key: !!key,
        })
        throw new Error('Supabase environment variables are not configured')
    }

    try {
        const newClient = createBrowserClient(url, key)
        console.log('[Supabase] Client created successfully')
        return newClient
    } catch (error) {
        console.error('[Supabase] Error creating browser client:', error)
        throw error
    }
}

// Singleton instance for convenience
let client: ReturnType<typeof createBrowserClient> | null = null
let initError: Error | null = null

export function getSupabaseClient() {
    if (initError) {
        console.warn('[Supabase] Supabase initialization previously failed:', initError.message)
        return null
    }

    if (!client) {
        try {
            console.log('[Supabase] Initializing client...')
            client = createClient()
            console.log('[Supabase] Client initialized successfully')
        } catch (error) {
            initError = error as Error
            console.error('[Supabase] Failed to initialize client:', error)
            return null
        }
    }
    return client
}
