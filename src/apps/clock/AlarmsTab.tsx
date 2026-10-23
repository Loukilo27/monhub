import { Play, Plus, Square, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { buttonPrimary, buttonSecondary, inputBase, Modal } from '../../components/Modal'
import { useToast } from '../../components/toast'
import { formatClockTime } from '../../lib/time'
import { useNowMinute } from '../../lib/useNow'
import { nextAlarmOccurrence } from '../../../supabase/functions/_shared/zonedTime'
import { DAY_INITIALS, DAY_NAMES, describeDays, findNextAlarm, formatCountdown, newAlarm, useAlarmActions, useAlarms, useTimeZone } from './alarms'
import { ALARM_SOUNDS, playSound } from './sounds'
import type { Alarm } from './types'

/** « dans 7 h 12 min » jusqu'à la prochaine sonnerie (appelé dans les gestionnaires d'événements). */
function untilNextRing(alarm: Alarm, timeZone: string): string {
  const now = new Date()
  return formatCountdown(nextAlarmOccurrence(alarm, now, timeZone).getTime() - now.getTime())
}

export function AlarmsTab() {
  const now = useNowMinute()
  const timeZone = useTimeZone()
  const alarms = [...(useAlarms().data ?? [])].sort((a, b) => a.time.localeCompare(b.time))
  const { saveAlarm, deleteAlarm } = useAlarmActions()
  const toast = useToast()
  const [editing, setEditing] = useState<Alarm | null>(null)
  const next = findNextAlarm(alarms, now, timeZone)

  const toggle = async (alarm: Alarm) => {
    const updated = { ...alarm, enabled: !alarm.enabled }
    await saveAlarm(updated)
    if (updated.enabled) toast(`Alarme ${untilNextRing(updated, timeZone)}.`, 'success')
  }

  return (
    <div className="space-y-3 py-2">
      <p className="text-center text-sm text-muted">
        {next ? `Prochaine alarme ${formatCountdown(next.at.getTime() - now.getTime())}` : 'Aucune alarme active'}
      </p>
      <ul className="space-y-2">
        {alarms.map((alarm) => (
          <li key={alarm.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface shadow-soft">
            <button
              type="button"
              onClick={() => setEditing(alarm)}
              aria-label={`Modifier l’alarme de ${alarm.time}`}
              className={`min-w-0 flex-1 px-4 py-3 text-left ${alarm.enabled ? '' : 'opacity-50'}`}
            >
              <span className="block text-4xl font-light tabular-nums">{formatClockTime(alarm.time)}</span>
              <span className="block truncate text-sm text-muted">
                {[alarm.label, describeDays(alarm.days)].filter(Boolean).join(' · ')}
              </span>
            </button>
            <label className="mr-4 flex min-h-11 cursor-pointer items-center">
              <span className="sr-only">Activer l’alarme de {alarm.time}</span>
              <input type="checkbox" role="switch" checked={alarm.enabled} onChange={() => void toggle(alarm)} className="peer sr-only" />
              <span
                aria-hidden
                className="relative h-7 w-12 rounded-full bg-surface-2 ring-1 ring-border transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
              />
            </label>
          </li>
        ))}
      </ul>
      {alarms.length === 0 && <p className="py-6 text-center text-muted">Aucune alarme pour l’instant.</p>}
      <button type="button" onClick={() => setEditing(newAlarm())} className="mx-auto flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-medium text-accent-contrast">
        <Plus aria-hidden className="size-5" />
        Nouvelle alarme
      </button>
      {editing && (
        <AlarmEditor
          alarm={editing}
          isNew={!alarms.some((alarm) => alarm.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={async (alarm) => {
            setEditing(null)
            await saveAlarm(alarm)
            toast(`Alarme réglée ${untilNextRing(alarm, timeZone)}.`, 'success')
          }}
          onDelete={async (alarm) => {
            setEditing(null)
            await deleteAlarm(alarm)
          }}
        />
      )}
    </div>
  )
}

function AlarmEditor({ alarm, isNew, onClose, onSave, onDelete }: {
  alarm: Alarm
  isNew: boolean
  onClose: () => void
  onSave: (alarm: Alarm) => void
  onDelete: (alarm: Alarm) => void
}) {
  const [draft, setDraft] = useState<Alarm>({ ...alarm, enabled: true })
  const [previewing, setPreviewing] = useState<(() => void) | null>(null)
  useEffect(() => () => previewing?.(), [previewing])

  const toggleDay = (day: number) =>
    setDraft((current) => ({
      ...current,
      days: current.days.includes(day) ? current.days.filter((value) => value !== day) : [...current.days, day].sort(),
    }))

  const preview = () => {
    if (previewing) {
      previewing()
      setPreviewing(null)
      return
    }
    const stop = playSound(draft.sound, { maxSeconds: 4 })
    setPreviewing(() => stop)
    setTimeout(() => setPreviewing(null), 4000)
  }

  return (
    <Modal
      title={isNew ? 'Nouvelle alarme' : 'Modifier l’alarme'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button type="button" onClick={() => onDelete(alarm)} className={`${buttonSecondary} text-danger`} aria-label="Supprimer l’alarme">
              <Trash2 aria-hidden className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Annuler
          </button>
          <button type="button" onClick={() => onSave(draft)} className={buttonPrimary}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-5 pt-2">
        <label className="block">
          <span className="sr-only">Heure</span>
          <input
            type="time"
            required
            value={draft.time}
            onChange={(event) => event.target.value && setDraft({ ...draft, time: event.target.value })}
            className="mx-auto block rounded-2xl bg-surface-2 px-4 py-2 text-center text-5xl font-light tabular-nums outline-none focus:ring-2 focus:ring-accent"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Répéter · {describeDays(draft.days)}</legend>
          <div className="flex justify-between gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={draft.days.includes(day)}
                aria-label={DAY_NAMES[day]}
                onClick={() => toggleDay(day)}
                className="size-11 rounded-full border border-border font-medium aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-contrast"
              >
                {DAY_INITIALS[day]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Nom</span>
          <input
            value={draft.label}
            maxLength={60}
            placeholder="Réveil, Sport…"
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            className={inputBase}
          />
        </label>

        <div className="flex items-end gap-2">
          <label className="block flex-1 space-y-1.5">
            <span className="text-sm font-medium">Sonnerie</span>
            <select value={draft.sound} onChange={(event) => setDraft({ ...draft, sound: event.target.value })} className={inputBase}>
              {ALARM_SOUNDS.map((sound) => (
                <option key={sound.id} value={sound.id}>
                  {sound.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={preview} className={buttonSecondary} aria-label={previewing ? 'Arrêter l’écoute' : 'Écouter la sonnerie'}>
            {previewing ? <Square aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Reporter de</span>
          <select
            value={draft.snooze_minutes}
            onChange={(event) => setDraft({ ...draft, snooze_minutes: Number(event.target.value) })}
            className={inputBase}
          >
            {[5, 10, 15, 20, 30].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  )
}
