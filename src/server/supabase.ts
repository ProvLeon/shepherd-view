import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

/**
 * Creates a Supabase Server Client for TanStack Start
 *
 * Pass the server context that TanStack Start provides
 * The context contains request/response information
 */
export function createSupabaseServerClient(context: any) {
  // Extract request from context
  const request = context?.request || context?.req
  const response = context?.response || context?.res

  if (!request) {
    console.warn('[Supabase] No request in context')
    // Return a client anyway, it just won't have cookies
    return createServerClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() { },
        },
      }
    )
  }

  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          try {
            const cookieHeader = request.headers?.get?.('cookie') ||
              request.headers?.cookie || ''

            if (!cookieHeader) {
              return []
            }

            return parseCookieHeader(cookieHeader)
          } catch (error) {
            console.error('[Supabase] Error getting cookies:', error)
            return []
          }
        },

        setAll(cookiesToSet) {
          if (!response) return

          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const serialized = serializeCookieHeader(name, value, options)

              if (response.headers?.append) {
                response.headers.append('Set-Cookie', serialized)
              } else if (response.setHeader) {
                const existing = response.getHeader?.('Set-Cookie') || []
                const headers = Array.isArray(existing) ? existing : [existing]
                response.setHeader('Set-Cookie', [...headers, serialized])
              }
            })
          } catch (error) {
            console.error('[Supabase] Error setting cookies:', error)
          }
        },
      },
    }
  )
}
