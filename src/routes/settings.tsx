import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { syncFromGoogleSheet } from '../server/sync'

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
})

function SettingsPage() {
    const [sheetId, setSheetId] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

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

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage application configuration and integrations.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <img src="https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png" alt="Sheets" className="w-6 h-6" />
                        Google Sheets Sync
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Import members from an existing Google Sheet. Ensure the sheet has the following columns in order:
                        <br />
                        <code className="bg-gray-100 px-1 rounded">First Name</code>,{' '}
                        <code className="bg-gray-100 px-1 rounded">Last Name</code>,{' '}
                        <code className="bg-gray-100 px-1 rounded">Email</code>,{' '}
                        <code className="bg-gray-100 px-1 rounded">Phone</code>,{' '}
                        <code className="bg-gray-100 px-1 rounded">Campus</code>
                    </p>
                </div>

                <div className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
                        <input
                            type="text"
                            value={sheetId}
                            onChange={(e) => setSheetId(e.target.value)}
                            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-agape-blue/20 focus:border-agape-blue"
                        />
                        <p className="text-xs text-gray-400 mt-1">Found in the URL of your Google Sheet.</p>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={isSyncing || !sheetId}
                        className="flex items-center gap-2 px-4 py-2 bg-agape-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>

                    {result && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {result.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                            <div>
                                <p className="font-medium">{result.success ? 'Sync Complete' : 'Sync Failed'}</p>
                                <p className="text-sm opacity-90">{result.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
