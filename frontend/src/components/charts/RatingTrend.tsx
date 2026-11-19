import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { TrendPoint } from '../../types'

interface RatingTrendProps {
  data: TrendPoint[]
  categories?: string[]
}

const PALETTE = ['#377E75', '#E36B4B', '#C5D66B', '#182D29', '#596662']

export const RatingTrend: React.FC<RatingTrendProps> = ({ data, categories }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D9D8CC" vertical={false} />
          <XAxis
            dataKey="period"
            stroke="#596662"
            fontSize={11}
            tickLine={false}
            fontFamily="IBM Plex Mono"
          />
          <YAxis
            stroke="#596662"
            fontSize={11}
            tickLine={false}
            fontFamily="IBM Plex Mono"
            domain={[1, 5]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#D9D8CC',
              borderRadius: '8px',
              fontFamily: 'Manrope',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          {categories && categories.length > 0 ? (
            categories.map((cat, idx) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))
          ) : (
            <Line
              type="monotone"
              dataKey="avg_rating"
              name="Avg Rating"
              stroke="#377E75"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          {categories && categories.length > 0 && <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Manrope' }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
export default RatingTrend
