import { createBrowserClient } from '@supabase/ssr'

// Create a Supabase client for use in the browser
export function createClient() {
    return createBrowserClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
    )
}

// Singleton instance for convenience
let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
    if (!client) {
        client = createClient()
    }
    return client
}
