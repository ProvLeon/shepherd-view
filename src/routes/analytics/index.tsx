import { createFileRoute } from '@tanstack/react-router'
import { getAttendanceAnalytics } from '@/server/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, TrendingUp, Award, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { seedDatabase, clearDatabase } from '@/server/seed'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/analytics/')({
    component: AnalyticsDashboard,
    loader: () => getAttendanceAnalytics(),
    pendingComponent: AnalyticsSkeleton
})

function AnalyticsDashboard() {
    const { trends, campStats, topAttendees, topShepherd } = Route.useLoaderData()
    const router = useRouter()
    const [isSeeding, setIsSeeding] = useState(false)
    const [isClearing, setIsClearing] = useState(false)

    const handleSeed = async () => {
        if (!confirm('This will populate the database with sample data. Continue?')) return
        setIsSeeding(true)
        try {
            await seedDatabase()
            router.invalidate()
        } finally {
            setIsSeeding(false)
        }
    }

    const handleClear = async () => {
        if (!confirm('WARNING: This will delete ALL members, events, and attendance data. This cannot be undone. Are you sure?')) return
        setIsClearing(true)
        try {
            await clearDatabase()
            router.invalidate()
        } finally {
            setIsClearing(false)
        }
    }

    if (trends.length === 0 && campStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
                <div className="p-4 bg-purple-50 rounded-full">
                    <TrendingUp className="w-12 h-12 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">No Analytics Data Yet</h2>
                <p className="text-slate-500 max-w-md">
                    Start recording attendance to see trends here, or generate sample data for testing.
                </p>
                <Button
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    {isSeeding ? 'Generating Data...' : 'Generate Sample Data'}
                </Button>
            </div>
        )
    }

    // Colors for charts
    const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
                    <p className="text-slate-500">Insights into attendance, growth, and member engagement.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleClear}
                    disabled={isClearing}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                    {isClearing ? 'Clearing...' : 'Reset Data'}
                </Button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Avg. Attendance</p>
                            <h3 className="text-2xl font-bold text-slate-900">
                                {trends.length > 0 ? Math.round(trends.reduce((a, b) => a + b.count, 0) / trends.length) : 0}
                            </h3>
                            <p className="text-xs text-slate-400">last 12 events</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Engaged</p>
                            <h3 className="text-2xl font-bold text-slate-900">
                                {campStats.reduce((a, b) => a + b.attendanceCount, 0)}
                            </h3>
                            <p className="text-xs text-slate-400">visits across all camps</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-100 text-pink-600 rounded-lg">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Top Shepherd</p>
                            {topShepherd ? (
                                <>
                                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1">
                                        {topShepherd.firstName} {topShepherd.lastName}
                                    </h3>
                                    <p className="text-xs text-slate-400">{topShepherd.attendanceCount} member visits</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-slate-400">No Data</h3>
                                    <p className="text-xs text-slate-400">no active assignments</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Attendance Trend Chart */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        Attendance Trends
                    </h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: '#64748B' }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: '#64748B' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Camp Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6">Camp Distribution</h2>
                    <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={campStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="attendanceCount"
                                >
                                    {campStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-slate-900">
                                {campStats.length}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-3 mt-4">
                        {campStats.map((camp, index) => (
                            <div key={camp.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-slate-600">{camp.name}</span>
                                </div>
                                <span className="font-medium text-slate-900">{camp.attendanceCount}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Attendees */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-slate-900">Top Attendees (Last 12 Weeks)</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {topAttendees.map((member, index) => (
                        <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-8 text-slate-400 font-medium text-sm">
                                    #{index + 1}
                                </div>
                                <Avatar className="h-10 w-10 border border-gray-200">
                                    <AvatarImage src={member.profilePicture || undefined} />
                                    <AvatarFallback className="bg-purple-100 text-purple-700 font-medium">
                                        {member.firstName[0]}{member.lastName[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-slate-900">{member.firstName} {member.lastName}</p>
                                    <p className="text-xs text-slate-500">Consistent Member</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                    {member.attendanceCount} events
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-20 w-1/3 bg-gray-200 rounded-lg animate-pulse" />
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="md:col-span-2 h-[350px] rounded-xl" />
                <Skeleton className="h-[350px] rounded-xl" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
    )
}
