import { ReactNode, useEffect, useState } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { AuthLoadingSkeleton } from '../ui/skeleton'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login']

export function AppShell({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [hasNavigated, setHasNavigated] = useState(false)

    useEffect(() => {
        if (hasNavigated) return

        const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname)

        // On login page, allow access regardless of auth state
        if (isPublicRoute) {
            return
        }

        // If auth is still loading, don't navigate yet
        if (isLoading) {
            return
        }

        // Auth loading is done - make navigation decisions
        if (!isAuthenticated && !isPublicRoute) {
            // Not authenticated and not on public route - redirect to login
            navigate({ to: '/login' })
            setHasNavigated(true)
        } else if (isAuthenticated && isPublicRoute) {
            // Authenticated and on login page - redirect to dashboard
            navigate({ to: '/' })
            setHasNavigated(true)
        }
    }, [isAuthenticated, isLoading, location.pathname, navigate, hasNavigated])

    // Show loading skeleton while auth is initializing
    if (isLoading) {
        return <AuthLoadingSkeleton />
    }

    // On login page, don't show sidebar
    if (location.pathname === '/login') {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <main className="lg:ml-64 min-h-screen transition-all duration-300">
                <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
                    {children}
                </div>
            </main>
        </div>
    )
}
