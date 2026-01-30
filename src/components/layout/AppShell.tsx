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
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // Skip check while loading auth state
        if (isLoading) return

        const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname)

        if (!isAuthenticated && !isPublicRoute) {
            // Redirect to login if not authenticated
            navigate({ to: '/login' })
        } else if (isAuthenticated && location.pathname === '/login') {
            // Redirect to dashboard if already logged in
            navigate({ to: '/' })
        }

        setIsChecking(false)
    }, [isAuthenticated, isLoading, location.pathname, navigate])

    // Show loading skeleton while checking auth
    if (isLoading || isChecking) {
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

