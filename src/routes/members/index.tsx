import { createFileRoute, Link } from '@tanstack/react-router'
import { Search, Filter, Plus, Phone, Mail, MoreHorizontal } from 'lucide-react'
import { getMembers } from '../../server/members'

export const Route = createFileRoute('/members/')({
    component: MembersList,
    loader: () => getMembers(),
})

import { deleteMembers } from '../../server/members'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

// ... Route ...

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Checkbox } from '../../components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"

function MembersList() {
    const members = Route.useLoaderData()
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // Toggle Select All
    const toggleAll = () => {
        if (selectedIds.length === members.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(members.map(m => m.id))
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

    return (
        <div className="space-y-6">
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
                    <Button className="gap-2 bg-slate-900 hover:bg-slate-800">
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
                        placeholder="Filter members..."
                        className="pl-9 bg-white"
                    />
                </div>
                <Button variant="outline" className="gap-2 bg-white">
                    <Filter className="w-4 h-4" />
                    Filters
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={members.length > 0 && selectedIds.length === members.length}
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
                        {members.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    No members found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            members.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(member.id)}
                                            onCheckedChange={() => toggleOne(member.id)}
                                            aria-label={`Select ${member.firstName}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                                                {member.firstName?.[0]}{member.lastName?.[0]}
                                            </div>
                                            <div className="font-medium text-slate-900">
                                                {member.firstName} {member.lastName}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
                                            ${member.role === 'Leader'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : member.role === 'Shepherd'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
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
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.id)}>
                                                    Copy ID
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>View details</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600">Delete member</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {members.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        {members.length} members total
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" disabled>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
