import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operation Interrupted',
  message,
  onRetry,
}) => {
  return (
    <div className="card-editorial p-6 border-coral/30 bg-coral/5 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-coral/10 text-coral flex-shrink-0">
        <AlertCircle size={20} />
      </div>
      <div className="flex-1">
        <h4 className="font-display font-semibold text-pine text-base">{title}</h4>
        <p className="text-sm text-graphite mt-1 font-body">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-medium text-coral hover:underline"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
export default ErrorState
