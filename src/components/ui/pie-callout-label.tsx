import type { PieLabelRenderProps } from 'recharts'

const RADIAN = Math.PI / 180

function formatChartNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString('pt-BR')
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatPieLabel(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.length > 18 ? `${text.slice(0, 17)}...` : text
}

export function renderPieCalloutLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0)
  const cy = Number(props.cy ?? 0)
  const midAngle = Number(props.midAngle ?? 0)
  const outerRadius = Number(props.outerRadius ?? 0)
  const payload = props.payload as Record<string, unknown> | undefined
  const label = formatPieLabel(props.name ?? payload?.name ?? payload?.level)

  if (!label || !Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(outerRadius)) {
    return null
  }

  const cos = Math.cos(-RADIAN * midAngle)
  const sin = Math.sin(-RADIAN * midAngle)
  const startX = cx + (outerRadius + 4) * cos
  const startY = cy + (outerRadius + 4) * sin
  const middleX = cx + (outerRadius + 16) * cos
  const middleY = cy + (outerRadius + 16) * sin
  const endX = middleX + (cos >= 0 ? 24 : -24)
  const textX = endX + (cos >= 0 ? 5 : -5)
  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      <path
        d={`M${startX},${startY}L${middleX},${middleY}L${endX},${middleY}`}
        fill="none"
        stroke="#64748b"
        strokeWidth={1}
      />
      <text
        x={textX}
        y={middleY}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fill="#475569"
        fontSize={11}
        fontWeight={400}
      >
        {label}
      </text>
    </g>
  )
}

export function PieCenterTotal({ total, label = 'Total' }: { total: number | string; label?: string }) {
  const formattedTotal = typeof total === 'number' ? formatChartNumber(total) : total

  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
      <tspan x="50%" dy="-0.16em" fill="#0f172a" fontSize={18} fontWeight={900}>
        {formattedTotal}
      </tspan>
      <tspan x="50%" dy="1.35em" fill="#64748b" fontSize={9.5} fontWeight={700}>
        {label}
      </tspan>
    </text>
  )
}
