import { Link, useNavigate } from '@tanstack/react-router'
import {
    LayoutDashboard,
    Users,
    Calendar,
    Building2,
    Settings,
    LogOut,
    Menu,
    Shield,
    TrendingUp,
    UserCog,
    ClipboardList,
    MessageSquare
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

// Define nav items with role restrictions
type UserRole = 'Admin' | 'Leader' | 'Shepherd' | null

interface NavItem {
    to: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    roles?: UserRole[] // If undefined, visible to all authenticated users
}

const navItems: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/members', label: 'Members', icon: Users },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/followups', label: 'Follow-ups', icon: ClipboardList, roles: ['Admin', 'Leader'] },
    { to: '/attendance', label: 'Attendance', icon: Calendar },
    { to: '/campuses', label: 'Campuses', icon: Building2, roles: ['Admin', 'Leader'] },
    { to: '/messaging', label: 'Messaging', icon: MessageSquare, roles: ['Admin', 'Leader'] },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ['Admin'] },
]

export function Sidebar() {
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isSigningOut, setIsSigningOut] = useState(false)
    const { user, role, signOut } = useAuth()
    const navigate = useNavigate()

    // Filter nav items based on user role
    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true // No restrictions
        if (!role) return false // User has no role, hide restricted items
        return item.roles.includes(role)
    })

    // Handle sign out
    const handleSignOut = async () => {
        setIsSigningOut(true)
        try {
            await signOut()
            navigate({ to: '/login' })
        } catch (error) {
            console.error('Error signing out:', error)
        } finally {
            setIsSigningOut(false)
        }
    }

    // Get user initials
    const getUserInitials = () => {
        if (!user?.email) return '?'
        const email = user.email
        // Try to get first two letters of the part before @
        const name = email.split('@')[0]
        if (name.length >= 2) {
            return name.slice(0, 2).toUpperCase()
        }
        return name.toUpperCase()
    }

    // Get role badge color
    const getRoleBadgeColor = () => {
        switch (role) {
            case 'Admin':
                return 'bg-red-100 text-red-700'
            case 'Leader':
                return 'bg-blue-100 text-blue-700'
            case 'Shepherd':
                return 'bg-green-100 text-green-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-sm border border-gray-200"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <Menu className="w-6 h-6 text-gray-600" />
            </button>

            {/* Sidebar Container */}
            <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar-bg border-r border-sidebar-border
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                {/* Logo Section */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-linear-to-r from-agape-red/5 to-agape-blue/5">
                    <div className="flex items-center gap-3">
                        <img src="/agape-logo.png" alt="Agape Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-linear-to-r from-agape-red to-agape-blue">
                            Shepherd's View
                        </span>
                    </div>
                </div>

                {/* Role Badge */}
                {role && (
                    <div className="px-6 py-3 border-b border-gray-100">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
                            {role === 'Admin' && <Shield className="w-3 h-3" />}
                            {role === 'Leader' && <UserCog className="w-3 h-3" />}
                            {role === 'Shepherd' && <Users className="w-3 h-3" />}
                            {role}
                        </span>
                    </div>
                )}

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {filteredNavItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            activeProps={{
                                className: 'bg-sidebar-bg-active text-sidebar-text-active border-r-2 border-agape-blue font-medium',
                            }}
                            className="flex items-center gap-3 px-4 py-3 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors group"
                            onClick={() => setIsMobileOpen(false)}
                        >
                            <item.icon className="w-5 h-5 group-hover:text-agape-blue transition-colors" />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* User Profile / Footer */}
                <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 p-2 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-agape-purple to-agape-blue text-white flex items-center justify-center font-bold text-sm">
                            {getUserInitials()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {user?.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user?.email || 'Not signed in'}
                            </p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Sign out"
                        >
                            <LogOut className={`w-4 h-4 ${isSigningOut ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-30 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    )
}

