import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: ReactNode }) {
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
