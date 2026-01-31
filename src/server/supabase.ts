import { createServerClient } from '@supabase/ssr'
import { parseCookies, setCookie } from 'vinxi/http'

// Helper to create Supabase server client
export function createSupabaseServerClient() {
    return createServerClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    const cookies = parseCookies()
                    return Object.entries(cookies).map(([name, value]) => ({
                        name,
                        value: value as string,
                    }))
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        setCookie(name, value, options)
                    })
                },
            },
        }
    )
}
