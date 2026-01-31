import { createFileRoute } from '@tanstack/react-router'
import { Search, Filter, Plus, Phone, Mail, MoreHorizontal, X, UserPlus } from 'lucide-react'
import { getMembers, deleteMembers, createMember } from '../../server/members'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MemberDetailsSheet } from '@/components/MemberDetailsSheet'
import { MembersTableSkeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/members/')({
    component: MembersList,
    loader: () => getMembers(),
    pendingComponent: MembersTableSkeleton,
})

interface Member {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    role: string
    status: string
    campus: string | null
    joinDate: string | null
    birthday?: string | null
    campName: string | null
    residence?: string | null
    guardian?: string | null
    region?: string | null
    guardianContact?: string | null
    guardianLocation?: string | null
}



function MembersList() {
    const members = Route.useLoaderData() as Member[]
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [sheetOpen, setSheetOpen] = useState(false)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Add Member Modal State
    const [showAddMember, setShowAddMember] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newMember, setNewMember] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'Member' as const,
        campus: 'CoHK' as const,
        birthday: ''
    })

    // Filter State
    const [showFilters, setShowFilters] = useState(false)
    const [roleFilter, setRoleFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')

    // Reset page when filters change
    useState(() => {
        setCurrentPage(1)
    })

    // Filter members by search query and filters
    const filteredMembers = members.filter(member => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesSearch = (
                member.firstName.toLowerCase().includes(query) ||
                member.lastName.toLowerCase().includes(query) ||
                member.email?.toLowerCase().includes(query) ||
                member.phone?.includes(query) ||
                member.campName?.toLowerCase().includes(query)
            )
            if (!matchesSearch) return false
        }

        // Role filter
        if (roleFilter && member.role !== roleFilter) return false

        // Status filter
        if (statusFilter && member.status !== statusFilter) return false

        return true
    })

    // Pagination Logic
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentMembers = filteredMembers.slice(startIndex, endIndex)

    // Toggle Select All
    const toggleAll = () => {
        if (selectedIds.length === currentMembers.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(currentMembers.map(m => m.id))
        }
    }

    // Toggle Single
    const toggleOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} members?`)) return;

        await deleteMembers({ data: { ids: selectedIds } });
        setSelectedIds([]);
        router.invalidate(); // Refresh data
    }

    const openMemberDetails = (member: Member) => {
        setSelectedMember(member)
        setSheetOpen(true)
    }

    const handleAddMember = async () => {
        if (!newMember.firstName || !newMember.lastName) return
        setIsCreating(true)
        try {
            await createMember({ data: newMember })
            setShowAddMember(false)
            setNewMember({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                role: 'Member',
                campus: 'CoHK',
                birthday: ''
            })
            router.invalidate()
        } finally {
            setIsCreating(false)
        }
    }

    const clearFilters = () => {
        setRoleFilter('')
        setStatusFilter('')
        setShowFilters(false)
    }

    const activeFiltersCount = [roleFilter, statusFilter].filter(Boolean).length

    return (
        <div className="space-y-6">
            {/* Member Details Sheet */}
            <MemberDetailsSheet
                member={selectedMember}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onMemberUpdated={() => router.invalidate()}
            />

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-agape-blue" />
                                Add New Member
                            </h2>
                            <button onClick={() => setShowAddMember(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                <Input
                                    value={newMember.firstName}
                                    onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                                    placeholder="Enter first name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                <Input
                                    value={newMember.lastName}
                                    onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                                    placeholder="Enter last name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <Input
                                    value={newMember.phone}
                                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                                    placeholder="e.g., 0557123456"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <Input
                                    type="email"
                                    value={newMember.email}
                                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={newMember.role}
                                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
                                >
                                    <option value="Member">Member</option>
                                    <option value="New Convert">New Convert</option>
                                    <option value="Shepherd">Shepherd</option>
                                    <option value="Leader">Leader</option>
                                    <option value="Guest">Guest</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                                <select
                                    value={newMember.campus}
                                    onChange={(e) => setNewMember({ ...newMember, campus: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
                                >
                                    <option value="CoHK">City of Hong Kong</option>
                                    <option value="KNUST">KNUST</option>
                                    <option value="Legon">Legon</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                                <Input
                                    type="date"
                                    value={newMember.birthday}
                                    onChange={(e) => setNewMember({ ...newMember, birthday: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button onClick={handleAddMember} disabled={isCreating || !newMember.firstName || !newMember.lastName} className="flex-1">
                                {isCreating ? 'Adding...' : 'Add Member'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowAddMember(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Members</h1>
                    <p className="text-slate-500 text-sm">Manage {members.length} members across your camps.</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.length})
                        </Button>
                    )}
                    <Button className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={() => setShowAddMember(true)}>
                        <Plus className="w-4 h-4" />
                        Add Member
                    </Button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, or camp..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1) // Reset to page 1 on search
                        }}
                        className="pl-9 bg-white"
                    />
                </div>
                <Button
                    variant="outline"
                    className={`gap-2 bg-white ${activeFiltersCount > 0 ? 'border-agape-blue text-agape-blue' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4" />
                    Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">Filter Members</h3>
                        {activeFiltersCount > 0 && (
                            <button onClick={clearFilters} className="text-sm text-agape-blue hover:underline">
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
                            >
                                <option value="">All Roles</option>
                                <option value="Member">Member</option>
                                <option value="New Convert">New Convert</option>
                                <option value="Shepherd">Shepherd</option>
                                <option value="Leader">Leader</option>
                                <option value="Guest">Guest</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
                            >
                                <option value="">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Archived">Archived</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={currentMembers.length > 0 && selectedIds.length === currentMembers.length}
                                    onCheckedChange={toggleAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Camp</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMembers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    {searchQuery || activeFiltersCount > 0 ? 'No members match your criteria.' : 'No members found.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentMembers.map((member) => (
                                <TableRow
                                    key={member.id}
                                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                    onClick={(e) => {
                                        // Don't open sheet if clicking checkbox or actions
                                        if ((e.target as HTMLElement).closest('button, input, a, [role="menuitem"]')) return
                                        openMemberDetails(member)
                                    }}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.includes(member.id)}
                                            onCheckedChange={() => toggleOne(member.id)}
                                            aria-label={`Select ${member.firstName}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {member.profilePicture ? (
                                                <img
                                                    src={member.profilePicture}
                                                    alt={`${member.firstName} ${member.lastName}`}
                                                    className="h-9 w-9 rounded-full object-cover shadow-sm"
                                                />
                                            ) : (
                                                <div className="h-9 w-9 rounded-full bg-linear-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-semibold text-white shadow-sm">
                                                    {member.firstName?.[0]}{member.lastName?.[0]}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {member.firstName} {member.lastName}
                                                </div>
                                                {member.phone && (
                                                    <div className="text-xs text-slate-500">{member.phone}</div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
                                            ${member.role === 'Leader'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : member.role === 'Shepherd'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : member.role === 'New Convert'
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }
                                        `}>
                                            {member.role}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {member.campName ? (
                                            <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                                                ⛺️ {member.campName}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs uppercase tracking-wider">No Camp</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <div className={`h-1.5 w-1.5 rounded-full ${member.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            {member.status}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            {member.phone && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    asChild
                                                >
                                                    <a href={`tel:${member.phone}`} title="Call">
                                                        <Phone className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                            {member.email && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    asChild
                                                >
                                                    <a href={`mailto:${member.email}`} title="Email">
                                                        <Mail className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="z-50">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => openMemberDetails(member)}>
                                                        View details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.id)}>
                                                        Copy ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={async () => {
                                                            if (!confirm('Delete this member?')) return;
                                                            await deleteMembers({ data: { ids: [member.id] } });
                                                            router.invalidate();
                                                        }}
                                                    >
                                                        Delete member
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {filteredMembers.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredMembers.length)} of {filteredMembers.length} members
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
