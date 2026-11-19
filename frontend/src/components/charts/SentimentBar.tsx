import React from 'react'

interface SentimentBarProps {
  positive: number
  neutral: number
  negative: number
  showLabels?: boolean
  height?: number
}

export const SentimentBar: React.FC<SentimentBarProps> = ({
  positive,
  neutral,
  negative,
  showLabels = true,
  height = 12,
}) => {
  const total = positive + neutral + negative
  const posPct = total > 0 ? (positive / total) * 100 : 0
  const neuPct = total > 0 ? (neutral / total) * 100 : 0
  const negPct = total > 0 ? (negative / total) * 100 : 0

  return (
    <div className="w-full space-y-1.5">
      <div
        className="w-full flex rounded-full overflow-hidden bg-stone/30"
        style={{ height }}
      >
        <div
          style={{ width: `${posPct}%` }}
          className="bg-teal transition-all duration-500"
          title={`Positive: ${positive} (${posPct.toFixed(1)}%)`}
        />
        <div
          style={{ width: `${neuPct}%` }}
          className="bg-stone transition-all duration-500"
          title={`Neutral: ${neutral} (${neuPct.toFixed(1)}%)`}
        />
        <div
          style={{ width: `${negPct}%` }}
          className="bg-coral transition-all duration-500"
          title={`Negative: ${negative} (${negPct.toFixed(1)}%)`}
        />
      </div>

      {showLabels && (
        <div className="flex justify-between items-center text-xs font-mono text-graphite px-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal" />
            <span>{posPct.toFixed(0)}% Pos</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-stone" />
            <span>{neuPct.toFixed(0)}% Neu</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-coral" />
            <span>{negPct.toFixed(0)}% Neg</span>
          </span>
        </div>
      )}
    </div>
  )
}
export default SentimentBar
