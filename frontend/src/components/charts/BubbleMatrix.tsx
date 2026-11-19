import React from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { OpportunityMapItem } from '../../types'

interface BubbleMatrixProps {
  data: OpportunityMapItem[]
  onSelectBubble?: (item: OpportunityMapItem) => void
}

export const BubbleMatrix: React.FC<BubbleMatrixProps> = ({ data, onSelectBubble }) => {
  const getQuadrantColor = (item: OpportunityMapItem) => {
    // Effort <= 5 & Pain >= 50: Quick Wins
    // Effort > 5 & Pain >= 50: Strategic
    // Effort <= 5 & Pain < 50: Low Hanging / Investigate
    // Effort > 5 & Pain < 50: Low Priority
    if (item.effort_estimate <= 5 && item.pain_score >= 50) return '#E36B4B' // Coral - Quick Win
    if (item.effort_estimate > 5 && item.pain_score >= 50) return '#377E75' // Teal - Strategic
    if (item.effort_estimate <= 5 && item.pain_score < 50) return '#C5D66B' // Citron - Investigate
    return '#596662' // Graphite/Stone - Low Priority
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload as OpportunityMapItem
      return (
        <div className="bg-white p-3 rounded-xl border border-stone shadow-lg text-xs space-y-1">
          <p className="font-display font-semibold text-pine text-sm">{p.aspect}</p>
          <div className="font-mono text-graphite space-y-0.5">
            <p>Pain Score: <span className="font-semibold text-coral">{p.pain_score.toFixed(1)}</span></p>
            <p>Effort Estimate: <span className="font-semibold text-pine">{p.effort_estimate}/10</span></p>
            <p>Customer Mentions: <span className="font-semibold text-pine">{p.mention_count}</span></p>
            <p className="capitalize text-[10px] text-teal pt-1 font-sans font-medium">Click to adjust effort</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="relative w-full h-96 card-editorial p-4 flex flex-col justify-between">
      {/* Quadrant corner badges */}
      <div className="absolute top-6 left-16 text-[10px] font-mono uppercase tracking-widest text-coral/80 bg-coral/10 px-2 py-0.5 rounded">
        Quick Wins (High Pain, Low Effort)
      </div>
      <div className="absolute top-6 right-8 text-[10px] font-mono uppercase tracking-widest text-teal/80 bg-teal/10 px-2 py-0.5 rounded">
        Strategic Bets (High Pain, High Effort)
      </div>
      <div className="absolute bottom-12 left-16 text-[10px] font-mono uppercase tracking-widest text-pine/80 bg-citron/20 px-2 py-0.5 rounded">
        Incremental / Investigate
      </div>
      <div className="absolute bottom-12 right-8 text-[10px] font-mono uppercase tracking-widest text-graphite/80 bg-stone/30 px-2 py-0.5 rounded">
        Low Priority
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 30, bottom: 20, left: 20 }}>
          <XAxis
            type="number"
            dataKey="effort_estimate"
            name="Effort"
            domain={[1, 10]}
            tickCount={10}
            stroke="#596662"
            fontFamily="IBM Plex Mono"
            fontSize={11}
            label={{
              value: 'Estimated Implementation Effort (1 = Low, 10 = High) →',
              position: 'insideBottom',
              offset: -10,
              fontSize: 11,
              fontFamily: 'IBM Plex Mono',
              fill: '#596662',
            }}
          />
          <YAxis
            type="number"
            dataKey="pain_score"
            name="Pain Score"
            domain={[0, 100]}
            stroke="#596662"
            fontFamily="IBM Plex Mono"
            fontSize={11}
            label={{
              value: 'Customer Pain Score (0–100) ↑',
              angle: -90,
              position: 'insideLeft',
              fontSize: 11,
              fontFamily: 'IBM Plex Mono',
              fill: '#596662',
            }}
          />
          <ZAxis type="number" dataKey="mention_count" range={[150, 1200]} />
          <ReferenceLine x={5.5} stroke="#D9D8CC" strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="#D9D8CC" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            data={data}
            onClick={(node: any) => onSelectBubble && onSelectBubble(node?.payload || node)}
            cursor="pointer"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getQuadrantColor(entry)}
                stroke="#182D29"
                strokeWidth={1}
                fillOpacity={0.85}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
export default BubbleMatrix
