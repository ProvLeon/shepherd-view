import { useAuth } from '../context/AuthContext'
import { useCallback } from 'react'

/**
 * Hook for making authenticated server function calls
 *
 * Usage:
 * const { call } = useAuthenticatedFn()
 * const data = await call(getMembers, { })
 *
 * IMPLEMENTATION NOTE:
 * This is a placeholder hook. Once middleware is implemented,
 * it should automatically inject the user ID into server function calls.
 *
 * For now, it just ensures user is authenticated before calling functions.
 */

export function useAuthenticatedFn() {
  const { user, isLoading, isAuthenticated } = useAuth()

  const call = useCallback(
    async <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      params?: any
    ) => {
      if (isLoading) {
        throw new Error('Auth is still loading')
      }

      if (!isAuthenticated || !user) {
        throw new Error('User must be authenticated to call this function')
      }

      // TODO: Once middleware is implemented, pass user ID like this:
      // return fn({ ...params, userId: user.id })

      // For now, just ensure auth exists and call normally
      return (fn as any)(params)
    },
    [user, isLoading, isAuthenticated]
  )

  return {
    call,
    userId: user?.id,
    isReady: isAuthenticated && !isLoading,
  }
}

/**
 * Hook to check if current user has required role
 */
export function useRequireRole(...roles: string[]) {
  const { role, isLoading } = useAuth()

  const hasRole = useCallback(() => {
    if (isLoading) return null
    return role ? roles.includes(role) : false
  }, [role, isLoading, roles])

  const isAdmin = useCallback(() => {
    return role === 'Admin'
  }, [role])

  const isLeader = useCallback(() => {
    return role === 'Admin' || role === 'Leader'
  }, [role])

  const isShepherd = useCallback(() => {
    return role === 'Admin' || role === 'Leader' || role === 'Shepherd'
  }, [role])

  return {
    hasRole,
    isAdmin,
    isLeader,
    isShepherd,
    currentRole: role,
    isLoading,
  }
}
