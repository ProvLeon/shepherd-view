import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Send, Users, MessageSquare, CheckCircle, AlertCircle, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getMembers } from '@/server/members'
import { sendBulkSms } from '@/server/sms'
import { useRouter } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/messaging/')({
    component: MessagingPage,
    loader: () => getMembers(),
})

interface Member {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    campName: string | null
    role: string
}

function MessagingPage() {
    const members = Route.useLoaderData() as Member[]
    const router = useRouter()

    const [message, setMessage] = useState('')
    const [selectedRole, setSelectedRole] = useState<string>('all')
    const [selectedCamp, setSelectedCamp] = useState<string>('all')
    const [isSending, setIsSending] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    // Filter recipients
    const recipients = members.filter(m => {
        if (!m.phone) return false
        if (selectedRole !== 'all' && m.role !== selectedRole) return false
        if (selectedCamp !== 'all' && m.campName !== selectedCamp) return false
        return true
    })

    const [sentCount, setSentCount] = useState(0)
    const [totalCount, setTotalCount] = useState(0)

    const handleSend = async () => {
        if (!message || recipients.length === 0) return

        if (!confirm(`Are you sure you want to send this message to ${recipients.length} recipients?`)) return

        setIsSending(true)
        setResult(null)
        setSentCount(0)
        setTotalCount(recipients.length)

        const BATCH_SIZE = 10
        let successCount = 0
        let failedCount = 0

        try {
            for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
                const batch = recipients.slice(i, i + BATCH_SIZE)

                try {
                    const response = await sendBulkSms({
                        data: {
                            recipients: batch.map(r => ({
                                phone: r.phone!,
                                name: r.firstName,
                                campName: r.campName
                            })),
                            message
                        }
                    })

                    if (response.success) {
                        successCount += batch.length
                    } else {
                        failedCount += batch.length
                        console.error('Batch failed:', response.message)
                    }
                } catch (err) {
                    failedCount += batch.length
                    console.error('Batch error:', err)
                }

                setSentCount(prev => Math.min(prev + batch.length, recipients.length))
            }

            if (failedCount === 0) {
                setResult({ success: true, message: `Successfully sent to all ${successCount} members!` })
                setMessage('')
            } else if (successCount > 0) {
                setResult({ success: false, message: `Sent to ${successCount} members, but failed for ${failedCount}.` })
            } else {
                setResult({ success: false, message: 'Failed to send messages. Please try again.' })
            }

        } catch (error) {
            console.error('Send error:', error)
            setResult({ success: false, message: error instanceof Error ? error.message : 'An error occurred while sending.' })
        } finally {
            setIsSending(false)
            setSentCount(0) // Reset progress bar after completion (or keep it?) - let's keep it until user dismisses or sends new
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messaging</h1>
                <p className="text-slate-500">Send SMS broadcasts to your members and shepherds.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Recipients Panel */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Recipients
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    className="w-full rounded-md border-gray-300 shadow-xs focus:border-purple-500 focus:ring-purple-500"
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="Leader">Leaders</option>
                                    <option value="Shepherd">Shepherds</option>
                                    <option value="Member">Members</option>
                                    <option value="New Convert">New Converts</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Camp</label>
                                <select
                                    className="w-full rounded-md border-gray-300 shadow-xs focus:border-purple-500 focus:ring-purple-500"
                                    value={selectedCamp}
                                    onChange={e => setSelectedCamp(e.target.value)}
                                >
                                    <option value="all">All Camps</option>
                                    <option value="CoHK">CoHK</option>
                                    <option value="KNUST">KNUST</option>
                                    <option value="Legon">Legon</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-sm text-slate-500">Target Audience</p>
                                <p className="text-2xl font-bold text-purple-600">{recipients.length}</p>
                                <p className="text-xs text-slate-400">recipients with phone numbers</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Message Composer */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Compose Message
                        </h2>

                        <div className="space-y-4">
                            <Textarea
                                placeholder="Type your message here..."
                                className="min-h-[150px] text-base"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                            />

                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{message.length} characters</span>
                                <span>~{Math.ceil(message.length / 160)} SMS segments</span>
                            </div>

                            {/* Progress Bar */}
                            {isSending && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                                        <span>Sending... {Math.round((sentCount / totalCount) * 100)}%</span>
                                        <span>{sentCount} / {totalCount}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-600 transition-all duration-300 ease-out"
                                            style={{ width: `${(sentCount / totalCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Template Tags Helper */}
                            <div className="flex gap-2 text-xs">
                                <button onClick={() => setMessage(prev => prev + ' {firstName}')} className="px-2 py-1 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">
                                    {'{firstName}'}
                                </button>
                                <button onClick={() => setMessage(prev => prev + ' {campName}')} className="px-2 py-1 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">
                                    {'{campName}'}
                                </button>
                            </div>

                            {result && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {result.message}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <Button
                                    onClick={handleSend}
                                    disabled={isSending || recipients.length === 0 || !message}
                                    className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Send Broadcast
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


