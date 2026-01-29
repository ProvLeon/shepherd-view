import { useState } from 'react'
import { Mail, Phone, Tent, User, MapPin, UserCheck, MessageCircle, Cake, Edit2, Save, X, Briefcase } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from './ui/sheet'
import { updateMember } from '../server/members'

interface Member {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    role: string
    status: string
    campus: string | null
    category?: string | null
    joinDate: string | null
    birthday?: string | null
    campName: string | null
}

interface MemberDetailsSheetProps {
    member: Member | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onMemberUpdated?: () => void
}

export function MemberDetailsSheet({ member, open, onOpenChange, onMemberUpdated }: MemberDetailsSheetProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editData, setEditData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'Member' as string,
        campus: 'CoHK' as string,
        category: 'Student' as string,
        status: 'Active' as string,
        birthday: ''
    })

    if (!member) return null

    const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()

    const startEditing = () => {
        setEditData({
            firstName: member.firstName || '',
            lastName: member.lastName || '',
            email: member.email || '',
            phone: member.phone || '',
            role: member.role || 'Member',
            campus: member.campus || 'CoHK',
            category: member.category || 'Student',
            status: member.status || 'Active',
            birthday: member.birthday || ''
        })
        setIsEditing(true)
    }

    const cancelEditing = () => {
        setIsEditing(false)
    }

    const saveChanges = async () => {
        setIsSaving(true)
        try {
            const result = await updateMember({
                data: {
                    id: member.id,
                    ...editData
                }
            })
            if (result.success) {
                setIsEditing(false)
                onMemberUpdated?.()
            } else {
                alert('Failed to save: ' + result.message)
            }
        } finally {
            setIsSaving(false)
        }
    }

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'Leader':
                return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'Shepherd':
                return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'New Convert':
                return 'bg-green-100 text-green-700 border-green-200'
            case 'Guest':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    return (
        <Sheet open={open} onOpenChange={(newOpen) => {
            if (!newOpen) setIsEditing(false)
            onOpenChange(newOpen)
        }}>
            <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader className="pb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-linear-to-br from-agape-blue to-agape-purple flex items-center justify-center text-white text-xl font-bold shadow-lg">
                            {initials}
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <Input
                                        value={editData.firstName}
                                        onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                        placeholder="First Name"
                                        className="font-semibold"
                                    />
                                    <Input
                                        value={editData.lastName}
                                        onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                        placeholder="Last Name"
                                    />
                                </div>
                            ) : (
                                <>
                                    <SheetTitle className="text-xl">
                                        {member.firstName} {member.lastName}
                                    </SheetTitle>
                                    <SheetDescription className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getRoleBadgeClass(member.role)}`}>
                                            {member.role}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 text-xs ${member.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${member.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            {member.status}
                                        </span>
                                    </SheetDescription>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Edit/Save Buttons */}
                    <div className="flex gap-2 mt-4">
                        {isEditing ? (
                            <>
                                <Button onClick={saveChanges} disabled={isSaving} size="sm" className="gap-1">
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button onClick={cancelEditing} variant="outline" size="sm" className="gap-1">
                                    <X className="w-4 h-4" />
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button onClick={startEditing} variant="outline" size="sm" className="gap-1">
                                <Edit2 className="w-4 h-4" />
                                Edit Member
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Contact Information
                        </h3>
                        <div className="space-y-3 pl-6">
                            {isEditing ? (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Email</label>
                                        <Input
                                            type="email"
                                            value={editData.email}
                                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Phone</label>
                                        <Input
                                            value={editData.phone}
                                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                            placeholder="0557123456"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {member.email ? (
                                            <a href={`mailto:${member.email}`} className="text-agape-blue hover:underline">
                                                {member.email}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 italic">No email</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {member.phone ? (
                                            <a href={`tel:${member.phone}`} className="text-agape-blue hover:underline">
                                                {member.phone}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 italic">No phone</span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Ministry Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Tent className="w-4 h-4" />
                            Ministry Details
                        </h3>
                        <div className="space-y-3 pl-6">
                            {isEditing ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Role</label>
                                            <select
                                                value={editData.role}
                                                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
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
                                            <label className="text-xs text-gray-500 block mb-1">Status</label>
                                            <select
                                                value={editData.status}
                                                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="Archived">Archived</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Category</label>
                                        <select
                                            value={editData.category}
                                            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
                                        >
                                            <option value="Student">Student</option>
                                            <option value="Workforce">Workforce</option>
                                            <option value="NSS">NSS</option>
                                            <option value="Alumni">Alumni</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Campus</label>
                                        <select
                                            value={editData.campus}
                                            onChange={(e) => setEditData({ ...editData, campus: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-agape-blue/20"
                                        >
                                            <option value="CoHK">CoHK</option>
                                            <option value="KNUST">KNUST</option>
                                            <option value="Legon">Legon</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Birthday</label>
                                        <Input
                                            type="date"
                                            value={editData.birthday}
                                            onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <Briefcase className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-700">{member.category || 'Student'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-700">{member.campus === 'CoHK' ? 'CoHK' : (member.campus || 'Unknown Campus')}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Tent className="w-4 h-4 text-gray-400" />
                                        <span>
                                            {member.campName ? (
                                                <span className="font-medium text-gray-700">⛺️ {member.campName}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">No Camp Assigned</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <UserCheck className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-700">
                                            Joined: {member.joinDate ? new Date(member.joinDate).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'Unknown'}
                                        </span>
                                    </div>
                                    {member.birthday && (
                                        <div className="flex items-center gap-3">
                                            <Cake className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-700">
                                                Birthday: {new Date(member.birthday).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions - Only show when not editing */}
                    {!isEditing && (
                        <div className="pt-4 space-y-3 border-t border-gray-100">
                            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                            <div className="flex flex-wrap gap-2">
                                {member.phone && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={`tel:${member.phone}`}>
                                            <Phone className="w-4 h-4 mr-2" />
                                            Call
                                        </a>
                                    </Button>
                                )}
                                {member.email && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={`mailto:${member.email}`}>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Email
                                        </a>
                                    </Button>
                                )}
                                {member.phone && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={`https://wa.me/233${member.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer">
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            WhatsApp
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
