'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { chartTheme } from '@/lib/chart-theme'
import { formatNumber, formatPercent } from '@/lib/format'

export type Slice = { name: string; value: number; color: string }

/** Shared donut for the resolution ratio and the sentiment breakdown. */
export const DonutChart = ({ data }: { data: Slice[] }) => {
  const total = data.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="flex items-center gap-6">
      <div className="h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={44}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: chartTheme.tooltipBg,
                border: `1px solid ${chartTheme.tooltipBorder}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: chartTheme.font.sans,
              }}
              itemStyle={{ color: chartTheme.text }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-2">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2 text-body-sm">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: slice.color }}
            />
            <span className="flex-1 text-muted">{slice.name}</span>
            <span className="font-mono text-caption text-foreground">
              {formatNumber(slice.value)}
            </span>
            <span className="w-12 text-right font-mono text-caption text-muted">
              {total === 0 ? '—' : formatPercent(slice.value / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
