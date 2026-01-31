import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity, Users, TrendingUp, Cake, Calendar, Phone, MessageCircle, ChevronRight, Bell, CakeIcon, AlertCircle, Clock, X } from 'lucide-react'
import { getDashboardStats } from '@/server/dashboard'
import { dismissActionItem } from '@/server/followups'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getWhatsAppLink, getCallLink } from '@/lib/sms'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import { BirthdayWishes } from '@/components/BirthdayWishes'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: Dashboard,
  loader: () => getDashboardStats(),
  pendingComponent: DashboardSkeleton,
})

function Dashboard() {
  const stats = Route.useLoaderData()
  const router = useRouter()

  const handleDismiss = async (e: React.MouseEvent, type: string, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const result = await dismissActionItem({ data: { type, referenceId: id } })
      if (result.success) {
        toast.success(result.message || 'Item dismissed')
        router.invalidate()
      } else {
        toast.error(result.message || 'Failed to dismiss')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const statCards = [
    {
      label: 'Total Members',
      value: stats.totalMembers.toLocaleString(),
      icon: Users,
      change: 'All registered members',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Active Members',
      value: stats.activeMembers.toLocaleString(),
      icon: Activity,
      change: 'Currently active',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Birthdays Today',
      value: stats.birthdaysToday.toString(),
      icon: Cake,
      change: 'Send them a message!',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'New Converts',
      value: stats.newConverts.toString(),
      icon: TrendingUp,
      change: 'This Month',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of ministry growth and activities.</p>
        </div>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
        >
          <Users className="w-4 h-4" />
          View Members
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trends</h2>
          {stats.attendanceData && stats.attendanceData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.attendanceData}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No attendance data yet</p>
                <p className="text-sm">Create events and record attendance to see trends</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Items */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h2>
          <div className="space-y-3">
            {stats.birthdaysToday > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-purple-100 bg-linear-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Cake className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">
                      {stats.birthdaysToday} birthday{stats.birthdaysToday > 1 ? 's' : ''} today!
                    </span>
                    <p className="text-sm text-gray-500">Send them a message</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            )}

            {stats.newConverts > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-green-100 bg-linear-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">
                      {stats.newConverts} new convert{stats.newConverts > 1 ? 's' : ''} this month
                    </span>
                    <p className="text-sm text-gray-500">Schedule follow-ups</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            )}

            {/* Needs Attention */}
            {stats.needsAttention && stats.needsAttention.map((member: any) => (
              <Link
                key={member.id}
                to="/members"
                search={{ search: member.lastName }} // Quick hack to filter, ideally go to details
                className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-linear-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">
                      {member.firstName} {member.lastName}
                    </span>
                    <p className="text-sm text-red-600 font-medium">
                      {member.reason} • {member.daysOverdue} days ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={(e) => handleDismiss(e, member.type, member.referenceId)}
                    className="p-2 -mr-2 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors z-50"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}

            {(!stats.needsAttention || stats.needsAttention.length === 0) && stats.birthdaysToday === 0 && stats.newConverts === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No pending actions</p>
                <p className="text-sm">You are all caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events & Birthdays */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Events */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link to="/attendance" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          {stats.upcomingEvents && stats.upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingEvents.map((event: any) => (
                <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{event.name}</p>
                    <p className="text-sm text-gray-500">{event.date}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {event.type}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No upcoming events</p>
            </div>
          )}
        </div>

        {/* Birthdays This Week */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900"><span className="flex items-center gap-2">Birthdays This Week <CakeIcon className="w-5 h-5 text-linear-to-br from-purple-400 to-pink-400" /></span></h2>
            <Link to="/members" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          {stats.birthdaysThisWeek && stats.birthdaysThisWeek.length > 0 ? (
            <BirthdayWishes members={stats.birthdaysThisWeek as any[]} />
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Cake className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No birthdays this week</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
