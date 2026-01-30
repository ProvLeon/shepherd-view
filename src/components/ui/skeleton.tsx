import { cn } from '../../lib/utils'

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-gray-200',
                className
            )}
        />
    )
}

// Dashboard Skeleton
export function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-12 w-12 rounded-xl" />
                        </div>
                        <Skeleton className="h-4 w-32 mt-4" />
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Members Table Skeleton
export function MembersTableSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
                <Skeleton className="h-10 flex-1 max-w-md" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex gap-4">
                        <Skeleton className="h-5 w-8" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                </div>
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-gray-50 flex items-center gap-4">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-4 w-40 mb-1" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// Attendance Page Skeleton
export function AttendanceSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-36 mb-2" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {/* Events Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-28 mb-2" />
                        <Skeleton className="h-4 w-24 mb-4" />
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-20 rounded" />
                            <Skeleton className="h-8 w-20 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Settings Page Skeleton
export function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Settings Sections */}
            <div className="grid gap-6 lg:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div>
                                <Skeleton className="h-5 w-32 mb-1" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full rounded-lg" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Campus/Category Page Skeleton
export function CampusSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                    <Skeleton className="h-8 w-40 mb-1" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>

            {/* Members List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-10 w-64" />
                </div>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-gray-50 flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-4 w-40 mb-1" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// Auth Loading Skeleton (for AppShell)
export function AuthLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="relative">
                    <img src="/agape-logo.png" alt="Logo" width={64} height={64} className="mx-auto" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full bg-linear-to-br from-blue-600 to-purple-600 animate-ping delay-200 opacity-20 mx-auto" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full bg-linear-to-br from-blue-600 to-purple-600 animate-ping opacity-20 mx-auto" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32 mx-auto" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                </div>
            </div>
        </div>
    )
}

// Card Skeleton
export function CardSkeleton() {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    )
}
