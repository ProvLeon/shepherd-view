import { createFileRoute, Link } from '@tanstack/react-router'
import { getCampusStats } from '@/server/members'
import { MapPin, Briefcase, GraduationCap, Users, ArrowRight, Building2, School } from 'lucide-react'

export const Route = createFileRoute('/_authed/campuses/')({
  component: CampusesPage,
  loader: () => getCampusStats(),
})

function CampusesPage() {
  const stats = Route.useLoaderData()

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Building2 className="w-8 h-8 text-agape-blue" />
          Campuses & Groups
        </h1>
        <p className="text-lg text-gray-500 mt-2 max-w-2xl">
          Manage and view members across different campus branches and ministry categories
        </p>
      </div>

      {/* Campus Branches Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-blue-100 rounded-lg text-agape-blue">
            <MapPin className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Campus Branches</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CoHK Card - Featured */}
          <div className="md:col-span-2 lg:col-span-1 row-span-2 group">
            <Link to="/campuses/$campusId" params={{ campusId: 'CoHK' }} className="block h-full">
              <div className="bg-linear-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white h-full relative overflow-hidden shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl">
                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 p-24 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-6">
                      <School className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">College of Health (CoHK)</h3>
                    <p className="text-blue-100">The main campus branch located at Kintampo.</p>
                  </div>

                  <div className="mt-8 flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-bold">{stats.CoHK}</p>
                      <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mt-1">Members</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* KNUST Card */}
          <Link to="/campuses/$campusId" params={{ campusId: 'KNUST' }} className="group block">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-green-200 hover:shadow-lg hover:shadow-green-500/5 transition-all h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:bg-green-100 transition-colors">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{stats.KNUST}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">KNUST</h3>
                <p className="text-sm text-gray-500 line-clamp-2">Kwame Nkrumah University of Science and Technology.</p>
              </div>
            </div>
          </Link>

          {/* Legon Card */}
          <Link to="/campuses/$campusId" params={{ campusId: 'Legon' }} className="group block">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-100 transition-colors">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{stats.Legon}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Legon</h3>
                <p className="text-sm text-gray-500">University of Ghana branch details.</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Ministry Groups Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Ministry Categories</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Workforce */}
          <Link to="/campuses/category/$categoryId" params={{ categoryId: 'Workforce' }} className="group block">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-orange-200 hover:ring-4 hover:ring-orange-50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-bold">{stats.Workforce}</span>
                  <span className="text-xs opacity-80">members</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Workforce</h3>
              <p className="text-sm text-gray-500 mt-1">Working professionals and non-students.</p>
            </div>
          </Link>

          {/* NSS */}
          <Link to="/campuses/category/$categoryId" params={{ categoryId: 'NSS' }} className="group block">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-200 hover:ring-4 hover:ring-indigo-50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-bold">{stats.NSS}</span>
                  <span className="text-xs opacity-80">personnel</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900">National Service</h3>
              <p className="text-sm text-gray-500 mt-1">Personnel currently doing their service.</p>
            </div>
          </Link>

          {/* Alumni */}
          <Link to="/campuses/category/$categoryId" params={{ categoryId: 'Alumni' }} className="group block">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-slate-200 hover:ring-4 hover:ring-slate-50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-600">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-bold">{stats.Alumni}</span>
                  <span className="text-xs opacity-80">alumni</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Alumni</h3>
              <p className="text-sm text-gray-500 mt-1">Past students and members of the ministry.</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}
