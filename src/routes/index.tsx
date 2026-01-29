import { createFileRoute } from '@tanstack/react-router'
import { Activity, Users, Calendar, TrendingUp } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const stats = [
    { label: 'Total Members', value: '1,248', icon: Users, change: '+12% from last month', color: 'text-agape-blue' },
    { label: 'Attendance (This Week)', value: '85%', icon: Activity, change: '+5% from average', color: 'text-green-600' },
    { label: 'Birthdays Today', value: '3', icon: Calendar, change: 'View List', color: 'text-agape-purple' },
    { label: 'New Converts', value: '18', icon: TrendingUp, change: 'This Month', color: 'text-agape-red' },
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
        {stats.map((stat) => (
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
            [Line Chart Visualization]
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h2>
          <div className="space-y-4">
            {[
              { title: 'Follow up with New Converts', due: 'Today', priority: 'High' },
              { title: 'Prepare Sunday Bulletin', due: 'Tomorrow', priority: 'Medium' },
              { title: 'Check on absent leaders', due: 'Friday', priority: 'Medium' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.priority === 'High' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium text-gray-700">{item.title}</span>
                </div>
                <span className="text-sm text-gray-500">{item.due}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
