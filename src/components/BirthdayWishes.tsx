import { useState } from 'react'
import { Cake, Sparkles, MessageCircle, Loader2, Send, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { generateBirthdayMsg } from '@/server/ai'
import { sendArkeselSms } from '@/server/sms'
import { getWhatsAppLink } from '@/lib/sms'


// Interface matching the member data from dashboard stats
interface BirthdayMember {
    id: string
    firstName: string
    lastName: string
    birthday: string | null
    role?: string
    campus?: string
    phone?: string
}

export function BirthdayWishes({ members }: { members: BirthdayMember[] }) {

    const [selectedMember, setSelectedMember] = useState<BirthdayMember | null>(null)
    const [draftMessage, setDraftMessage] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Handle "Draft Wish" - Open Dialog and Generate
    const handleDraftWish = async (member: BirthdayMember) => {
        setSelectedMember(member)
        setDialogOpen(true)
        setDraftMessage('') // Clear previous
        setIsGenerating(true)

        try {
            const result = await generateBirthdayMsg({
                data: {
                    memberName: member.firstName,
                    role: member.role || 'Member',
                    campus: member.campus || 'CoHK',
                    tone: 'spiritual'
                }
            })

            if (result.success && result.content) {
                setDraftMessage(result.content)
            } else {
                setDraftMessage(`Happy Birthday ${member.firstName}! We pray for God's blessings over your new age.`)
            }
        } catch (error) {
            console.error(error)
            setDraftMessage(`Happy Birthday ${member.firstName}! Have a blessed day!`)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSendSms = async () => {
        if (!selectedMember?.phone) {
            alert('Member has no phone number.')
            return
        }

        setIsSending(true)
        try {
            const result = await sendArkeselSms({
                data: {
                    recipients: [selectedMember.phone],
                    message: draftMessage
                }
            })

            if (result.success) {
                // Show toast or alert
                setDialogOpen(false)
                alert('SMS sent successfully via Arkesel!')
            } else {
                alert('Failed to send SMS: ' + result.message)
            }
        } catch (e) {
            alert('Error sending SMS')
        } finally {
            setIsSending(false)
        }
    }

    if (members.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                <Cake className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No birthdays this week</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3.5 rounded-xl border border-purple-100 bg-white hover:border-purple-200 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3.5">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-purple-100">
                                {member.firstName[0]}{member.lastName[0]}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-gray-100">
                                <Cake className="w-3 h-3 text-purple-500" />
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">{member.firstName} {member.lastName}</p>
                            <p className="text-xs text-gray-500">
                                {member.birthday ? new Date(member.birthday).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                            </p>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDraftWish(member)}
                        className="border-purple-100 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-200 transition-colors h-9 px-3 text-xs font-medium"
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Wish
                    </Button>
                </div>
            ))}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-purple-500" />
                            Draft Birthday Wish
                        </DialogTitle>
                        <DialogDescription>
                            AI-generated wish for <span className="font-semibold text-gray-900">{selectedMember?.firstName}</span>. Edit before sending.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="relative">
                            <Textarea
                                value={draftMessage}
                                onChange={(e) => setDraftMessage(e.target.value)}
                                className="min-h-[120px] bg-gray-50/50 border-gray-200 focus:bg-white resize-none text-sm leading-relaxed pr-10"
                                placeholder="Generating wish..."
                            />
                            {isGenerating && (
                                <div className="absolute top-3 right-3">
                                    <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                            <span>{draftMessage.length} characters</span>
                            <span>~1 SMS page</span>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {selectedMember?.phone && (
                                <a
                                    href={getWhatsAppLink(selectedMember.phone, draftMessage)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 sm:flex-none"
                                >
                                    <Button variant="outline" className="w-full border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-300">
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        WhatsApp
                                    </Button>
                                </a>
                            )}

                            <Button
                                onClick={handleSendSms}
                                disabled={isSending || isGenerating}
                                className="flex-1 sm:flex-none bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Send SMS
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
