'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { chartTheme } from '@/lib/chart-theme'
import { nl } from '@/lib/nl'

export type DailyVisitorPoint = { bucket: string; visitors: number }

const axisStyle = {
  fill: chartTheme.axis,
  fontSize: 11,
  fontFamily: chartTheme.font.mono,
}

/** `YYYY-MM-DD` -> `4 aug` for the x-axis. */
function formatDay(iso: string) {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
}

export const DailyVisitorsChart = ({ data }: { data: DailyVisitorPoint[] }) => (
  <ResponsiveContainer width="100%" height={240}>
    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
      <CartesianGrid stroke={chartTheme.grid} vertical={false} />
      <XAxis
        dataKey="bucket"
        tickFormatter={formatDay}
        tick={axisStyle}
        tickLine={false}
        axisLine={{ stroke: chartTheme.grid }}
        minTickGap={24}
      />
      <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
      <Tooltip
        cursor={{ fill: chartTheme.grid, opacity: 0.4 }}
        labelFormatter={(v) => (typeof v === 'string' ? formatDay(v) : '')}
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
      <Bar
        dataKey="visitors"
        name={nl.analytics.kpi.visitors}
        fill={chartTheme.series.primary}
        radius={[3, 3, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
)
