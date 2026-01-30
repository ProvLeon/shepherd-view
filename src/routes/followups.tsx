import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getAllFollowUps, getFollowUpStats, getShepherds } from '../server/followups'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Phone, MessageCircle, HeartHandshake, MapPin, User, Search, Filter, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { MemberDetailsSheet } from '@/components/MemberDetailsSheet'
import { getMemberById } from '@/server/members'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { z } from 'zod'

// Define search params schema
const followUpsSearchSchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  type: z.string().optional(),
  outcome: z.string().optional(),
  shepherdId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const Route = createFileRoute('/followups')({
  validateSearch: (search) => followUpsSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [followUpsData, stats, shepherds] = await Promise.all([
      getAllFollowUps({ data: deps }),
      getFollowUpStats(),
      getShepherds()
    ])
    return { followUpsData, stats, shepherds }
  },
  component: FollowUpsPage
})

function FollowUpsPage() {
  const { followUpsData, stats, shepherds } = Route.useLoaderData()
  const searchParams = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  // Local state for immediate input feedback, synced with URL via debouncing or on interaction
  const [searchTerm, setSearchTerm] = useState(searchParams.search || '')

  // For Member Details Sheet
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const updateFilters = (updates: Partial<typeof searchParams>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates, page: 1 }) // Reset to page 1 on filter change
    })
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    // Debounce could be added here, but for now simple onBlur or Enter is fine, 
    // or we just update check on change if we want instant but typing might be laggy on network
  }

  // Commit search on enter or blur
  const commitSearch = () => {
    updateFilters({ search: searchTerm || undefined })
  }

  const openMemberDetails = async (memberId: string) => {
    if (!memberId) return;
    // Fetch full member details on demand
    try {
      const member = await getMemberById({ data: { id: memberId } })
      if (member) {
        setSelectedMember(member)
        setSheetOpen(true)
      }
    } catch (e) {
      console.error("Failed to load member for sheet", e)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Call': return <Phone className="w-4 h-4 text-blue-500" />
      case 'WhatsApp': return <MessageCircle className="w-4 h-4 text-green-500" />
      case 'Visit': return <MapPin className="w-4 h-4 text-amber-500" />
      case 'Prayer': return <HeartHandshake className="w-4 h-4 text-rose-500" />
      default: return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const getOutcomeBadge = (outcome: string | null) => {
    switch (outcome) {
      case 'Reached':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Reached</span>
      case 'NoAnswer':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">No Answer</span>
      case 'ScheduledCallback':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Callback</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Has Notes</span>
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Follow-up Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of member care and outreach activities</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">Activities in last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <HeartHandshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.outcomes.find(s => s.name === 'Reached')?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground">Successful contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Callbacks</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.outcomes.find(s => s.name === 'ScheduledCallback')?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled for follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Outcome Distribution</CardTitle>
            <CardDescription>Breakdown of follow-up outcomes</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.outcomes}
                  cx="50%"
                  cy="50%"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.outcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Activity by Type</CardTitle>
            <CardDescription>Calls vs Messages vs Visits</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.types}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search members or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
            onBlur={commitSearch}
            className="pl-9 w-full bg-gray-50 border-gray-200"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={searchParams.type || 'all'} onValueChange={(val) => updateFilters({ type: val === 'all' ? undefined : val })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Call">Call</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Visit">Visit</SelectItem>
              <SelectItem value="Prayer">Prayer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={searchParams.outcome || 'all'} onValueChange={(val) => updateFilters({ outcome: val === 'all' ? undefined : val })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="Reached">Reached</SelectItem>
              <SelectItem value="NoAnswer">No Answer</SelectItem>
              <SelectItem value="ScheduledCallback">Callback</SelectItem>
            </SelectContent>
          </Select>

          <Select value={searchParams.shepherdId || 'all'} onValueChange={(val) => updateFilters({ shepherdId: val === 'all' ? undefined : val })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Shepherds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shepherds</SelectItem>
              {shepherds.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date filter could optionally go here, using standard inputs for now */}
          <Input
            type="date"
            className="w-[150px]"
            value={searchParams.startDate || ''}
            onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
          />
          <Input
            type="date"
            className="w-[150px]"
            value={searchParams.endDate || ''}
            onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
          />

          {(searchParams.type || searchParams.outcome || searchParams.shepherdId || searchParams.startDate || searchParams.endDate || searchParams.search) && (
            <Button variant="ghost" size="icon" onClick={() => navigate({ search: { page: 1 } })} title="Clear filters">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              <TableHead className="font-semibold text-gray-900">Member</TableHead>
              <TableHead className="font-semibold text-gray-900">Type</TableHead>
              <TableHead className="font-semibold text-gray-900">Outcome</TableHead>
              <TableHead className="font-semibold text-gray-900">Shepherd</TableHead>
              <TableHead className="font-semibold text-gray-900">Date</TableHead>
              <TableHead className="font-semibold text-gray-900 w-[30%]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {followUpsData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-8 h-8 text-gray-300" />
                    <p>No follow-ups found matching your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              followUpsData.data.map((log) => (
                <TableRow key={log.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <button
                      onClick={() => openMemberDetails(log.member?.id || '')}
                      className="text-left font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {log.member?.firstName} {log.member?.lastName}
                    </button>
                    <div className="text-xs text-gray-500">{log.member?.status}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(log.type)}
                      <span className="text-sm text-gray-700">{log.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getOutcomeBadge(log.outcome)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-700">
                      {log.shepherd?.firstName ? `${log.shepherd.firstName} ${log.shepherd.lastName || ''}` : log.shepherd?.email || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {log.date ? new Date(log.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={log.notes || ''}>
                    {log.notes || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{followUpsData.data.length}</span> of <span className="font-medium">{followUpsData.total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={searchParams.page <= 1}
              onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page! - 1 }) })}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium text-gray-700">
              Page {searchParams.page} of {Math.max(1, followUpsData.totalPages)}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={searchParams.page >= followUpsData.totalPages}
              onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page! + 1 }) })}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <MemberDetailsSheet
        member={selectedMember}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onMemberUpdated={() => { }}
      />
    </div>
  )
}
