import { Volume2 } from 'lucide-react'
import { ALARM_SOUNDS, playSound } from '../apps/clock/sounds'
import { buttonSecondary, inputBase } from '../components/Modal'
import { useSettings, useUpdatePreferences } from '../data/queries'

/** Volume des sonneries (alarmes, minuteurs) et sonnerie de fin des minuteurs. */
export function SoundSettings() {
  const sounds = useSettings().data?.preferences.sounds ?? {}
  const updatePreferences = useUpdatePreferences()
  const volume = Math.round((sounds.volume ?? 1) * 100)
  const timerSound = sounds.timerSound ?? 'carillon'

  const test = () => {
    const stop = playSound(timerSound, { loop: false })
    setTimeout(stop, 2500)
  }

  return (
    <div className="space-y-4 text-sm">
      <label className="block">
        <span className="mb-1 flex justify-between">
          Volume des sonneries <span className="text-muted tabular-nums">{volume} %</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={volume}
          onChange={(event) => updatePreferences({ sounds: { ...sounds, volume: Number(event.target.value) / 100 } })}
          className="h-11 w-full accent-[var(--accent)]"
        />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block">Sonnerie des minuteurs</span>
          <select value={timerSound} onChange={(event) => updatePreferences({ sounds: { ...sounds, timerSound: event.target.value } })} className={inputBase}>
            {ALARM_SOUNDS.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={test} className={`${buttonSecondary} flex items-center gap-2`}>
          <Volume2 aria-hidden className="size-4" />
          Tester
        </button>
      </div>
      <p className="text-xs text-muted">La sonnerie de chaque alarme se choisit dans l’Horloge. Seules les alarmes et les minuteurs font du bruit.</p>
    </div>
  )
}
