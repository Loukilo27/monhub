import { useMemo, useState } from 'react'
import { timeZoneOffsetMinutes } from '../../supabase/functions/_shared/zonedTime'
import { buttonSecondary, inputBase } from '../components/Modal'
import { useToast } from '../components/toast'
import { useSettings, useUpdatePreferences, useUpdateSettings } from '../data/queries'
import { formatTime, hourCycle, type HourCycle } from '../lib/time'
import { useNowMinute } from '../lib/useNow'
import { rescheduleReminders } from './reschedule'

function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

/** « Paris — Europe (UTC+02:00) », triés par décalage puis par nom. */
function timeZoneOptions(current: string): { value: string; label: string }[] {
  const now = new Date()
  const zones = new Set(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [])
  zones.add(current)
  return [...zones]
    .map((zone) => {
      const offset = timeZoneOffsetMinutes(now, zone)
      const [region, ...rest] = zone.split('/')
      const city = (rest.at(-1) ?? region).replace(/_/g, ' ')
      return { value: zone, offset, label: `${city}${rest.length ? ` — ${region}` : ''} (${offsetLabel(offset)})` }
    })
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label, 'fr'))
}

const FORMATS: { value: HourCycle; label: string }[] = [
  { value: 'h23', label: '24 heures' },
  { value: 'h12', label: '12 heures' },
]

/** Fuseau horaire (utilisé aussi par le serveur pour les rappels et l'assistant) et format d'heure. */
export function DateTimeSettings() {
  const toast = useToast()
  const settings = useSettings().data
  const updateSettings = useUpdateSettings()
  const updatePreferences = useUpdatePreferences()
  const timeZone = settings?.timeZone ?? 'Europe/Paris'
  const format = settings?.preferences.timeFormat ?? hourCycle()
  const options = useMemo(() => timeZoneOptions(timeZone), [timeZone])
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [busy, setBusy] = useState(false)
  const now = useNowMinute()

  const changeZone = async (zone: string) => {
    if (zone === timeZone) return
    setBusy(true)
    try {
      await updateSettings.mutateAsync({ timeZone: zone })
      await rescheduleReminders(zone)
      toast('Fuseau horaire changé : alarmes et rappels reprogrammés.', 'success')
    } catch {
      toast('Rappels non reprogrammés. Vérifie ta connexion.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <label className="block">
        <span className="mb-1 block">Fuseau horaire</span>
        <select value={timeZone} disabled={busy} onChange={(event) => void changeZone(event.target.value)} className={inputBase}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {deviceZone && deviceZone !== timeZone && (
        <button type="button" disabled={busy} onClick={() => void changeZone(deviceZone)} className={buttonSecondary}>
          Utiliser celui de cet appareil ({deviceZone.replace(/_/g, ' ')})
        </button>
      )}

      <div>
        <span className="mb-1 block">Format d’heure</span>
        <div role="radiogroup" aria-label="Format d’heure" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {FORMATS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={format === option.value}
              onClick={() => updatePreferences({ timeFormat: option.value })}
              className="min-h-11 rounded-lg font-medium transition-colors aria-checked:bg-surface aria-checked:shadow-soft"
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">Il est {formatTime(now, timeZone)}.</p>
      </div>
    </div>
  )
}
