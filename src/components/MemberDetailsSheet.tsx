import { useState } from 'react'
import { Mail, Phone, Tent, User, MapPin, UserCheck, MessageCircle, Cake, Edit2, Save, X, Briefcase, Home, HeartHandshake, History, LayoutDashboard } from 'lucide-react'
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
import { MemberFollowUps } from './MemberFollowUps'

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
    residence?: string | null
    guardian?: string | null
    region?: string | null
    guardianContact?: string | null
    guardianLocation?: string | null
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
        birthday: '',
        residence: '',
        guardian: '',
        region: '',
        guardianContact: '',
        guardianLocation: ''
    })

    const [activeTab, setActiveTab] = useState<'details' | 'followups'>('details')

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
            birthday: member.birthday || '',
            residence: member.residence || '',
            guardian: member.guardian || '',
            region: member.region || '',
            guardianContact: member.guardianContact || '',
            guardianLocation: member.guardianLocation || ''
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

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Leader':
                return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'Shepherd':
                return 'bg-blue-100 text-blue-700 border-blue-200'
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    return (
        <Sheet open={open} onOpenChange={(newOpen) => {
            if (!newOpen) {
                setIsEditing(false)
                setActiveTab('details')
            }
            onOpenChange(newOpen)
        }}>
            <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-md p-0 border-l border-gray-200 shadow-2xl bg-gray-50">
                {/* Header - Stays sticky */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="-ml-2 text-gray-400 hover:text-gray-900" onClick={() => onOpenChange(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                            <span className="font-semibold text-gray-900">Member Details</span>
                        </div>
                        {!isEditing && (
                            <Button onClick={startEditing} variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium h-8">
                                <Edit2 className="w-4 h-4 mr-1.5" />
                                Edit
                            </Button>
                        )}
                        {isEditing && (
                            <div className="flex items-center gap-2">
                                <Button onClick={cancelEditing} variant="ghost" size="sm" className="h-8">Cancel</Button>
                                <Button onClick={saveChanges} size="sm" disabled={isSaving} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Profile Summary */}
                    <div className="px-6 pb-6">
                        <div className="flex items-start gap-5">
                            <div className="relative shrink-0">
                                <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white">
                                    {initials}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-[3px] border-white flex items-center justify-center ${member.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`} title={`Status: ${member.status}`}>
                                    {member.status === 'Active' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                            </div>

                            <div className="flex-1 space-y-1 pt-1">
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={editData.firstName}
                                            onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                            placeholder="First"
                                            className="h-9 font-semibold"
                                        />
                                        <Input
                                            value={editData.lastName}
                                            onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                            placeholder="Last"
                                            className="h-9 font-semibold"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{member.firstName} {member.lastName}</h2>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}>
                                                {member.role}
                                            </span>
                                            {member.category && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                    {member.category}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions (Call/Text) */}
                        {!isEditing && (
                            <div className="flex gap-3 mt-6">
                                {member.phone ? (
                                    <>
                                        <Button className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm h-9" asChild>
                                            <a href={`tel:${member.phone}`}>
                                                <Phone className="w-4 h-4 mr-2 text-gray-500" />
                                                Call
                                            </a>
                                        </Button>
                                        <Button className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm h-9" asChild>
                                            <a href={`https://wa.me/233${member.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer">
                                                <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                                                WhatsApp
                                            </a>
                                        </Button>
                                    </>
                                ) : (
                                    <Button disabled className="flex-1 bg-gray-50 text-gray-400 border border-gray-100 shadow-none">
                                        No Contact Info
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center px-6 border-t border-gray-100">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('followups')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'followups' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            History & Notes
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="p-6">
                    {activeTab === 'details' ? (
                        <div className="space-y-6">

                            {/* Personal Info Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-blue-600" />
                                        Personal & Contact
                                    </h3>
                                </div>
                                <div className="p-5 grid gap-4">
                                    {isEditing ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Email</label>
                                                    <Input value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} className="h-8" placeholder="Email" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Phone</label>
                                                    <Input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="h-8" placeholder="Phone" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Residence</label>
                                                <Input value={editData.residence} onChange={e => setEditData({ ...editData, residence: e.target.value })} className="h-8" placeholder="Residence Address" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Region</label>
                                                <Input value={editData.region} onChange={e => setEditData({ ...editData, region: e.target.value })} className="h-8" placeholder="Region" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Birthday</label>
                                                <Input type="date" value={editData.birthday} onChange={e => setEditData({ ...editData, birthday: e.target.value })} className="h-8" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-medium text-gray-400 uppercase">Phone</p>
                                                    <p className="text-sm font-medium text-gray-900 truncate">{member.phone || '—'}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-medium text-gray-400 uppercase">Email</p>
                                                    <p className="text-sm font-medium text-gray-900 truncate" title={member.email || ''}>{member.email || '—'}</p>
                                                </div>
                                                <div className="col-span-2 space-y-0.5">
                                                    <p className="text-[10px] font-medium text-gray-400 uppercase">Residence</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-900">{member.residence || 'No residential address set'}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-medium text-gray-400 uppercase">Region</p>
                                                    <p className="text-sm font-medium text-gray-900">{member.region || '—'}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-medium text-gray-400 uppercase">Birthday</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <Cake className="w-3.5 h-3.5 text-rose-400" />
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {member.birthday ? new Date(member.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Ministry Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                                        Ministry
                                    </h3>
                                </div>
                                <div className="p-5">
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Role</label>
                                                <select value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} className="w-full h-8 text-sm border-gray-300 rounded px-2">
                                                    <option>Member</option>
                                                    <option>Leader</option>
                                                    <option>Shepherd</option>
                                                    <option>New Convert</option>
                                                    <option>Guest</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
                                                <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} className="w-full h-8 text-sm border-gray-300 rounded px-2">
                                                    <option>Student</option>
                                                    <option>Workforce</option>
                                                    <option>NSS</option>
                                                    <option>Alumni</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Status</label>
                                                <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} className="w-full h-8 text-sm border-gray-300 rounded px-2">
                                                    <option>Active</option>
                                                    <option>Inactive</option>
                                                    <option>Archived</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Campus</label>
                                                <select value={editData.campus} onChange={e => setEditData({ ...editData, campus: e.target.value })} className="w-full h-8 text-sm border-gray-300 rounded px-2">
                                                    <option>CoHK</option>
                                                    <option>KNUST</option>
                                                    <option>Legon</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-y-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-gray-400 uppercase">Assigned Camp</p>
                                                <div className="flex items-center gap-1.5">
                                                    <Tent className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm font-medium text-gray-900">{member.campName || 'Unassigned'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-gray-400 uppercase">Campus</p>
                                                <span className="text-sm font-medium text-gray-900">{member.campus || 'CoHK'}</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-medium text-gray-400 uppercase">Date Joined</p>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Guardian Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                                        Guardian Details
                                    </h3>
                                </div>
                                <div className="p-5">
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
                                                <Input value={editData.guardian} onChange={e => setEditData({ ...editData, guardian: e.target.value })} className="h-8" placeholder="Guardian Name" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Contact</label>
                                                    <Input value={editData.guardianContact} onChange={e => setEditData({ ...editData, guardianContact: e.target.value })} className="h-8" placeholder="Phone" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Location</label>
                                                    <Input value={editData.guardianLocation} onChange={e => setEditData({ ...editData, guardianLocation: e.target.value })} className="h-8" placeholder="Location" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {member.guardian ? (
                                                <div className="flex items-start gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold shrink-0">
                                                        {member.guardian[0]}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-gray-900">{member.guardian}</p>
                                                        <div className="flex flex-col gap-1 text-xs text-gray-500">
                                                            {member.guardianContact && (
                                                                <span className="flex items-center gap-1.5">
                                                                    <Phone className="w-3 h-3" />
                                                                    {member.guardianContact}
                                                                </span>
                                                            )}
                                                            {member.guardianLocation && (
                                                                <span className="flex items-center gap-1.5">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {member.guardianLocation}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <p className="text-sm text-gray-400 italic">No guardian information added.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <MemberFollowUps memberId={member.id} />
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

