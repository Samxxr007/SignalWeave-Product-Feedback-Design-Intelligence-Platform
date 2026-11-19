import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend,
  trendValue,
  color = '#377E75',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-editorial relative overflow-hidden flex flex-col justify-between"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div>
        <p className="section-label mb-1.5">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="metric-value">{value}</span>
          {unit && <span className="font-mono text-sm text-graphite">{unit}</span>}
        </div>
      </div>

      {(trend || trendValue) && (
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-stone/40 text-xs font-mono">
          {trend === 'up' && <TrendingUp size={14} className="text-teal" />}
          {trend === 'down' && <TrendingDown size={14} className="text-coral" />}
          {trend === 'neutral' && <Minus size={14} className="text-graphite" />}
          <span
            className={
              trend === 'up' ? 'text-teal' : trend === 'down' ? 'text-coral' : 'text-graphite'
            }
          >
            {trendValue}
          </span>
        </div>
      )}
    </motion.div>
  )
}
export default MetricCard
