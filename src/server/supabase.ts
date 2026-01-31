import { createServerClient } from '@supabase/ssr'
import { cookies } from 'vinxi/http'

// Helper to create Supabase server client
export function createSupabaseServerClient() {
    const cookieStore = cookies()

    return createServerClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return Object.entries(cookieStore).map(([name, value]) => ({
                        name,
                        value: value as string,
                    }))
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore[name] = value
                    })
                },
            },
        }
    )
}
