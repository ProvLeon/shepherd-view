import { useState } from 'react'
import { Mail, Phone, User, MapPin, MessageCircle, Cake, Edit2, X, Briefcase, HeartHandshake, Send, Loader2, Copy, CheckCircle, Users } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
    Sheet,
    SheetContent,
} from './ui/sheet'
import { updateMember } from '../server/members'
import { MemberFollowUps } from './MemberFollowUps'
import { generateUpdateToken, getUpdateLinkMessage } from '@/server/profile-update'
import { sendArkeselSms } from '@/server/sms'
import { getWhatsAppLink } from '@/lib/sms'

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
    const [copiedField, setCopiedField] = useState<string | null>(null)
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

    const [activeTab, setActiveTab] = useState<'overview' | 'followups'>('overview')
    const [isSendingLink, setIsSendingLink] = useState(false)

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    // Handle sending update link via SMS or WhatsApp
    const handleSendUpdateLink = async (channel: 'sms' | 'whatsapp') => {
        if (!member) return

        setIsSendingLink(true)
        try {
            const result = await generateUpdateToken({ data: { memberId: member.id } })

            if (result.success && result.url) {
                const message = getUpdateLinkMessage(result.memberName || member.firstName, result.url, channel)

                if (channel === 'whatsapp') {
                    const phone = result.memberPhone || member.phone || ''
                    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '233')
                    window.open(getWhatsAppLink(cleanPhone, message), '_blank')
                } else {
                    const phone = result.memberPhone || member.phone
                    if (!phone) {
                        alert('Member has no phone number')
                        return
                    }
                    const smsResult = await sendArkeselSms({
                        data: {
                            recipients: [phone],
                            message
                        }
                    })
                    if (smsResult.success) {
                        alert('Update link sent via SMS!')
                    } else {
                        alert('Failed to send SMS: ' + smsResult.message)
                    }
                }
            } else {
                alert('Failed to generate update link')
            }
        } catch (error) {
            console.error('Error sending update link:', error)
            alert('Error sending update link')
        } finally {
            setIsSendingLink(false)
        }
    }

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

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'Leader':
                return 'bg-linear-to-r from-purple-500 to-purple-600 text-white'
            case 'Shepherd':
                return 'bg-linear-to-r from-blue-500 to-blue-600 text-white'
            case 'New Convert':
                return 'bg-linear-to-r from-green-500 to-emerald-600 text-white'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    const formatDate = (date: string | null, format: 'short' | 'full' = 'short') => {
        if (!date) return null
        const d = new Date(date)
        if (format === 'full') {
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        }
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    return (
        <Sheet open={open} onOpenChange={(newOpen) => {
            if (!newOpen) {
                setIsEditing(false)
                setActiveTab('overview')
            }
            onOpenChange(newOpen)
        }}>
            <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-lg p-0 border-l-0 shadow-2xl">
                {/* Hero Header */}
                <div className="relative bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }} />

                    {/* Top bar */}
                    <div className="relative flex items-center justify-between p-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-2">
                            {!isEditing ? (
                                <Button
                                    onClick={startEditing}
                                    variant="ghost"
                                    size="sm"
                                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full px-4"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={cancelEditing}
                                        variant="ghost"
                                        size="sm"
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={saveChanges}
                                        size="sm"
                                        disabled={isSaving}
                                        className="bg-white text-slate-900 hover:bg-white/90 rounded-full"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile section */}
                    <div className="relative px-6 pb-8 pt-2">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl ring-4 ring-white/20">
                                    {initials}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-900 ${member.status === 'Active' ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                            </div>

                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={editData.firstName}
                                            onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                            placeholder="First"
                                            className="h-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                        />
                                        <Input
                                            value={editData.lastName}
                                            onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                            placeholder="Last"
                                            className="h-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-bold leading-tight">{member.firstName} {member.lastName}</h2>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getRoleBadgeStyle(member.role)}`}>
                                                {member.role}
                                            </span>
                                            {member.category && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80">
                                                    {member.category}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Quick contact buttons */}
                        {!isEditing && member.phone && (
                            <div className="flex gap-2 mt-6">
                                <Button
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0 h-11 rounded-xl backdrop-blur-sm"
                                    asChild
                                >
                                    <a href={`tel:${member.phone}`}>
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call
                                    </a>
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-0 h-11 rounded-xl backdrop-blur-sm"
                                    asChild
                                >
                                    <a href={`https://wa.me/233${member.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        WhatsApp
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                    <div className="flex">
                        {(['overview', 'followups'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3.5 text-sm font-medium transition-all relative ${activeTab === tab
                                    ? 'text-slate-900'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {tab === 'overview' && (isEditing ? 'Edit Profile' : 'Overview')}
                                {tab === 'followups' && 'History'}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-slate-900 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 bg-gray-50 min-h-[400px]">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && !isEditing && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Contact Info Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 space-y-3">
                                    {/* Phone */}
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                                <Phone className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Phone</p>
                                                <p className="text-sm font-semibold text-gray-900">{member.phone || '—'}</p>
                                            </div>
                                        </div>
                                        {member.phone && (
                                            <button
                                                onClick={() => copyToClipboard(member.phone!, 'phone')}
                                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-gray-100 transition-all"
                                            >
                                                {copiedField === 'phone' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                                                <Mail className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Email</p>
                                                <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{member.email || '—'}</p>
                                            </div>
                                        </div>
                                        {member.email && (
                                            <button
                                                onClick={() => copyToClipboard(member.email!, 'email')}
                                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-gray-100 transition-all"
                                            >
                                                {copiedField === 'email' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Birthday */}
                                    {member.birthday && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
                                                <Cake className="w-4 h-4 text-pink-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Birthday</p>
                                                <p className="text-sm font-semibold text-gray-900">{formatDate(member.birthday, 'full')}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Location */}
                                    {member.residence && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Residence</p>
                                                <p className="text-sm font-semibold text-gray-900">{member.residence}{member.region && `, ${member.region}`}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ministry Info Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                    <h3 className="text-sm font-semibold text-gray-900">Ministry</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-0.5">Campus</p>
                                        <p className="text-sm font-semibold text-gray-900">{member.campus || 'CoHK'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-0.5">Camp</p>
                                        <p className="text-sm font-semibold text-gray-900">{member.campName || 'Unassigned'}</p>
                                    </div>
                                    <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-0.5">Joined</p>
                                        <p className="text-sm font-semibold text-gray-900">{formatDate(member.joinDate, 'full') || 'Unknown'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Card */}
                            {member.guardian && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users className="w-4 h-4 text-rose-500" />
                                        <h3 className="text-sm font-semibold text-gray-900">Guardian</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold">
                                            {member.guardian[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{member.guardian}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                {member.guardianContact && <span>{member.guardianContact}</span>}
                                                {member.guardianLocation && <span>• {member.guardianLocation}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Send Update Link Card */}
                            {member.phone && (
                                <div className="bg-linear-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Send className="w-4 h-4 text-purple-600" />
                                        <h3 className="text-sm font-semibold text-gray-900">Invite to Update Profile</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">Send a secure link for this member to update their own information</p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleSendUpdateLink('sms')}
                                            disabled={isSendingLink}
                                            size="sm"
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-9 rounded-xl"
                                        >
                                            {isSendingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                                            SMS
                                        </Button>
                                        <Button
                                            onClick={() => handleSendUpdateLink('whatsapp')}
                                            disabled={isSendingLink}
                                            size="sm"
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 rounded-xl"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                                            WhatsApp
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Overview Tab - Edit Mode */}
                    {activeTab === 'overview' && isEditing && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Personal Info */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-600" />
                                    Personal & Contact
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Email</label>
                                        <Input value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} className="h-10" placeholder="Email" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Phone</label>
                                        <Input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="h-10" placeholder="Phone" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Birthday</label>
                                    <Input type="date" value={editData.birthday} onChange={e => setEditData({ ...editData, birthday: e.target.value })} className="h-10" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Residence</label>
                                        <Input value={editData.residence} onChange={e => setEditData({ ...editData, residence: e.target.value })} className="h-10" placeholder="Residence" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Region</label>
                                        <Input value={editData.region} onChange={e => setEditData({ ...editData, region: e.target.value })} className="h-10" placeholder="Region" />
                                    </div>
                                </div>
                            </div>

                            {/* Ministry Info */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                    Ministry
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Role</label>
                                        <select value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 bg-white">
                                            <option>Member</option>
                                            <option>Leader</option>
                                            <option>Shepherd</option>
                                            <option>New Convert</option>
                                            <option>Guest</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Category</label>
                                        <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 bg-white">
                                            <option>Student</option>
                                            <option>Workforce</option>
                                            <option>NSS</option>
                                            <option>Alumni</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Status</label>
                                        <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 bg-white">
                                            <option>Active</option>
                                            <option>Inactive</option>
                                            <option>Archived</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Campus</label>
                                        <select value={editData.campus} onChange={e => setEditData({ ...editData, campus: e.target.value })} className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 bg-white">
                                            <option>CoHK</option>
                                            <option>KNUST</option>
                                            <option>Legon</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Info */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <HeartHandshake className="w-4 h-4 text-rose-500" />
                                    Guardian / Next of Kin
                                </h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Guardian Name</label>
                                        <Input value={editData.guardian} onChange={e => setEditData({ ...editData, guardian: e.target.value })} className="h-10" placeholder="Full name" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500">Contact</label>
                                            <Input value={editData.guardianContact} onChange={e => setEditData({ ...editData, guardianContact: e.target.value })} className="h-10" placeholder="Phone" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500">Location</label>
                                            <Input value={editData.guardianLocation} onChange={e => setEditData({ ...editData, guardianLocation: e.target.value })} className="h-10" placeholder="City" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Follow-ups Tab */}
                    {activeTab === 'followups' && (
                        <div className="animate-in fade-in duration-200">
                            <MemberFollowUps memberId={member.id} />
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
