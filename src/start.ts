import { createStart } from '@tanstack/react-start'

/**
 * Global Middleware Setup for TanStack Start
 *
 * Currently using a simplified approach:
 * - Client-side AuthContext handles user authentication state
 * - Server functions accept userId as input parameter
 * - Role-based filtering happens in server functions
 *
 * Future improvement:
 * - Extract JWT from request headers in middleware
 * - Populate context for server functions automatically
 * - Remove need to pass userId explicitly
 */

export const startInstance = createStart(() => {
  return {
    // No global middleware for now
    // Authentication is handled via AuthContext on client
    // and userId is passed explicitly to server functions
  }
})
