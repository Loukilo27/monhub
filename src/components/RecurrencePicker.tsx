import {
  describeRecurrence,
  formatRRule,
  isoWeekday,
  parseRRule,
  type Frequency,
  type Recurrence,
} from '../../supabase/functions/_shared/recurrence'
import { inputBase } from './Modal'

const FREQUENCIES: { value: Frequency | 'NONE'; label: string }[] = [
  { value: 'NONE', label: 'Ne se répète pas' },
  { value: 'DAILY', label: 'Jour(s)' },
  { value: 'WEEKLY', label: 'Semaine(s)' },
  { value: 'MONTHLY', label: 'Mois' },
  { value: 'YEARLY', label: 'Année(s)' },
]
const DAY_INITIALS = ['', 'L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** Choix d'une récurrence (quotidienne, jours de la semaine, mensuelle, annuelle, tous les N…), au format RRULE. */
export function RecurrencePicker({ value, startDate, onChange }: {
  value: string | null
  /** Date de départ « AAAA-MM-JJ » (jour de la semaine / du mois par défaut). */
  startDate: string
  onChange: (rule: string | null) => void
}) {
  const rule = parseRRule(value)
  const update = (patch: Partial<Recurrence>) => {
    if (!rule) return
    onChange(formatRRule({ ...rule, ...patch }))
  }
  const setFrequency = (freq: Frequency | 'NONE') => {
    if (freq === 'NONE') return onChange(null)
    onChange(
      formatRRule({
        freq,
        interval: 1,
        byDay: freq === 'WEEKLY' ? [isoWeekday(startDate)] : [],
        byMonthDay: freq === 'MONTHLY' ? Number(startDate.slice(8, 10)) : null,
        until: null,
        count: null,
      }),
    )
  }
  const end = rule?.until ? 'until' : rule?.count ? 'count' : 'never'

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium">Répétition</legend>
      <div className="flex flex-wrap items-center gap-2">
        {rule && (
          <>
            <span className="text-sm">Tous les</span>
            <input
              type="number"
              min={1}
              max={99}
              aria-label="Intervalle"
              value={rule.interval}
              onChange={(event) => update({ interval: Math.max(1, Number(event.target.value) || 1) })}
              className={`${inputBase} max-w-20`}
            />
          </>
        )}
        <select
          aria-label="Fréquence"
          value={rule?.freq ?? 'NONE'}
          onChange={(event) => setFrequency(event.target.value as Frequency | 'NONE')}
          className={`${inputBase} w-auto flex-1`}
        >
          {FREQUENCIES.map((frequency) => (
            <option key={frequency.value} value={frequency.value}>
              {frequency.label}
            </option>
          ))}
        </select>
      </div>

      {rule?.freq === 'WEEKLY' && (
        <div className="flex justify-between gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const active = rule.byDay.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                aria-label={DAY_NAMES[day]}
                onClick={() => {
                  const byDay = active ? rule.byDay.filter((value) => value !== day) : [...rule.byDay, day].sort()
                  update({ byDay: byDay.length ? byDay : [day] })
                }}
                className="size-10 rounded-full border border-border text-sm font-medium aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-contrast"
              >
                {DAY_INITIALS[day]}
              </button>
            )
          })}
        </div>
      )}

      {rule?.freq === 'MONTHLY' && (
        <label className="flex items-center gap-2 text-sm">
          Le
          <input
            type="number"
            min={1}
            max={31}
            value={rule.byMonthDay ?? Number(startDate.slice(8, 10))}
            onChange={(event) => update({ byMonthDay: Math.min(31, Math.max(1, Number(event.target.value) || 1)) })}
            className={`${inputBase} max-w-20`}
          />
          du mois
        </label>
      )}

      {rule && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            aria-label="Fin de la répétition"
            value={end}
            onChange={(event) =>
              update(
                event.target.value === 'until'
                  ? { until: startDate, count: null }
                  : event.target.value === 'count'
                    ? { count: 10, until: null }
                    : { until: null, count: null },
              )
            }
            className={`${inputBase} max-w-fit`}
          >
            <option value="never">Sans fin</option>
            <option value="until">Jusqu’au</option>
            <option value="count">Nombre de fois</option>
          </select>
          {end === 'until' && (
            <input
              type="date"
              aria-label="Date de fin"
              value={rule.until ?? startDate}
              min={startDate}
              onChange={(event) => event.target.value && update({ until: event.target.value })}
              className={`${inputBase} max-w-fit`}
            />
          )}
          {end === 'count' && (
            <input
              type="number"
              min={1}
              max={999}
              aria-label="Nombre d’occurrences"
              value={rule.count ?? 10}
              onChange={(event) => update({ count: Math.max(1, Number(event.target.value) || 1) })}
              className={`${inputBase} max-w-24`}
            />
          )}
        </div>
      )}

      {rule && <p className="text-sm text-muted">{describeRecurrence(rule, startDate)}</p>}
    </fieldset>
  )
}
