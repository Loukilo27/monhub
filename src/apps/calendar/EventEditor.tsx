import { MapPin, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { localDate } from '../../../supabase/functions/_shared/events'
import { zonedParts, zonedToUtc } from '../../../supabase/functions/_shared/zonedTime'
import { buttonPrimary, buttonSecondary, inputBase, Modal } from '../../components/Modal'
import { RecurrencePicker } from '../../components/RecurrencePicker'
import { useTimeZone } from '../../data/queries'
import { useEventActions } from './data'
import { describeOffset, EVENT_COLORS, EVENT_REMINDER_CHOICES, type CalendarEvent } from './types'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localTime(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

function toInstant(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return zonedToUtc(year, month, day, hour, minute, timeZone)
}

/**
 * Création / modification d'un événement. Pour une série, `occurrenceDate` permet de supprimer
 * seulement l'occurrence cliquée.
 */
export function EventEditor({ event, isNew, occurrenceDate, onClose, onSwitchToTask }: {
  event: CalendarEvent
  isNew: boolean
  occurrenceDate?: string
  onClose: () => void
  /** Création depuis le calendrier : proposer d'en faire plutôt une tâche datée. */
  onSwitchToTask?: (draft: Pick<CalendarEvent, 'title' | 'start_at' | 'all_day'>) => void
}) {
  const timeZone = useTimeZone()
  const actions = useEventActions()
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)
  const [title, setTitle] = useState(event.title)
  const [allDay, setAllDay] = useState(event.all_day)
  const [startDate, setStartDate] = useState(localDate(start, timeZone))
  const [startTime, setStartTime] = useState(localTime(start, timeZone))
  // Journée entière : la fin est enregistrée exclusive (minuit le lendemain), affichée inclusive.
  const [endDate, setEndDate] = useState(localDate(event.all_day ? new Date(end.getTime() - 1) : end, timeZone))
  const [endTime, setEndTime] = useState(localTime(end, timeZone))
  const [location, setLocation] = useState(event.location)
  const [description, setDescription] = useState(event.description)
  const [color, setColor] = useState(event.color)
  const [rule, setRule] = useState(event.recurrence_rule)
  const [offsets, setOffsets] = useState(event.reminder_offsets)
  const [askDelete, setAskDelete] = useState(false)

  const startAt = allDay ? toInstant(startDate, '00:00', timeZone) : toInstant(startDate, startTime, timeZone)
  const endAt = allDay ? toInstant(endDate, '00:00', timeZone).getTime() + 86_400_000 : toInstant(endDate, endTime, timeZone).getTime()
  const valid = title.trim() !== '' && endAt >= startAt.getTime()

  const save = async () => {
    if (!valid) return
    onClose()
    await actions.saveEvent({
      ...event,
      title: title.trim(),
      all_day: allDay,
      start_at: startAt.toISOString(),
      end_at: new Date(endAt).toISOString(),
      location: location.trim(),
      description,
      color,
      recurrence_rule: rule,
      reminder_offsets: [...offsets].sort((a, b) => a - b),
    })
  }

  const changeStartDate = (value: string) => {
    if (!value) return
    // Décale la fin pour garder la même durée.
    const shift = new Date(`${value}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()
    setStartDate(value)
    setEndDate(new Date(new Date(`${endDate}T00:00:00Z`).getTime() + shift).toISOString().slice(0, 10))
  }

  return (
    <Modal
      title={isNew ? 'Nouvel événement' : 'Modifier l’événement'}
      onClose={onClose}
      footer={
        askDelete ? (
          <>
            <span className="flex-1 self-center text-sm">Supprimer…</span>
            {occurrenceDate && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  void actions.deleteOccurrence(event, occurrenceDate)
                }}
                className={`${buttonSecondary} text-danger`}
              >
                Cette occurrence
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose()
                void actions.deleteEvent(event)
              }}
              className={`${buttonSecondary} text-danger`}
            >
              {rule ? 'Toute la série' : 'Confirmer'}
            </button>
            <button type="button" onClick={() => setAskDelete(false)} className={buttonSecondary}>
              Annuler
            </button>
          </>
        ) : (
          <>
            {!isNew && (
              <button type="button" aria-label="Supprimer l’événement" onClick={() => setAskDelete(true)} className={`${buttonSecondary} text-danger`}>
                <Trash2 aria-hidden className="size-4" />
              </button>
            )}
            <button type="button" onClick={onClose} className={buttonSecondary}>
              Annuler
            </button>
            <button type="button" disabled={!valid} onClick={() => void save()} className={buttonPrimary}>
              Enregistrer
            </button>
          </>
        )
      }
    >
      <div className="space-y-4 pt-1">
        <input
          autoFocus={isNew}
          aria-label="Titre"
          placeholder="Titre"
          value={title}
          onChange={(input) => setTitle(input.target.value)}
          onKeyDown={(key) => key.key === 'Enter' && void save()}
          className={`${inputBase} text-lg font-medium`}
        />

        {onSwitchToTask && (
          <button
            type="button"
            onClick={() => onSwitchToTask({ title, start_at: startAt.toISOString(), all_day: allDay })}
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            Créer plutôt une tâche à cette date
          </button>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={allDay} onChange={(input) => setAllDay(input.target.checked)} className="size-5 accent-[var(--accent)]" />
          <span className="text-sm font-medium">Journée entière</span>
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Début</span>
            <input type="date" value={startDate} onChange={(input) => changeStartDate(input.target.value)} className={inputBase} />
          </label>
          {!allDay && (
            <label className="block space-y-1">
              <span className="sr-only">Heure de début</span>
              <span aria-hidden className="block text-sm">&nbsp;</span>
              <input type="time" value={startTime} onChange={(input) => input.target.value && setStartTime(input.target.value)} className={inputBase} />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-sm font-medium">Fin</span>
            <input type="date" value={endDate} min={startDate} onChange={(input) => input.target.value && setEndDate(input.target.value)} className={inputBase} />
          </label>
          {!allDay && (
            <label className="block space-y-1">
              <span className="sr-only">Heure de fin</span>
              <span aria-hidden className="block text-sm">&nbsp;</span>
              <input type="time" value={endTime} onChange={(input) => input.target.value && setEndTime(input.target.value)} className={inputBase} />
            </label>
          )}
        </div>
        {!valid && title.trim() && <p className="text-sm text-danger">La fin doit être après le début.</p>}

        <label className="relative block">
          <span className="sr-only">Lieu</span>
          <MapPin aria-hidden className="pointer-events-none absolute top-3 left-3 size-5 text-muted" />
          <input placeholder="Lieu" value={location} onChange={(input) => setLocation(input.target.value)} className={`${inputBase} pl-10`} />
        </label>
        <textarea aria-label="Description" placeholder="Description" rows={3} value={description} onChange={(input) => setDescription(input.target.value)} className={`${inputBase} py-2`} />

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Couleur</legend>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Couleur ${value}`}
                aria-pressed={color === value}
                onClick={() => setColor(value)}
                className="size-9 rounded-full aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface"
                style={{ background: value }}
              />
            ))}
          </div>
        </fieldset>

        <RecurrencePicker value={rule} startDate={startDate} onChange={setRule} />

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Rappels</legend>
          <div className="flex flex-wrap items-center gap-1.5">
            {[...offsets].sort((a, b) => a - b).map((offset) => (
              <span key={offset} className="flex min-h-9 items-center gap-1 rounded-full bg-surface-2 pr-1 pl-3 text-sm">
                {describeOffset(offset)}
                <button type="button" aria-label={`Retirer le rappel ${describeOffset(offset)}`} onClick={() => setOffsets(offsets.filter((value) => value !== offset))} className="grid size-7 place-items-center rounded-full hover:bg-surface">
                  <X aria-hidden className="size-3.5" />
                </button>
              </span>
            ))}
            <select
              aria-label="Ajouter un rappel"
              value=""
              onChange={(input) => input.target.value && setOffsets([...new Set([...offsets, Number(input.target.value)])])}
              className="min-h-9 rounded-full border border-dashed border-border bg-transparent px-3 text-sm"
            >
              <option value="">+ Ajouter un rappel</option>
              {EVENT_REMINDER_CHOICES.filter((choice) => !offsets.includes(choice.value)).map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}
