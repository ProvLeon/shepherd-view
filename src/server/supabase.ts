import { createServerClient } from '@supabase/ssr'
import { parseCookies, setCookie, getEvent } from 'vinxi/http'

/**
 * Creates a Supabase Server Client with proper Vinxi cookie handling
 * This should be called inside a server function handler where the HTTP event context is available
 *
 * The Supabase SSR library requires both getAll() and setAll() methods for proper
 * cookie management in server-side rendering contexts.
 */
export function createSupabaseServerClient() {
  let event: any = null

  try {
    event = getEvent()
  } catch (error) {
    // getEvent() may fail in certain contexts like initial hydration or SSR
    console.warn('[Supabase] Event context not available, using fallback cookie handling')
  }

  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * getAll() is called by Supabase to retrieve all cookies from the request
         * It should return an array of { name, value } objects
         */
        getAll() {
          if (!event) {
            return []
          }

          try {
            const cookies = parseCookies(event)
            return Object.entries(cookies).map(([name, value]) => ({
              name,
              value,
            }))
          } catch (error) {
            console.warn('[Supabase] Failed to parse cookies:', error)
            return []
          }
        },
        /**
         * setAll() is called by Supabase when it needs to set cookies in the response
         * Typically this happens after authentication operations
         */
        setAll(cookiesToSet) {
          if (!event) {
            console.warn('[Supabase] Event context not available, cannot set cookies')
            return
          }

          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(event, name, value, options)
            })
          } catch (error) {
            console.warn('[Supabase] Failed to set cookies:', error)
          }
        },
      },
    }
  )
}
