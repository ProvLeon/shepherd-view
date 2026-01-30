import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { getSyncProgress } from '@/server/settings'
import { Loader2, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react'

type SyncStatus = 'idle' | 'running' | 'completed' | 'error'

interface SyncProgress {
    current: number
    total: number
    status: SyncStatus
    message: string
}

interface SyncProgressContextType {
    progress: SyncProgress | null
}

const SyncProgressContext = createContext<SyncProgressContextType | undefined>(undefined)

export function SyncProgressProvider({ children }: { children: React.ReactNode }) {
    const [progress, setProgress] = useState<SyncProgress | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const pollTimeout = useRef<NodeJS.Timeout | null>(null)

    // Robust Polling: Recursive timeout to prevent request pile-up
    useEffect(() => {
        let isMounted = true

        const poll = async () => {
            try {
                const parsed = await getSyncProgress() as SyncProgress | null

                if (isMounted && parsed) {
                    setProgress(prev => {
                        // Strict equality check to prevent re-renders
                        if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                            return parsed
                        }
                        return prev
                    })
                }
            } catch (e) {
                // Log but don't crash. Network glitches happen and we want to keep retrying.
                console.error('Silently failed to poll sync progress:', e)
            }

            // Schedule next poll only AFTER the current one finishes
            // Increased delay to 1.5s to prevent DB connection flooding
            if (isMounted) {
                pollTimeout.current = setTimeout(poll, 1500)
            }
        }

        // Start polling
        poll()

        return () => {
            isMounted = false
            if (pollTimeout.current) clearTimeout(pollTimeout.current)
        }
    }, [])

    // Visibility Logic: Separate effect to handle auto-hide
    useEffect(() => {
        if (!progress) return

        if (progress.status === 'running') {
            setIsVisible(true)
        } else if (progress.status === 'completed' || progress.status === 'error') {
            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setIsVisible(false)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [progress])

    return (
        <SyncProgressContext.Provider value={{ progress }}>
            {children}

            {isVisible && progress && (
                <div className="fixed bottom-6 right-6 z-100 w-96 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className={`bg-white rounded-xl shadow-2xl border ${progress.status === 'error' ? 'border-red-100' :
                            progress.status === 'completed' ? 'border-green-100' :
                                'border-blue-100'
                        } p-4 overflow-hidden`}>

                        <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-full shrink-0 ${progress.status === 'running' ? 'bg-blue-50 text-blue-600' :
                                    progress.status === 'completed' ? 'bg-green-50 text-green-600' :
                                        'bg-red-50 text-red-600'
                                }`}>
                                {progress.status === 'running' && <Loader2 className="w-5 h-5 animate-spin" />}
                                {progress.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                                {progress.status === 'error' && <XCircle className="w-5 h-5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-semibold text-gray-900 text-sm">
                                        {progress.status === 'running' ? 'Syncing Members' :
                                            progress.status === 'completed' ? 'Sync Complete' :
                                                'Sync Failed'}
                                    </h4>
                                    {progress.status === 'running' && progress.total > 0 && (
                                        <span className="text-xs font-mono text-gray-400">
                                            {Math.round((progress.current / progress.total) * 100)}%
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-gray-500 truncate mb-3">
                                    {progress.message}
                                </p>

                                {progress.status === 'running' && (
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 p-1.5">
                            <FileSpreadsheet className="w-3 h-3 text-gray-300" />
                        </div>
                    </div>
                </div>
            )}
        </SyncProgressContext.Provider>
    )
}

export function useSyncProgress() {
    const context = useContext(SyncProgressContext)
    if (context === undefined) {
        throw new Error('useSyncProgress must be used within a SyncProgressProvider')
    }
    return context
}
