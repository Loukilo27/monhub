import { useState } from 'react'

/**
 * Écoutes par jour (mois) ou par mois (année) : une seule série, en barres.
 * Barres fines arrondies en haut, 2 px d'écart, grille discrète, info-bulle au survol / focus,
 * et un tableau des valeurs pour les lecteurs d'écran.
 */
export function ListeningChart({ data, unit }: { data: { label: string; count: number }[]; unit: 'jour' | 'mois' }) {
  const [active, setActive] = useState<number | null>(null)
  const width = 640
  const height = 180
  const padding = { top: 12, right: 8, bottom: 22, left: 8 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const max = Math.max(1, ...data.map((item) => item.count))
  const slot = plotWidth / Math.max(1, data.length)
  // Barres fines : 2 px d'écart, 28 px au plus.
  const barWidth = Math.max(2, Math.min(slot - 2, 28))
  const radius = Math.min(4, barWidth / 2)
  const labelEvery = data.length > 16 ? 5 : 1
  const best = data.reduce((top, item, index) => (item.count > (data[top]?.count ?? -1) ? index : top), 0)

  /** Barre ancrée sur la ligne de base, coins supérieurs arrondis. */
  const barPath = (x: number, y: number, w: number, h: number) => {
    if (h <= 0) return ''
    const r = Math.min(radius, h)
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
  }

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`Écoutes par ${unit}`} onMouseLeave={() => setActive(null)}>
        {/* Grille discrète : ligne de base et repère du maximum (sa valeur est écrite au-dessus de la plus haute barre). */}
        <line x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} stroke="var(--border)" />
        <line x1={padding.left} x2={width - padding.right} y1={padding.top} y2={padding.top} stroke="var(--border)" strokeDasharray="3 4" />
        {data.map((item, index) => {
          const h = (item.count / max) * plotHeight
          const x = padding.left + index * slot + (slot - barWidth) / 2
          const y = padding.top + plotHeight - h
          return (
            <g key={item.label}>
              <path d={barPath(x, y, barWidth, h)} fill="var(--chart-1)" opacity={active === null || active === index ? 1 : 0.45} />
              {/* Zone de survol plus large que la barre. */}
              <rect
                x={padding.left + index * slot}
                y={padding.top}
                width={slot}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                aria-label={`${item.label} : ${item.count} écoute${item.count > 1 ? 's' : ''}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none focus-visible:stroke-accent"
              />
              {(index % labelEvery === 0 || index === data.length - 1) && (
                <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
                  {item.label}
                </text>
              )}
            </g>
          )
        })}
        {/* Seule valeur écrite en permanence : le maximum. */}
        {data[best]?.count > 0 && active === null && (
          <text
            x={padding.left + best * slot + slot / 2}
            y={padding.top + plotHeight - (data[best].count / max) * plotHeight - 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="var(--text)"
          >
            {data[best].count}
          </text>
        )}
      </svg>
      {active !== null && data[active] && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-border bg-surface px-2 py-1 text-xs shadow-soft"
          style={{ left: `${((padding.left + active * slot + slot / 2) / width) * 100}%` }}
        >
          <span className="font-semibold">{data[active].count}</span> écoute{data[active].count > 1 ? 's' : ''} · {data[active].label}
        </div>
      )}
      <table className="sr-only">
        <caption>Écoutes par {unit}</caption>
        <tbody>
          {data.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
