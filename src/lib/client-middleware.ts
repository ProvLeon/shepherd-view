/**
 * Client-Side Middleware for TanStack Start
 *
 * This middleware runs on the client-side before server function calls.
 * It handles:
 * - Extracting and attaching Supabase JWT to outgoing requests
 * - Setting proper Authorization headers
 * - Handling auth errors and token refresh
 * - Managing custom fetch behavior
 *
 * Reference: https://tanstack.com/start/latest/docs/framework/react/guide/middleware
 */

import { createMiddleware } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'

/**
 * Auth middleware for server functions
 *
 * This middleware:
 * 1. Extracts the Supabase session JWT token
 * 2. Attaches it as Authorization header to server function requests
 * 3. Handles token refresh if needed
 * 4. Provides proper error handling for auth failures
 */
export const clientAuthMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    try {
      const supabase = getSupabaseClient()

      // Get current session to extract JWT
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // If we have a session with an access token, add it to headers
      let headers: Record<string, string> | undefined

      if (session?.access_token) {
        headers = {
          Authorization: `Bearer ${session.access_token}`,
          // Add additional auth headers as needed
          'X-Auth-Token': session.access_token,
        }
      }

      // Call the next middleware/function with auth headers
      return next({
        headers,
      })
    } catch (error) {
      console.error('Auth middleware error:', error)
      // Continue without auth headers if middleware fails
      // The server-side middleware will handle auth as fallback
      return next()
    }
  })

/**
 * Logging middleware for development
 *
 * Logs all server function calls in development mode
 * Helps with debugging and monitoring
 */
export const loggingMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next, request }) => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now()
      console.log(`[Client] 📤 Calling server function: ${request.url}`)

      const result = await next()

      const duration = performance.now() - startTime
      console.log(
        `[Client] ✅ Server function completed in ${duration.toFixed(2)}ms`
      )

      return result
    }

    return next()
  })

/**
 * Error handling middleware for server function errors
 *
 * Catches and processes server function errors
 * Provides user-friendly error messages
 */
export const errorHandlingMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      console.error('[Client] ❌ Server function error:', error)

      // You can add custom error handling here
      // For example, redirect to login on 401, show toast on error, etc.

      // Re-throw to let the calling code handle it
      throw error
    }
  })

/**
 * Retry middleware for failed requests
 *
 * Automatically retries failed server function calls
 * Useful for handling transient failures
 */
export const retryMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    const maxRetries = 2
    let lastError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await next()
      } catch (error) {
        lastError = error

        // Only retry on network errors or 5xx server errors
        const isRetryable =
          error instanceof TypeError || // Network error
          (error instanceof Response && error.status >= 500)

        if (attempt === maxRetries || !isRetryable) {
          throw error
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = Math.pow(2, attempt) * 100
        await new Promise((resolve) => setTimeout(resolve, delay))

        console.warn(
          `[Client] 🔄 Retrying server function (attempt ${attempt + 2}/${maxRetries + 1})`
        )
      }
    }

    throw lastError
  })

/**
 * Request timeout middleware
 *
 * Adds a timeout to server function requests
 * Prevents hanging requests
 */
export const timeoutMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    const timeoutMs = 30000 // 30 seconds

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Server function request timeout')),
        timeoutMs
      )
    })

    try {
      return await Promise.race([next(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('[Client] ⏱️ Request timed out after', timeoutMs, 'ms')
      }
      throw error
    }
  })

/**
 * Combined auth middleware stack
 *
 * Combines all client middleware in the correct order
 * This is what you should use in your server functions
 */
export const clientMiddleware = [
  clientAuthMiddleware,
  loggingMiddleware,
  errorHandlingMiddleware,
  retryMiddleware,
  timeoutMiddleware,
]

/**
 * Custom fetch implementation with auth
 *
 * This can be used to customize how server function requests are made
 * Useful for adding interceptors, custom headers, or telemetry
 */
export async function createAuthenticatedFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const supabase = getSupabaseClient()

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Create headers with auth
  const headers = new Headers(init?.headers)

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
    headers.set('X-Auth-Token', session.access_token)
  }

  // Make request
  return fetch(url, {
    ...init,
    headers,
  })
}
