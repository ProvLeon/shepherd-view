import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { getSupabaseServerClient } from '../lib/supabase'

import appCss from '../styles.css?url'

// Server function to fetch authenticated user
const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.log('🔍 [fetchUser] Auth error:', error.message)
      return null
    }

    if (!data.user?.email) {
      console.log('🔍 [fetchUser] No user email found')
      return null
    }

    console.log('✅ [fetchUser] User authenticated:', data.user.email)

    return {
      id: data.user.id,
      email: data.user.email,
    }
  } catch (error) {
    console.error('❌ [fetchUser] Error fetching user:', error)
    return null
  }
})

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await fetchUser()
    return { user }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: "Shepherd's View | Member Management",
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
