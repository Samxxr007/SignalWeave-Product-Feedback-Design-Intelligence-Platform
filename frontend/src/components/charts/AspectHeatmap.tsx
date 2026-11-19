import React from 'react'

export interface HeatmapItem {
  aspect: string
  category: string
  sentiment_score: number // -1.0 to 1.0
  mention_count: number
}

interface AspectHeatmapProps {
  data: HeatmapItem[]
  onAspectClick?: (aspect: string) => void
}

export const AspectHeatmap: React.FC<AspectHeatmapProps> = ({ data, onAspectClick }) => {
  // Get distinct categories and aspects
  const categories = Array.from(new Set(data.map((d) => d.category)))
  const aspects = Array.from(new Set(data.map((d) => d.aspect)))

  const getColor = (score: number) => {
    // Map -1.0 (coral) to 0.0 (stone/ivory) to 1.0 (teal)
    if (score < -0.2) {
      const alpha = Math.min(1, Math.max(0.15, Math.abs(score)))
      return `rgba(227, 107, 75, ${alpha})`
    } else if (score > 0.2) {
      const alpha = Math.min(1, Math.max(0.15, score))
      return `rgba(55, 126, 117, ${alpha})`
    } else {
      return 'rgba(217, 216, 204, 0.4)'
    }
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="border-collapse text-xs w-full">
        <thead>
          <tr>
            <th className="p-2 text-left font-mono text-graphite border-b border-stone">Aspect</th>
            {categories.map((cat) => (
              <th
                key={cat}
                className="p-2 text-center font-mono text-graphite border-b border-stone max-w-[120px] truncate"
              >
                {cat}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {aspects.map((asp) => (
            <tr key={asp} className="hover:bg-ivory/40">
              <td
                onClick={() => onAspectClick && onAspectClick(asp)}
                className="p-2 font-mono text-pine font-medium border-b border-stone/30 cursor-pointer hover:text-teal truncate max-w-[160px]"
              >
                {asp}
              </td>
              {categories.map((cat) => {
                const cell = data.find((d) => d.aspect === asp && d.category === cat)
                if (!cell) {
                  return (
                    <td key={cat} className="p-2 text-center border-b border-stone/30 text-stone">
                      -
                    </td>
                  )
                }
                return (
                  <td
                    key={cat}
                    onClick={() => onAspectClick && onAspectClick(asp)}
                    className="p-2 text-center border-b border-stone/30 cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: getColor(cell.sentiment_score) }}
                    title={`${asp} in ${cat}: Score ${cell.sentiment_score.toFixed(2)} (${cell.mention_count} mentions)`}
                  >
                    <span className="font-mono text-[11px] font-semibold text-pine">
                      {cell.sentiment_score.toFixed(1)}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
export default AspectHeatmap
