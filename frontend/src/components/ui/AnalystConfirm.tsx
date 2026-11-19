import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface AnalystConfirmProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const AnalystConfirm: React.FC<AnalystConfirmProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-pine"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white border border-stone rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 z-10"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isDestructive ? 'bg-coral/10 text-coral' : 'bg-teal/10 text-teal'
                }`}
              >
                <AlertCircle size={22} />
              </div>
              <h3 className="font-display text-lg font-semibold text-pine">{title}</h3>
            </div>

            <p className="text-sm text-graphite font-body leading-relaxed">{message}</p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone/50">
              <button onClick={onCancel} className="btn-ghost">
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={isDestructive ? 'btn-coral' : 'btn-primary'}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
export default AnalystConfirm
