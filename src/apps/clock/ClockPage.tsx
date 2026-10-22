import { AlarmClock, Clock, Globe, Hourglass, Timer } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { AlarmsTab } from './AlarmsTab'
import { MainClockTab } from './MainClockTab'
import { StopwatchTab } from './StopwatchTab'
import { TimersTab } from './TimersTab'
import { WorldClocksTab } from './WorldClocksTab'

const TABS = [
  { id: 'horloge', label: 'Horloge', icon: Clock, Component: MainClockTab },
  { id: 'fuseaux', label: 'Fuseaux', icon: Globe, Component: WorldClocksTab },
  { id: 'alarmes', label: 'Alarmes', icon: AlarmClock, Component: AlarmsTab },
  { id: 'chrono', label: 'Chrono', icon: Timer, Component: StopwatchTab },
  { id: 'minuteurs', label: 'Minuteurs', icon: Hourglass, Component: TimersTab },
] as const

/** Horloge : onglets dans l'URL (#/app/clock?tab=alarmes) pour les liens directs et les notifications. */
export default function ClockPage() {
  const [params, setParams] = useSearchParams()
  const current = TABS.find((tab) => tab.id === params.get('tab')) ?? TABS[0]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <div
        role="tablist"
        aria-label="Sections de l’horloge"
        className="sticky top-[calc(env(safe-area-inset-top)+3.25rem)] z-[5] flex gap-1 overflow-x-auto bg-bg/85 px-3 py-2 backdrop-blur [scrollbar-width:none]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === current.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setParams({ tab: tab.id }, { replace: true })}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-surface-2 aria-selected:bg-accent aria-selected:text-accent-contrast"
          >
            <tab.icon aria-hidden className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>
      <section role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`} className="px-4 pt-2 pb-10">
        <current.Component />
      </section>
    </div>
  )
}
