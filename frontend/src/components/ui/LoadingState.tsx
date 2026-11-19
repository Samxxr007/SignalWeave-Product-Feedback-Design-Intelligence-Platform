import React from 'react'

interface LoadingStateProps {
  message?: string
  rows?: number
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading signals and computing models...',
  rows = 4,
}) => {
  return (
    <div className="card-editorial p-8 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-teal border-t-transparent animate-spin" />
        <span className="font-mono text-sm text-graphite">{message}</span>
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-9 bg-stone/40 rounded-lg w-full"
            style={{ width: `${100 - (i % 3) * 15}%` }}
          />
        ))}
      </div>
    </div>
  )
}
export default LoadingState
