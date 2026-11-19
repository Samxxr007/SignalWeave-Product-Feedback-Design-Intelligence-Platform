import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="card-editorial py-16 px-6 text-center flex flex-col items-center justify-center max-w-xl mx-auto border-dashed border-2">
      <div className="w-14 h-14 rounded-2xl bg-pine/5 flex items-center justify-center text-pine mb-4">
        <Icon size={28} className="text-pine/70" />
      </div>
      <h3 className="font-display text-xl text-pine font-semibold mb-2">{title}</h3>
      <p className="text-sm text-graphite mb-6 max-w-md font-body leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
export default EmptyState
