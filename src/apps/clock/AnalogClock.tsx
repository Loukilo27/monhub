/** Cadran analogique en SVG (aiguilles des heures et des minutes, trotteuse en option). */
export function AnalogClock({ date, timeZone = 'Europe/Paris', showSeconds = false, className = '' }: {
  date: Date
  timeZone?: string
  showSeconds?: boolean
  className?: string
}) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const hours = get('hour') % 12
  const minutes = get('minute')
  const seconds = get('second')

  const hourAngle = (hours + minutes / 60) * 30
  const minuteAngle = (minutes + seconds / 60) * 6
  const secondAngle = seconds * 6

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${get('hour')} h ${String(minutes).padStart(2, '0')}`} className={className}>
      <circle cx="50" cy="50" r="48" fill="var(--surface-2)" />
      {[...Array(12).keys()].map((index) => (
        <line
          key={index}
          x1="50"
          y1={index % 3 === 0 ? 7 : 9}
          x2="50"
          y2="13"
          stroke="var(--muted)"
          strokeWidth={index % 3 === 0 ? 2.5 : 1.5}
          strokeLinecap="round"
          transform={`rotate(${index * 30} 50 50)`}
        />
      ))}
      <line x1="50" y1="50" x2="50" y2="27" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="15" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
      {showSeconds && (
        <line x1="50" y1="58" x2="50" y2="12" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${secondAngle} 50 50)`} />
      )}
      <circle cx="50" cy="50" r="3" fill="var(--accent)" />
    </svg>
  )
}
