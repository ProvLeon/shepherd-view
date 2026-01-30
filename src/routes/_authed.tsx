import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AuthProvider } from '../context/AuthContext'
import { AppShell } from '../components/layout/AppShell'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    // User is provided by root route's beforeLoad
    // If not present, redirect to login
    if (!context.user) {
      console.log('🔐 [_authed] No user in context, redirecting to login')
      throw redirect({
        to: '/login',
      })
    }

    console.log('✅ [_authed] User authenticated:', context.user.email)
    return context
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  // Context comes from root route's beforeLoad
  // The root route handles server-side authentication via fetchUser()
  // This ensures proper cookie handling and auth state
  return (
    <AuthProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthProvider>
  )
}
