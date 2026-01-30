import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { getRequest } from '@tanstack/react-start/server'

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

// Create a Supabase server client with proper cookie handling
export function getSupabaseServerClient() {
    const request = getRequest()
    const cookieHeader = request.headers.get('cookie') || ''

    // Parse cookies from header
    const cookies = new Map<string, string>()
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=')
            if (name && value) {
                try {
                    cookies.set(name, decodeURIComponent(value))
                } catch {
                    // Ignore invalid cookie values
                }
            }
        })
    }

    return createServerClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return Array.from(cookies.entries()).map(([name, value]) => ({
                        name,
                        value,
                    }))
                },
                setAll() {
                    // No-op in server context during SSR
                },
            },
        }
    )
}
