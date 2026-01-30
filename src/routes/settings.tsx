import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Settings2,
    Database,
    Building2,
    Bell,
    Video,
    Copy,
    Check,
    Download,
    FileSpreadsheet,
    Save,
    Link as LinkIcon
} from 'lucide-react'
import { syncFromGoogleSheet } from '@/server/sync'
import { getMembers } from '@/server/members'
import { getEvents } from '@/server/attendance'
import { getSettings, saveAllSettings } from '@/server/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsSkeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
    loader: () => getSettings(),
    pendingComponent: SettingsSkeleton,
})

type Tab = 'general' | 'integrations' | 'data'

function SettingsPage() {
    const loadedSettings = Route.useLoaderData() as Record<string, string>

    const [activeTab, setActiveTab] = useState<Tab>('general')
    const [sheetId, setSheetId] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
    const [copiedMeetLink, setCopiedMeetLink] = useState(false)
    const [isExporting, setIsExporting] = useState<'members' | 'attendance' | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)
    const [hasChanges, setHasChanges] = useState(false)

    // Editable settings
    const [settings, setSettings] = useState({
        ministryName: 'Agape Bible Studies',
        campusName: 'CoHK',
        defaultMeetingUrl: 'https://meet.google.com/pqr-wira-sxh',
        birthdayReminders: true,
        attendanceAlerts: true,
        newConvertFollowups: true,
        theme: 'agape-blue'
    })

    // Load settings from database on mount
    useEffect(() => {
        if (loadedSettings) {
            setSettings({
                ministryName: loadedSettings.ministryName || 'Agape Bible Studies',
                campusName: loadedSettings.campusName || 'CoHK',
                defaultMeetingUrl: loadedSettings.defaultMeetingUrl || 'https://meet.google.com/pqr-wira-sxh',
                birthdayReminders: loadedSettings.birthdayReminders !== 'false',
                attendanceAlerts: loadedSettings.attendanceAlerts !== 'false',
                newConvertFollowups: loadedSettings.newConvertFollowups !== 'false',
                theme: loadedSettings.theme || 'agape-blue'
            })
        }
    }, [loadedSettings])

    const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
        setSaveResult(null)
    }

    const handleSync = async () => {
        if (!sheetId) return;

        setIsSyncing(true);
        setResult(null);

        try {
            const resp = await syncFromGoogleSheet({ data: { sheetId } });
            setResult(resp);
        } catch (err) {
            setResult({ success: false, message: 'Network or Server Error' });
        } finally {
            setIsSyncing(false);
        }
    }

    const handleSaveSettings = async () => {
        setIsSaving(true)
        setSaveResult(null)
        try {
            const settingsToSave: Record<string, string> = {
                ministryName: settings.ministryName,
                campusName: settings.campusName,
                defaultMeetingUrl: settings.defaultMeetingUrl,
                birthdayReminders: String(settings.birthdayReminders),
                attendanceAlerts: String(settings.attendanceAlerts),
                newConvertFollowups: String(settings.newConvertFollowups),
                theme: settings.theme
            }
            const result = await saveAllSettings({ data: settingsToSave })
            setSaveResult(result)
            if (result.success) {
                setHasChanges(false)
                // Clear success message after 3 seconds
                setTimeout(() => setSaveResult(null), 3000)
            }
        } catch (err) {
            setSaveResult({ success: false, message: 'Failed to save settings' })
        } finally {
            setIsSaving(false)
        }
    }

    const copyMeetLink = () => {
        navigator.clipboard.writeText(settings.defaultMeetingUrl)
        setCopiedMeetLink(true)
        setTimeout(() => setCopiedMeetLink(false), 2000)
    }

    const exportMembers = async () => {
        setIsExporting('members')
        try {
            const members = await getMembers()
            const csv = [
                ['First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Campus', 'Category', 'Camp'].join(','),
                ...members.map((m: any) => [
                    m.firstName || '',
                    m.lastName || '',
                    m.email || '',
                    m.phone || '',
                    m.role || '',
                    m.status || '',
                    m.campus || '',
                    m.category || '',
                    m.campName || ''
                ].map(val => `"${val}"`).join(','))
            ].join('\n')

            downloadCSV(csv, 'members_export.csv')
        } finally {
            setIsExporting(null)
        }
    }

    const exportAttendance = async () => {
        setIsExporting('attendance')
        try {
            const events = await getEvents()
            const csv = [
                ['Event Name', 'Date', 'Type', 'Present', 'Absent', 'Excused', 'Total'].join(','),
                ...events.map((e: any) => [
                    e.name || '',
                    new Date(e.date).toLocaleDateString(),
                    e.type || '',
                    e.presentCount || 0,
                    e.absentCount || 0,
                    e.excusedCount || 0,
                    e.totalCount || 0
                ].map(val => `"${val}"`).join(','))
            ].join('\n')

            downloadCSV(csv, 'attendance_export.csv')
        } finally {
            setIsExporting(null)
        }
    }

    const downloadCSV = (csv: string, filename: string) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
        URL.revokeObjectURL(link.href)
    }

    return (
        <div className="max-w-4xl pb-24">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                    <Settings2 className="w-8 h-8 text-gray-900" />
                    Settings
                </h1>
                <p className="text-lg text-gray-500 mt-2">Manage your ministry configuration and preferences.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl w-fit mb-8 backdrop-blur-sm border border-gray-200/50">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'general'
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    <Building2 className="w-4 h-4" />
                    General
                </button>
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'integrations'
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    <LinkIcon className="w-4 h-4" />
                    Integrations
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'data'
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    <Database className="w-4 h-4" />
                    Data & Export
                </button>
            </div>

            <div className="space-y-6">
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Church Info */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg font-semibold text-gray-900">Ministry Profile</h2>
                                <p className="text-sm text-gray-500 mt-1">Basic information about your ministry branch.</p>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Ministry Name</label>
                                    <Input
                                        value={settings.ministryName}
                                        onChange={(e) => updateSetting('ministryName', e.target.value)}
                                        className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Campus Branch</label>
                                    <Input
                                        value={settings.campusName}
                                        onChange={(e) => updateSetting('campusName', e.target.value)}
                                        className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                                <p className="text-sm text-gray-500 mt-1">Configure automated alerts and reminders.</p>
                            </div>
                            <div className="divide-y divide-gray-100">
                                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Birthday Reminders</p>
                                            <p className="text-sm text-gray-500">Get notified of member birthdays.</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.birthdayReminders}
                                        onChange={(e) => updateSetting('birthdayReminders', e.target.checked)}
                                        className="w-5 h-5 text-agape-blue rounded border-gray-300 focus:ring-agape-blue"
                                    />
                                </div>
                                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Attendance Alerts</p>
                                            <p className="text-sm text-gray-500">Notify when attendance drops below threshold.</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.attendanceAlerts}
                                        onChange={(e) => updateSetting('attendanceAlerts', e.target.checked)}
                                        className="w-5 h-5 text-agape-blue rounded border-gray-300 focus:ring-agape-blue"
                                    />
                                </div>
                                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">New Convert Follow-ups</p>
                                            <p className="text-sm text-gray-500">Reminders to follow up with new converts.</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.newConvertFollowups}
                                        onChange={(e) => updateSetting('newConvertFollowups', e.target.checked)}
                                        className="w-5 h-5 text-agape-blue rounded border-gray-300 focus:ring-agape-blue"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Google Sheets Sync */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Google Sheets Sync</h2>
                                    <p className="text-sm text-gray-500 mt-1">Import members from your existing spreadsheets.</p>
                                </div>
                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                                    <p className="text-sm font-medium text-blue-900 mb-2">Supported Columns</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['First Name', 'Surname', 'Date of Birth', 'Contact', 'Camp', 'New/Old'].map(col => (
                                            <span key={col} className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-700 font-mono">
                                                {col}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 max-w-xl">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={sheetId}
                                                onChange={(e) => setSheetId(e.target.value)}
                                                placeholder="e.g. 1qx0fk9EkgfI9..."
                                                className="font-mono text-sm"
                                            />
                                            <Button
                                                onClick={handleSync}
                                                disabled={isSyncing || !sheetId}
                                                className="shrink-0 gap-2"
                                            >
                                                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                Sync
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1.5 ml-1">Paste the ID from your Google Sheet URL.</p>
                                    </div>

                                    {result && (
                                        <div className={`p-4 rounded-lg flex items-start gap-3 animated-in fade-in slide-in-from-top-1 ${result.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                            {result.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                            <div>
                                                <p className="font-medium text-sm">{result.success ? 'Sync Complete' : 'Sync Failed'}</p>
                                                <p className="text-xs opacity-90 mt-0.5">{result.message}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Google Meet */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Virtual Meetings</h2>
                                    <p className="text-sm text-gray-500 mt-1">Configure Google Meet for services.</p>
                                </div>
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Video className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="max-w-xl">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Meeting Link</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={settings.defaultMeetingUrl}
                                            onChange={(e) => updateSetting('defaultMeetingUrl', e.target.value)}
                                            className="font-mono text-sm"
                                        />
                                        <Button variant="outline" onClick={copyMeetLink} className="shrink-0 gap-2">
                                            {copiedMeetLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                            <span className="sr-only sm:not-sr-only sm:inline-block">Copy</span>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1.5 ml-1">Used for recurring events like Friday Vigil.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Exports */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Data Export</h2>
                                    <p className="text-sm text-gray-500 mt-1">Download your data as CSV files.</p>
                                </div>
                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                    <Database className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={exportMembers}
                                    disabled={isExporting === 'members'}
                                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-agape-blue hover:bg-blue-50/50 transition-all text-left group"
                                >
                                    <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                                        {isExporting === 'members' ? <RefreshCw className="w-6 h-6 text-agape-blue animate-spin" /> : <Download className="w-6 h-6 text-agape-blue" />}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 group-hover:text-agape-blue transition-colors">Export Members</h3>
                                        <p className="text-sm text-gray-500 mt-1">Download full member list including contact info and roles.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={exportAttendance}
                                    disabled={isExporting === 'attendance'}
                                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-agape-blue hover:bg-blue-50/50 transition-all text-left group"
                                >
                                    <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                                        {isExporting === 'attendance' ? <RefreshCw className="w-6 h-6 text-agape-blue animate-spin" /> : <Download className="w-6 h-6 text-agape-blue" />}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 group-hover:text-agape-blue transition-colors">Export Attendance</h3>
                                        <p className="text-sm text-gray-500 mt-1">Download attendance records for all past events.</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Save Bar */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-gray-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between transition-all duration-500 z-50 ${hasChanges ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
                <div>
                    <p className="font-semibold px-2">Unsaved Changes</p>
                    <p className="text-xs text-gray-400 px-2 mt-0.5">You have modified your settings.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setHasChanges(false)
                            window.location.reload()
                        }}
                        className="text-gray-300 hover:text-white hover:bg-white/10"
                    >
                        Discard
                    </Button>
                    <Button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="bg-white text-gray-900 hover:bg-gray-100 border-none shadow-none"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Success Toast (Fixed Top) */}
            {saveResult && saveResult.success && !hasChanges && (
                <div className="fixed top-6 right-6 z-50 bg-white border border-green-100 shadow-xl rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="p-1 bg-green-100 rounded-full">
                        <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-900">Settings Saved</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Your changes have been updated successfully.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
