'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { chartTheme } from '@/lib/chart-theme'
import { formatBucket } from '@/lib/format'
import { nl } from '@/lib/nl'

export type VolumePoint = {
  bucket: string
  resolved: number
  escalated: number
  abandoned: number
}

const axisStyle = {
  fill: chartTheme.axis,
  fontSize: 11,
  fontFamily: chartTheme.font.mono,
}

export const VolumeChart = ({
  data,
  bucket,
}: {
  data: VolumePoint[]
  bucket: 'day' | 'week' | 'month'
}) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
      <CartesianGrid stroke={chartTheme.grid} vertical={false} />
      <XAxis
        dataKey="bucket"
        tickFormatter={(v: string) => formatBucket(v, bucket)}
        tick={axisStyle}
        tickLine={false}
        axisLine={{ stroke: chartTheme.grid }}
        minTickGap={24}
      />
      <YAxis
        tick={axisStyle}
        tickLine={false}
        axisLine={false}
        allowDecimals={false}
      />
      <Tooltip
        cursor={{ fill: chartTheme.grid, opacity: 0.4 }}
        labelFormatter={(v) =>
          typeof v === 'string' ? formatBucket(v, bucket) : ''
        }
        contentStyle={{
          background: chartTheme.tooltipBg,
          border: `1px solid ${chartTheme.tooltipBorder}`,
          borderRadius: 8,
          fontSize: 13,
          fontFamily: chartTheme.font.sans,
        }}
        labelStyle={{ color: chartTheme.text }}
        itemStyle={{ color: chartTheme.text }}
      />
      <Legend
        wrapperStyle={{
          fontSize: 12,
          fontFamily: chartTheme.font.sans,
          color: chartTheme.muted,
        }}
      />
      <Bar
        dataKey="resolved"
        stackId="a"
        name={nl.agents.outcome.resolved}
        fill={chartTheme.series.resolved}
      />
      <Bar
        dataKey="escalated"
        stackId="a"
        name={nl.agents.outcome.escalated}
        fill={chartTheme.series.escalated}
      />
      <Bar
        dataKey="abandoned"
        stackId="a"
        name={nl.agents.outcome.abandoned}
        fill={chartTheme.series.abandoned}
        radius={[3, 3, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
)
