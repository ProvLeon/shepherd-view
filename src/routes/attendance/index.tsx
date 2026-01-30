import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Calendar,
  Plus,
  Users,
  UserCheck,
  UserX,
  Clock,
  MoreHorizontal,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  Trash2,
  Video,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getEvents,
  createEvent,
  getEventAttendance,
  markAttendance,
  bulkMarkAttendance,
  deleteEvent
} from '@/server/attendance'
import { AttendanceSkeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/attendance/')({
  component: AttendancePage,
  loader: () => getEvents(),
  pendingComponent: AttendanceSkeleton,
})

interface Event {
  id: string
  name: string
  date: Date | string
  type: string
  description: string | null
  meetingUrl: string | null
  isRecurring: string | null
  presentCount: number
  absentCount: number
  excusedCount: number
  totalCount: number
}

interface MemberAttendance {
  id: string
  firstName: string
  lastName: string
  role: string
  attendanceId: string | null
  attendanceStatus: 'Present' | 'Absent' | 'Excused' | null
  notes: string | null
}

function AttendancePage() {
  const events = Route.useLoaderData() as Event[]
  const router = useRouter()

  // State for creating new event
  const [showNewEventForm, setShowNewEventForm] = useState(false)
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 16),
    type: 'Service' as const,
    description: '',
    meetingUrl: ''
  })
  const [isCreating, setIsCreating] = useState(false)

  // State for viewing event attendance
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventMembers, setEventMembers] = useState<MemberAttendance[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const handleCreateEvent = async () => {
    if (!newEvent.name || !newEvent.date) return
    setIsCreating(true)
    try {
      await createEvent({ data: newEvent })
      setShowNewEventForm(false)
      setNewEvent({ name: '', date: new Date().toISOString().slice(0, 16), type: 'Service', description: '', meetingUrl: '' })
      router.invalidate()
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewEvent = async (event: Event) => {
    setSelectedEvent(event)
    setLoadingAttendance(true)
    setSelectedMemberIds([])
    try {
      const members = await getEventAttendance({ data: { eventId: event.id } })
      setEventMembers(members as MemberAttendance[])
    } finally {
      setLoadingAttendance(false)
    }
  }

  const handleMarkAttendance = async (memberId: string, status: 'Present' | 'Absent' | 'Excused') => {
    if (!selectedEvent) return
    await markAttendance({ data: { eventId: selectedEvent.id, memberId, status } })
    // Refresh the attendance list
    const members = await getEventAttendance({ data: { eventId: selectedEvent.id } })
    setEventMembers(members as MemberAttendance[])
    router.invalidate()
  }

  const handleBulkMark = async (status: 'Present' | 'Absent' | 'Excused') => {
    if (!selectedEvent || selectedMemberIds.length === 0) return
    await bulkMarkAttendance({ data: { eventId: selectedEvent.id, memberIds: selectedMemberIds, status } })
    const members = await getEventAttendance({ data: { eventId: selectedEvent.id } })
    setEventMembers(members as MemberAttendance[])
    setSelectedMemberIds([])
    router.invalidate()
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event and all its attendance records?')) return
    await deleteEvent({ data: { eventId } })
    setSelectedEvent(null)
    router.invalidate()
  }

  const toggleMemberSelect = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleAllMembers = () => {
    if (selectedMemberIds.length === eventMembers.length) {
      setSelectedMemberIds([])
    } else {
      setSelectedMemberIds(eventMembers.map(m => m.id))
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'Service': return 'bg-blue-100 text-blue-700'
      case 'Retreat': return 'bg-purple-100 text-purple-700'
      case 'Meeting': return 'bg-yellow-100 text-yellow-700'
      case 'Outreach': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500">Track member attendance for services and events.</p>
        </div>
        <Button
          className="gap-2 bg-slate-900 hover:bg-slate-800"
          onClick={() => setShowNewEventForm(true)}
        >
          <Plus className="w-4 h-4" />
          New Event
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Attendance</p>
              <p className="text-xl font-bold text-gray-900">
                {events.length > 0
                  ? Math.round(events.reduce((sum, e) => sum + e.presentCount, 0) / events.length)
                  : '--'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-xl font-bold text-gray-900">
                {events.filter(e => {
                  const eventDate = new Date(e.date)
                  const now = new Date()
                  return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()
                }).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Absences</p>
              <p className="text-xl font-bold text-gray-900">
                {events.reduce((sum, e) => sum + e.absentCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New Event Form */}
      {showNewEventForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Event</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <Input
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                placeholder="e.g., Sunday Service"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <Input
                type="datetime-local"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
              >
                <option value="Service">Service</option>
                <option value="Retreat">Retreat</option>
                <option value="Meeting">Meeting</option>
                <option value="Outreach">Outreach</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <Input
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Meet URL (Optional)</label>
              <Input
                value={newEvent.meetingUrl}
                onChange={(e) => setNewEvent({ ...newEvent, meetingUrl: e.target.value })}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
              <p className="text-xs text-gray-400 mt-1">For online meetings (Friday Vigil, Sunday Bible Studies)</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleCreateEvent} disabled={isCreating || !newEvent.name}>
              {isCreating ? 'Creating...' : 'Create Event'}
            </Button>
            <Button variant="outline" onClick={() => setShowNewEventForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Events List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Events</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No events yet. Create your first event!</p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedEvent?.id === event.id ? 'bg-blue-50 border-l-4 border-l-agape-blue' : ''}`}
                  onClick={() => handleViewEvent(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{event.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                          {event.type}
                        </span>
                        {event.meetingUrl && (
                          <span className="text-blue-600" title="Online Meeting">
                            <Video className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-green-600 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {event.presentCount}
                        </span>
                        <span className="text-red-600 flex items-center gap-1">
                          <UserX className="w-3 h-3" />
                          {event.absentCount}
                        </span>
                        <span className="text-yellow-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {event.excusedCount}
                        </span>
                        {event.meetingUrl && (
                          <a
                            href={event.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Join
                          </a>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance Panel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {selectedEvent ? `Attendance - ${selectedEvent.name}` : 'Select an Event'}
            </h2>
            {selectedEvent && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!selectedEvent ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Select an event to manage attendance</p>
            </div>
          ) : loadingAttendance ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-agape-blue rounded-full mx-auto mb-3" />
              <p>Loading members...</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              {selectedMemberIds.length > 0 && (
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedMemberIds.length} selected</span>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleBulkMark('Present')}>
                    <Check className="w-3 h-3 mr-1" /> Present
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleBulkMark('Absent')}>
                    <X className="w-3 h-3 mr-1" /> Absent
                  </Button>
                  <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-200 hover:bg-yellow-50" onClick={() => handleBulkMark('Excused')}>
                    <AlertCircle className="w-3 h-3 mr-1" /> Excused
                  </Button>
                </div>
              )}

              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {/* Select All */}
                <div className="p-3 bg-gray-50 flex items-center gap-3">
                  <Checkbox
                    checked={eventMembers.length > 0 && selectedMemberIds.length === eventMembers.length}
                    onCheckedChange={toggleAllMembers}
                  />
                  <span className="text-sm font-medium text-gray-600">Select All ({eventMembers.length} members)</span>
                </div>

                {eventMembers.map((member) => (
                  <div key={member.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedMemberIds.includes(member.id)}
                        onCheckedChange={() => toggleMemberSelect(member.id)}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={member.attendanceStatus === 'Present' ? 'default' : 'outline'}
                        size="sm"
                        className={member.attendanceStatus === 'Present' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-200 hover:bg-green-50'}
                        onClick={() => handleMarkAttendance(member.id, 'Present')}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={member.attendanceStatus === 'Absent' ? 'default' : 'outline'}
                        size="sm"
                        className={member.attendanceStatus === 'Absent' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}
                        onClick={() => handleMarkAttendance(member.id, 'Absent')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={member.attendanceStatus === 'Excused' ? 'default' : 'outline'}
                        size="sm"
                        className={member.attendanceStatus === 'Excused' ? 'bg-yellow-600 hover:bg-yellow-700' : 'text-yellow-600 border-yellow-200 hover:bg-yellow-50'}
                        onClick={() => handleMarkAttendance(member.id, 'Excused')}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
