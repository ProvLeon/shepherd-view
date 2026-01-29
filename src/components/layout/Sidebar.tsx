import { Link } from '@tanstack/react-router'
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    LogOut,
    Menu
} from 'lucide-react'
import { useState } from 'react'

export function Sidebar() {
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const navItems = [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/members', label: 'Members', icon: Users },
        { to: '/attendance', label: 'Attendance', icon: Calendar },
        { to: '/settings', label: 'Settings', icon: Settings },
    ]

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
                <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-gradient-to-r from-agape-red/5 to-agape-blue/5">
                    <div className="flex items-center gap-3">
                        <img src="/agape-logo.png" alt="Agape Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-agape-red to-agape-blue">
                            Shepherd's View
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => (
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
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-agape-purple text-white flex items-center justify-center font-bold text-sm">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
                            <p className="text-xs text-gray-500 truncate">admin@agape.org</p>
                        </div>
                        <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500" />
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
