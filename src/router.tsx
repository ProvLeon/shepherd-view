import { createRouter, RootRoute } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Define router context type
export type RouterContext = {
  auth: {
    userId: string | null
    user: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      role: 'Admin' | 'Leader' | 'Shepherd'
      memberId: string | null
      campId: string | null
    } | null
    isAuthenticated: boolean
  }
}

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {
      auth: {
        userId: null,
        user: null,
        isAuthenticated: false,
      },
    } as RouterContext,

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
