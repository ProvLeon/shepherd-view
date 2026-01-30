import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Phone, MessageCircle, HeartHandshake, User, Calendar, Plus, Loader2, Trash2, History as HistoryIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { getMemberFollowUps, createFollowUp, deleteFollowUp } from '@/server/followups'

interface FollowUp {
    id: string
    type: 'Call' | 'WhatsApp' | 'Prayer' | 'Visit' | 'Other'
    notes: string | null
    outcome: 'Reached' | 'NoAnswer' | 'ScheduledCallback' | null
    scheduledAt: Date | null
    completedAt: Date | null
    createdAt: Date | null
    userName?: string | null
}

export function MemberFollowUps({ memberId }: { memberId: string }) {
    const { user } = useAuth()
    const [followUps, setFollowUps] = useState<FollowUp[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // New Follow-up Form State
    const [newFollowUp, setNewFollowUp] = useState({
        type: 'Call' as const,
        notes: '',
        outcome: 'Reached' as const,
        scheduledAt: ''
    })

    const fetchFollowUps = async () => {
        setLoading(true)
        try {
            const data = await getMemberFollowUps({ data: { memberId } })
            setFollowUps(data as FollowUp[])
        } catch (error) {
            console.error('Failed to fetch follow-ups:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (memberId) {
            fetchFollowUps()
        }
    }, [memberId])

    const handleCreate = async () => {
        if (!user) return alert('You must be logged in to add follow-ups')
        if (!newFollowUp.notes && !newFollowUp.scheduledAt) return alert('Please add notes or schedule an outcome')

        setSubmitting(true)
        try {
            const result = await createFollowUp({
                data: {
                    memberId,
                    userId: user.id,
                    ...newFollowUp,
                    scheduledAt: newFollowUp.scheduledAt || undefined
                }
            })

            if (result.success) {
                setIsAdding(false)
                setNewFollowUp({
                    type: 'Call',
                    notes: '',
                    outcome: 'Reached',
                    scheduledAt: ''
                })
                fetchFollowUps() // Refresh list
            } else {
                alert('Failed to create follow-up: ' + result.message)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this follow-up?')) return
        await deleteFollowUp({ data: { id } })
        fetchFollowUps()
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Call': return <Phone className="w-4 h-4 text-blue-500" />
            case 'WhatsApp': return <MessageCircle className="w-4 h-4 text-green-500" />
            case 'Visit': return <User className="w-4 h-4 text-purple-500" />
            case 'Prayer': return <HeartHandshake className="w-4 h-4 text-orange-500" />
            default: return <MessageCircle className="w-4 h-4 text-gray-500" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <HistoryIcon className="w-3.5 h-3.5 text-blue-500" />
                    Activity History
                </h3>
                <Button
                    size="sm"
                    onClick={() => setIsAdding(!isAdding)}
                    variant={isAdding ? "outline" : "default"}
                    className={isAdding ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" : "bg-blue-600 hover:bg-blue-700"}
                >
                    {isAdding ? 'Cancel' : (
                        <>
                            <Plus className="w-4 h-4 mr-1.5" />
                            Log New
                        </>
                    )}
                </Button>
            </div>

            {isAdding && (
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm ring-1 ring-blue-500/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-50">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">New Log Entry</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 block">Type</label>
                            <select
                                value={newFollowUp.type}
                                onChange={(e) => setNewFollowUp({ ...newFollowUp, type: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            >
                                <option value="Call">Call</option>
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Visit">Visit</option>
                                <option value="Prayer">Prayer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 block">Outcome</label>
                            <select
                                value={newFollowUp.outcome}
                                onChange={(e) => setNewFollowUp({ ...newFollowUp, outcome: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            >
                                <option value="Reached">Reached</option>
                                <option value="NoAnswer">No Answer</option>
                                <option value="ScheduledCallback">Scheduled Callback</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 block">Notes</label>
                        <textarea
                            value={newFollowUp.notes}
                            onChange={(e) => setNewFollowUp({ ...newFollowUp, notes: e.target.value })}
                            placeholder="What did you discuss?"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-h-[80px] resize-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 block">Schedule Next (Optional)</label>
                        <Input
                            type="datetime-local"
                            value={newFollowUp.scheduledAt}
                            onChange={(e) => setNewFollowUp({ ...newFollowUp, scheduledAt: e.target.value })}
                            className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                        />
                    </div>
                    <Button onClick={handleCreate} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Log Entry'}
                    </Button>
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-xs font-medium">Loading history...</span>
                    </div>
                ) : followUps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-3">
                            <HistoryIcon className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No activity recorded</p>
                        <p className="text-xs text-gray-500 mt-1">Log a call or visit to verify this member.</p>
                    </div>
                ) : (
                    <div className="relative border-l border-gray-100 ml-4 space-y-6 py-2">
                        {followUps.map((fu) => (
                            <div key={fu.id} className="relative pl-6 group">
                                <span className="absolute -left-2.5 top-1 h-5 w-5 rounded-full bg-white border border-gray-200 flex items-center justify-center ring-4 ring-white">
                                    {getTypeIcon(fu.type)}
                                </span>

                                <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group-hover:translate-x-1 duration-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {fu.type}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${fu.outcome === 'Reached' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                fu.outcome === 'NoAnswer' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {fu.outcome === 'NoAnswer' ? 'No Answer' : fu.outcome === 'ScheduledCallback' ? 'Callback' : fu.outcome}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                                {fu.createdAt && format(new Date(fu.createdAt), 'MMM d, h:mm a')}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(fu.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {fu.notes && (
                                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-2 rounded-lg border border-gray-50/50">
                                            {fu.notes}
                                        </p>
                                    )}

                                    {fu.scheduledAt && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50/50 px-2.5 py-1.5 rounded-lg border border-blue-100/50 w-fit">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="font-medium">Reminder: {format(new Date(fu.scheduledAt), 'MMM d, h:mm a')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
