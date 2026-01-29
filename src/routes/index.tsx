import { createFileRoute } from '@tanstack/react-router'
import { Activity, Users, TrendingUp, Cake } from 'lucide-react'
import { getDashboardStats } from '../server/dashboard'

export const Route = createFileRoute('/')({
  component: Dashboard,
  loader: () => getDashboardStats(),
})

function Dashboard() {
  const stats = Route.useLoaderData()

  const statCards = [
    {
      label: 'Total Members',
      value: stats.totalMembers.toLocaleString(),
      icon: Users,
      change: 'All registered members',
      color: 'text-agape-blue'
    },
    {
      label: 'Active Members',
      value: stats.activeMembers.toLocaleString(),
      icon: Activity,
      change: 'Currently active',
      color: 'text-green-600'
    },
    {
      label: 'Birthdays Today',
      value: stats.birthdaysToday.toString(),
      icon: Cake,
      change: 'Send them a message!',
      color: 'text-agape-purple'
    },
    {
      label: 'New Converts',
      value: stats.newConverts.toString(),
      icon: TrendingUp,
      change: 'This Month',
      color: 'text-agape-red'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of ministry growth and activities.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600 font-medium">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity / Growth Chart Placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Growth</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h2>
          <div className="space-y-4">
            {stats.birthdaysToday > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-medium text-gray-700 flex items-center gap-1">
                    <Cake className="w-4 h-4 text-purple-500" />
                    {stats.birthdaysToday} member{stats.birthdaysToday > 1 ? 's have' : ' has'} birthday today!
                  </span>
                </div>
                <span className="text-sm text-purple-600">View</span>
              </div>
            )}
            {stats.newConverts > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50/50 hover:bg-green-50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium text-gray-700">
                    Follow up with {stats.newConverts} new convert{stats.newConverts > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-sm text-green-600">Today</span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="font-medium text-gray-700">Prepare Sunday Bulletin</span>
              </div>
              <span className="text-sm text-gray-500">Tomorrow</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="font-medium text-gray-700">Check on absent leaders</span>
              </div>
              <span className="text-sm text-gray-500">Friday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
