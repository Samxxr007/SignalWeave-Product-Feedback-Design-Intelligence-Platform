import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star } from 'lucide-react'
import type { Review } from '../../types'

interface ReviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  reviews: Review[]
}

export const ReviewDrawer: React.FC<ReviewDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Review Evidence',
  reviews,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-pine z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-ivory border-l border-stone shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-stone bg-white flex items-center justify-between">
              <div>
                <span className="section-label">Evidence Explorer</span>
                <h3 className="font-display text-xl text-pine font-semibold">{title}</h3>
                <p className="text-xs font-mono text-graphite mt-0.5">
                  Showing {reviews.length} customer review{reviews.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-graphite hover:text-pine hover:bg-stone/20 rounded-lg transition-colors"
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-graphite text-sm">
                  No sample reviews available for this slice.
                </div>
              ) : (
                reviews.map((rev, idx) => (
                  <div
                    key={rev.id || idx}
                    className="p-4 rounded-xl bg-white border border-stone shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={
                              i < (rev.rating || 0)
                                ? 'fill-citron text-citron'
                                : 'text-stone'
                            }
                          />
                        ))}
                        <span className="font-mono text-xs font-medium ml-1 text-pine">
                          {rev.rating ? rev.rating.toFixed(1) : '-'}
                        </span>
                      </div>

                      {rev.sentiment && (
                        <span
                          className={
                            rev.sentiment === 'positive'
                              ? 'badge-positive'
                              : rev.sentiment === 'negative'
                              ? 'badge-negative'
                              : 'badge-neutral'
                          }
                        >
                          {rev.sentiment}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-pine/90 leading-relaxed font-body">
                      {rev.text}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone/30 text-xs text-graphite font-mono">
                      <span>{rev.product || 'General'}</span>
                      <span>{rev.date ? new Date(rev.date).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
export default ReviewDrawer
