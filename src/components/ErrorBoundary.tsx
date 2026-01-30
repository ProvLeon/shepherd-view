/**
 * Error Boundary Components for TanStack Start
 *
 * Error boundaries catch errors in child components and display fallback UI
 * They help prevent the entire app from crashing
 *
 * Reference: https://tanstack.com/start/latest/docs/framework/react/guide/error-boundaries
 */

import React, { ReactNode, useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  hasError: boolean
}

/**
 * Client-side Error Boundary Component
 * Catches React errors in child components
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      error: null,
      hasError: false,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error,
      hasError: true,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught:', error, errorInfo)
    }

    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo)
  }

  reset = () => {
    this.setState({
      error: null,
      hasError: false,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          reset={this.reset}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default Error Fallback UI
 * Displays error message and recovery options
 */
interface ErrorFallbackProps {
  error: Error
  reset: () => void
  showDetails?: boolean
}

export function ErrorFallback({
  error,
  reset,
  showDetails = process.env.NODE_ENV === 'development',
}: ErrorFallbackProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600">
            An unexpected error occurred. Try refreshing or return home.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {showDetails && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left font-mono text-sm text-red-900 hover:text-red-800 flex items-center justify-between"
            >
              <span className="truncate">{error.message}</span>
              <span className="ml-2 flex-shrink-0">
                {expanded ? '▼' : '▶'}
              </span>
            </button>
            {expanded && (
              <div className="mt-3 pt-3 border-t border-red-300">
                <pre className="text-xs text-red-900 overflow-auto max-h-48 font-mono whitespace-pre-wrap break-words">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>

        {/* Contact Support */}
        <p className="text-center text-sm text-gray-600 mt-6">
          If the problem persists,{' '}
          <a href="mailto:support@example.com" className="text-red-600 hover:text-red-700 font-medium">
            contact support
          </a>
        </p>
      </div>
    </div>
  )
}

/**
 * Server Function Error Handler
 * Catches errors from server function calls
 */
export function useServerFunctionError() {
  const [error, setError] = useState<Error | null>(null)

  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      setError(err)
    } else {
      setError(new Error(String(err)))
    }
  }

  const clearError = () => setError(null)

  return { error, handleError, clearError }
}

/**
 * Auth-specific Error Fallback
 * Shows auth-related error messages
 */
interface AuthErrorFallbackProps {
  error: Error
  reset: () => void
}

export function AuthErrorFallback({ error, reset }: AuthErrorFallbackProps) {
  const navigate = useNavigate()

  let message = 'Authentication error'
  let actionText = 'Try Again'
  let action = reset

  // Check for specific auth errors
  if (error.message.includes('Not authenticated')) {
    message = 'You must be logged in to access this page'
    actionText = 'Go to Login'
    action = () => navigate({ to: '/login' })
  } else if (error.message.includes('Admin access required')) {
    message = 'You do not have permission to access this page'
    actionText = 'Go Back'
    action = () => navigate({ to: '/' })
  } else if (error.message.includes('Insufficient permissions')) {
    message = 'You do not have the required role for this action'
    actionText = 'Go Back'
    action = () => navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={action}
            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition"
          >
            {actionText}
          </button>
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Data Loading Error Fallback
 * Shows data loading errors with retry option
 */
interface DataErrorFallbackProps {
  error: Error
  retry: () => void
  title?: string
}

export function DataErrorFallback({
  error,
  retry,
  title = 'Failed to Load Data',
}: DataErrorFallbackProps) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
          <p className="text-sm text-red-700 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Server Route Error Handler
 * Handles errors in server routes (GET /api/...)
 */
export async function handleServerRouteError(
  error: Error,
  statusCode = 500
): Promise<Response> {
  console.error('Server route error:', error)

  return Response.json(
    {
      error: error.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
