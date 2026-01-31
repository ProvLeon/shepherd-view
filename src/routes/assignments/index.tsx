import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Users, UserPlus, X, Search, ChevronRight, Check, UserCog, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  getShepherdMembers,
  assignMembersToShepherd,
  removeMemberFromShepherd,
  getLeaderCampuses,
  updateLeaderCampuses,
  getAvailableMembers,
  getShepherds,
  getLeaders
} from '@/server/assignments'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/assignments/')({
  component: AssignmentsPage,
  loader: async () => {
    try {
      const [shepherds, leaders, members] = await Promise.all([
        getShepherds(),
        getLeaders(),
        getAvailableMembers()
      ])
      return { shepherds, leaders, members }
    } catch (err) {
      console.error(err)
      return { shepherds: [], leaders: [], members: [] }
    }
  },
  errorComponent: () => <div className="p-8 text-center text-red-600">Failed to load assignments data.</div>
})

function AssignmentsPage() {
  const { shepherds, leaders, members } = Route.useLoaderData()
  const router = useRouter()
  const { role: userRole } = useAuth()
  // Admin or Leader can access, but Leaders might only see the Shepherd tab?
  // Let's assume Leaders can manage Shepherds too.
  const isAdmin = userRole === 'Admin'

  const [activeTab, setActiveTab] = useState<'shepherds' | 'leaders'>('shepherds')

  // Shepherd State
  const [selectedShepherd, setSelectedShepherd] = useState<any>(null)
  const [loadingShepherdData, setLoadingShepherdData] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Confirm Unassign State
  const [unassignMemberId, setUnassignMemberId] = useState<string | null>(null)

  // Leader State
  const [expandedLeader, setExpandedLeader] = useState<string | null>(null)
  const [leaderCampuses, setLeaderCampuses] = useState<Record<string, string[]>>({})
  const [loadingCampuses, setLoadingCampuses] = useState(false)

  // --- Shepherd Actions ---

  const handleShepherdClick = async (shepherd: any) => {
    setLoadingShepherdData(true)
    try {
      const assigned = await getShepherdMembers({ data: { shepherdId: shepherd.id } })
      setSelectedShepherd({ ...shepherd, assignedMembers: assigned })
    } catch (error) {
      toast.error("Failed to fetch assigned members")
    } finally {
      setLoadingShepherdData(false)
    }
  }

  const handleAssignMembers = async () => {
    if (!selectedShepherd || selectedMemberIds.length === 0) return
    setIsSubmitting(true)
    try {
      const result = await assignMembersToShepherd({
        data: {
          shepherdId: selectedShepherd.id,
          memberIds: selectedMemberIds
        }
      })

      if (result.success) {
        toast.success(result.message)
        // Refresh
        const assigned = await getShepherdMembers({ data: { shepherdId: selectedShepherd.id } })
        setSelectedShepherd({ ...selectedShepherd, assignedMembers: assigned })
        setShowAssignModal(false)
        setSelectedMemberIds([])
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error("Failed to assign members")
    } finally {
      setIsSubmitting(false)
      router.invalidate() // Refresh basic data
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedShepherd || !unassignMemberId) return
    try {
      await removeMemberFromShepherd({
        data: { shepherdId: selectedShepherd.id, memberId: unassignMemberId }
      })
      toast.success("Member unassigned")

      const assigned = await getShepherdMembers({ data: { shepherdId: selectedShepherd.id } })
      setSelectedShepherd({ ...selectedShepherd, assignedMembers: assigned })
    } catch (err) {
      toast.error("Failed to unassign member")
    } finally {
      setUnassignMemberId(null)
      router.invalidate()
    }
  }

  // --- Leader Actions ---

  const toggleCampus = async (leaderId: string, campus: string, currentCampuses: string[]) => {
    const newCampuses = currentCampuses.includes(campus)
      ? currentCampuses.filter(c => c !== campus)
      : [...currentCampuses, campus]

    // Optimistic update
    setLeaderCampuses(prev => ({ ...prev, [leaderId]: newCampuses }))

    try {
      await updateLeaderCampuses({ data: { leaderId, campuses: newCampuses } })
      toast.success("Campus assignments updated")
      router.invalidate()
    } catch (err) {
      toast.error("Failed to update assignments")
      // Revert on error? For now simple toast.
    }
  }

  const loadLeaderCampuses = async (leaderId: string) => {
    if (expandedLeader === leaderId) {
      setExpandedLeader(null)
      return
    }
    setLoadingCampuses(true)
    try {
      const campuses = await getLeaderCampuses({ data: { leaderId } })
      setLeaderCampuses(prev => ({ ...prev, [leaderId]: campuses }))
      setExpandedLeader(leaderId)
    } catch (err) {
      toast.error("Failed to fetch campuses")
    } finally {
      setLoadingCampuses(false)
    }
  }

  // Filter available members logic
  const filteredMembers = members.filter(m =>
    (m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    !selectedShepherd?.assignedMembers?.some((am: any) => am.id === m.id)
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-500">Manage your team structure and responsibilities.</p>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'shepherds' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('shepherds')}
        >
          <Users className="w-4 h-4" />
          Shepherd Assignments
        </button>
        {isAdmin && (
          <button
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'leaders' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('leaders')}
          >
            <UserCog className="w-4 h-4" />
            Leader Assignments
          </button>
        )}
      </div>

      {activeTab === 'shepherds' ? (
        <div className="grid lg:grid-cols-3 gap-6 h-[70vh]">
          {/* Shepherd List Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Shepherds</h2>
              <p className="text-xs text-gray-500">Select to view members</p>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {shepherds.map((shepherd: any) => (
                <div
                  key={shepherd.id}
                  onClick={() => handleShepherdClick(shepherd)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between group ${selectedShepherd?.id === shepherd.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : 'border-l-4 border-l-transparent'}`}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedShepherd?.id === shepherd.id ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {shepherd.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">{shepherd.email.split('@')[0]}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{shepherd.email}</p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selectedShepherd?.id === shepherd.id ? 'text-purple-600 translate-x-1' : ''}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Members Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col relative">
            {loadingShepherdData && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            )}

            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                {selectedShepherd ? (
                  <>
                    <span className="text-purple-600">{selectedShepherd.email.split('@')[0]}</span>'s Flock
                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                      {selectedShepherd.assignedMembers?.length || 0}
                    </span>
                  </>
                ) : 'Member Details'}
              </h2>
              {selectedShepherd && (
                <Button size="sm" onClick={() => setShowAssignModal(true)} className="gap-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-xs">
                  <UserPlus className="w-4 h-4 text-purple-600" />
                  Assign Members
                </Button>
              )}
            </div>

            {!selectedShepherd ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <Users className="w-16 h-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Shepherd Selected</h3>
                <p>Select a shepherd from the list on the left to specific manage their flock.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {selectedShepherd.assignedMembers?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="p-4 bg-gray-50 rounded-full mb-3">
                      <Users className="w-8 h-8 text-gray-300" />
                    </div>
                    <p>No members assigned yet.</p>
                    <Button variant="link" onClick={() => setShowAssignModal(true)} className="text-purple-600">Assign the first member</Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {selectedShepherd.assignedMembers?.map((member: any) => (
                      <div key={member.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center group hover:border-purple-200 hover:shadow-sm transition-all bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{member.firstName} {member.lastName}</p>
                            <p className="text-xs text-gray-500">{member.role} • {member.campName || 'No Camp'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setUnassignMemberId(member.id)} // Trigger modal
                          className="p-1.5 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                          title="Unassign"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Leaders Tab */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grids divide-y divide-gray-100">
            {leaders.map((leader: any) => {
              const isExpanded = expandedLeader === leader.id
              const campuses = leaderCampuses[leader.id] || []

              return (
                <div key={leader.id} className="p-6 transition-colors hover:bg-gray-50">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => loadLeaderCampuses(leader.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {leader.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{leader.email}</p>
                        <div className="flex gap-2 mt-1">
                          {isExpanded && loadingCampuses ? (
                            <span className="text-xs text-gray-500 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Loading...</span>
                          ) : (
                            (leaderCampuses[leader.id] || []).length > 0 ? (
                              (leaderCampuses[leader.id] || []).map(c => (
                                <span key={c} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">{c}</span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">No campuses assigned</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant={isExpanded ? "secondary" : "outline"}>
                      {isExpanded ? 'Done' : 'Manage Campuses'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 ml-16 p-4 bg-gray-50/50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Assign Campuses</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {['CoHK', 'KNUST', 'Legon', 'Other'].map(campus => {
                          const isAssigned = campuses.includes(campus)
                          return (
                            <div
                              key={campus}
                              onClick={() => toggleCampus(leader.id, campus, campuses)}
                              className={`
                                                                cursor-pointer p-4 rounded-xl border flex items-center justify-between transition-all group
                                                                ${isAssigned
                                  ? 'bg-white border-purple-500 shadow-sm ring-1 ring-purple-500'
                                  : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-xs'}
                                                            `}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isAssigned ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 group-hover:bg-purple-50'}`}>
                                  <Loader2 className="w-4 h-4 hidden" /> {/* Just for spacing consistency if needed later */}
                                  <Check className={`w-4 h-4 ${isAssigned ? 'opacity-100' : 'opacity-0'}`} />
                                </div>
                                <span className={`font-medium ${isAssigned ? 'text-purple-700' : 'text-gray-600'}`}>{campus}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assign Member Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
          <div className="p-6 border-b border-gray-100 pb-4">
            <DialogHeader>
              <DialogTitle>Assign Members</DialogTitle>
              <DialogDescription>
                Add members to {selectedShepherd?.email}'s flock.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No matching members found.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedMemberIds.includes(member.id) ? 'bg-purple-50 border border-purple-100' : 'hover:bg-gray-50 border border-transparent'}`}
                    onClick={() => {
                      if (selectedMemberIds.includes(member.id)) {
                        setSelectedMemberIds(ids => ids.filter(id => id !== member.id))
                      } else {
                        setSelectedMemberIds(ids => [...ids, member.id])
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedMemberIds.includes(member.id)}
                      onCheckedChange={() => { }} // Handled by parent click
                    />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-gray-500">{member.role} • {member.campName || 'No Camp'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button
              onClick={handleAssignMembers}
              disabled={selectedMemberIds.length === 0 || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Assigning...</>
              ) : (
                `Assign ${selectedMemberIds.length} Members`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <Dialog open={!!unassignMemberId} onOpenChange={(open) => !open && setUnassignMemberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unassign Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the shepherd's flock?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassignMemberId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember}>Unassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
