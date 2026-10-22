import { BellRing, LoaderCircle, Monitor, Smartphone, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { APPS } from '../apps/registry'
import { useToast } from '../components/toast'
import { formatRelative } from '../lib/time'
import { currentEndpoint, currentPushStatus, enablePush, type PushStatus } from './push'
import {
  useCreateReminder,
  useDeletePushDevice,
  useNotificationPreferences,
  usePushDevices,
  useUpdateNotificationPreferences,
} from './queries'

const STATUS_TEXT: Record<PushStatus, string> = {
  unsupported: 'Ce navigateur ne gère pas les notifications push.',
  denied: 'Notifications bloquées pour ce site : autorise-les dans les réglages du navigateur (icône à gauche de l’adresse).',
  prompt: 'Les notifications ne sont pas encore activées sur cet appareil.',
  enabled: 'Notifications activées sur cet appareil.',
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-surface-2 ring-1 ring-border transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}

export function NotificationSettings() {
  const toast = useToast()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const devices = usePushDevices()
  const deleteDevice = useDeletePushDevice()
  const createReminder = useCreateReminder()
  const prefs = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()
  const quiet = prefs.quietHours ?? { enabled: false, start: '22:00', end: '07:00' }

  useEffect(() => {
    void currentPushStatus().then(setStatus)
    void currentEndpoint().then(setEndpoint)
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const next = await enablePush()
      setStatus(next)
      setEndpoint(await currentEndpoint())
      await devices.refetch()
      if (next === 'enabled') toast('Notifications activées sur cet appareil.', 'success')
    } catch {
      toast('Impossible d’activer les notifications.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const sendTest = () =>
    createReminder.mutate(
      {
        source: 'system',
        kind: 'test',
        title: 'Notification de test',
        body: 'Si tu lis ceci, les notifications fonctionnent 🎉',
        actions: ['snooze'],
        sendAt: new Date(),
      },
      {
        onSuccess: () => toast('Notification de test envoyée.', 'success'),
        onError: () => toast('Échec de l’envoi de la notification de test.', 'error'),
      },
    )

  const toggleApp = (appId: string, enabled: boolean) => {
    const disabled = new Set(prefs.disabledApps ?? [])
    if (enabled) disabled.delete(appId)
    else disabled.add(appId)
    updatePrefs({ disabledApps: [...disabled] })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm text-muted">{status ? STATUS_TEXT[status] : '…'}</p>
        <div className="flex flex-wrap gap-2">
          {status === 'prompt' && (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-contrast disabled:opacity-60"
            >
              {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <BellRing aria-hidden className="size-4" />}
              Activer sur cet appareil
            </button>
          )}
          <button
            type="button"
            onClick={sendTest}
            disabled={createReminder.isPending}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
          >
            Envoyer une notification de test
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Appareils abonnés</h3>
        {devices.data?.length ? (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {devices.data.map((device) => {
              const DeviceIcon = /Android|iOS/.test(device.deviceLabel) ? Smartphone : Monitor
              return (
                <li key={device.id} className="flex items-center gap-3 px-3 py-2">
                  <DeviceIcon aria-hidden className="size-5 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {device.deviceLabel}
                      {device.endpoint === endpoint && <span className="ml-2 text-xs font-normal text-accent">cet appareil</span>}
                    </span>
                    <span className="block text-xs text-muted">
                      {device.lastSuccessAt
                        ? `Dernier envoi ${formatRelative(new Date(device.lastSuccessAt))}`
                        : `Ajouté ${formatRelative(new Date(device.lastSeenAt))}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Retirer ${device.deviceLabel}`}
                    onClick={() => confirm(`Ne plus envoyer de notifications à « ${device.deviceLabel} » ?`) && deleteDevice.mutate(device.id)}
                    className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun appareil pour l’instant.</p>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Par mini-appli</h3>
        {APPS.map((app) => (
          <Toggle
            key={app.id}
            label={app.name}
            checked={!prefs.disabledApps?.includes(app.id)}
            onChange={(checked) => toggleApp(app.id, checked)}
          />
        ))}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Ne pas déranger</h3>
        <Toggle label="Couper les notifications la nuit" checked={quiet.enabled} onChange={(enabled) => updatePrefs({ quietHours: { ...quiet, enabled } })} />
        <div className={`mt-1 flex flex-wrap items-center gap-2 text-sm ${quiet.enabled ? '' : 'opacity-50'}`}>
          de
          <input
            type="time"
            aria-label="Début de la plage Ne pas déranger"
            value={quiet.start}
            disabled={!quiet.enabled}
            onChange={(event) => updatePrefs({ quietHours: { ...quiet, start: event.target.value } })}
            className="min-h-11 rounded-xl border border-border bg-bg px-3"
          />
          à
          <input
            type="time"
            aria-label="Fin de la plage Ne pas déranger"
            value={quiet.end}
            disabled={!quiet.enabled}
            onChange={(event) => updatePrefs({ quietHours: { ...quiet, end: event.target.value } })}
            className="min-h-11 rounded-xl border border-border bg-bg px-3"
          />
        </div>
        <p className="mt-1 text-xs text-muted">Les alarmes et minuteurs sonnent quand même.</p>
      </div>
    </div>
  )
}
