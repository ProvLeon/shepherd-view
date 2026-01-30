import { createFileRoute } from '@tanstack/react-router'
import { getMembersByCategory } from '@/server/members'
import { useState } from 'react'
import { MemberDetailsSheet } from '@/components/MemberDetailsSheet'
import { ArrowLeft, Phone, MapPin, Briefcase, Search, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/campuses/category/$categoryId')({
  component: CategoryDetailsPage,
  loader: async ({ params }) => {
    return {
      categoryId: params.categoryId,
      members: await getMembersByCategory({ data: { category: params.categoryId } })
    }
  }
})

function CategoryDetailsPage() {
  const { categoryId, members } = Route.useLoaderData()
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleMemberClick = (member: any) => {
    setSelectedMember(member)
    setIsSheetOpen(true)
  }

  const refreshMembers = () => {
    window.location.reload()
  }

  // Reset page when search term changes
  useState(() => {
    setCurrentPage(1)
  })

  const filteredMembers = members.filter((member: any) => {
    const query = searchQuery.toLowerCase()
    return (
      member.firstName?.toLowerCase().includes(query) ||
      member.lastName?.toLowerCase().includes(query) ||
      member.phone?.includes(query)
    )
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMembers = filteredMembers.slice(startIndex, endIndex)

  const getCategoryColor = (id: string) => {
    if (id === 'Workforce') return 'text-orange-600 bg-orange-50'
    if (id === 'NSS') return 'text-indigo-600 bg-indigo-50'
    if (id === 'Alumni') return 'text-slate-600 bg-slate-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link
          to="/campuses"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${getCategoryColor(categoryId)}`}>
              <Briefcase className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {categoryId} Group
              </h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {members.length} Members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No members found</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery ? `No matches for "${searchQuery}"` : `No members are currently in the ${categoryId} category.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="bg-gray-50/50 px-6 py-3 grid grid-cols-12 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-12 md:col-span-5">Member</div>
              <div className="col-span-0 md:col-span-3 hidden md:block">Campus</div>
              <div className="col-span-0 md:col-span-2 hidden md:block">Status</div>
              <div className="col-span-0 md:col-span-2 hidden md:block text-right">Action</div>
            </div>

            {currentMembers.map((member: any) => (
              <div
                key={member.id}
                onClick={() => handleMemberClick(member)}
                className="px-6 py-4 hover:bg-orange-50/30 cursor-pointer transition-all group grid grid-cols-12 items-center"
              >
                {/* Member Info */}
                <div className="col-span-12 md:col-span-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                    {member.firstName?.[0]}{member.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-agape-blue transition-colors">
                      {member.firstName} {member.lastName}
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Campus */}
                <div className="col-span-0 md:col-span-3 hidden md:block">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {member.campus === 'CoHK' ? 'CoHK' : (member.campus || 'Unknown')}
                    </span>
                    {member.phone && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {member.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-0 md:col-span-2 hidden md:block">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${member.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                    member.status === 'Inactive' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${member.status === 'Active' ? 'bg-green-500' :
                      member.status === 'Inactive' ? 'bg-gray-400' :
                        'bg-yellow-500'
                      }`} />
                    {member.status}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-0 md:col-span-2 hidden md:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="text-agape-blue hover:text-agape-blue hover:bg-blue-50">
                    View Details
                  </Button>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {filteredMembers.length > 0 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 bg-gray-50/30">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of {filteredMembers.length} members
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(p => Math.max(1, p - 1))
                    }}
                    className="bg-white"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(p => Math.min(totalPages, p + 1))
                    }}
                    className="bg-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <MemberDetailsSheet
        member={selectedMember}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onMemberUpdated={refreshMembers}
      />
    </div>
  )
}
