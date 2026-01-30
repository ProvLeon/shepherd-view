import { createFileRoute, Link } from '@tanstack/react-router'
import { getMemberById } from '../../../server/members'
import { Button } from '../../../components/ui/button'
import { ArrowLeft, Mail, Phone, Calendar, Tent } from 'lucide-react'

export const Route = createFileRoute('/_authed/members/$memberId')({
  component: MemberDetails,
  loader: async ({ params }) => await getMemberById({ data: { id: params.memberId } }),
})

function MemberDetails() {
  const member = Route.useLoaderData()

  if (!member) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Member not found</h2>
        <Button asChild>
          <Link to="/members">Back to list</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/members">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{member.firstName} {member.lastName}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Card */}
        <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Contact Info</h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="w-4 h-4" />
              {member.email ? (
                <a href={`mailto:${member.email}`} className="hover:text-slate-900 hover:underline">
                  {member.email}
                </a>
              ) : (
                <span className="text-slate-400 italic">No email</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="w-4 h-4" />
              {member.phone ? (
                <a href={`tel:${member.phone}`} className="hover:text-slate-900 hover:underline">
                  {member.phone}
                </a>
              ) : (
                <span className="text-slate-400 italic">No phone</span>
              )}
            </div>
          </div>
        </div>

        {/* Ministry Card */}
        <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Ministry Details</h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-600">
              <Tent className="w-4 h-4" />
              <span>{member.campName ? `Camp: ${member.campName}` : 'No Camp Assigned'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-4 h-4 flex items-center justify-center font-bold text-xs bg-slate-100 rounded-full">R</div>
              <span>{member.role}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>Joined: {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
