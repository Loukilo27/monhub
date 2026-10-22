import { Bell, BellOff, CheckCheck, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getApp } from '../apps/registry'
import { IconButton } from '../components/IconButton'
import { formatRelative } from '../lib/time'
import { useNowMinute } from '../lib/useNow'
import { useClearNotifications, useMarkRead, useNotifications, useUnreadCount } from './queries'

/** Cloche de la barre d'état : compteur de non-lues et panneau d'historique. */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const unread = useUnreadCount()
  return (
    <>
      <IconButton
        label={unread ? `Notifications : ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
        onClick={() => setOpen(true)}
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-none font-bold text-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </IconButton>
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const { data: notifications = [], isPending } = useNotifications()
  const markRead = useMarkRead()
  const clear = useClearNotifications()
  const unread = notifications.filter((notification) => !notification.readAt).length
  const now = useNowMinute()

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="notifications-title"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
      className="mt-auto mr-0 mb-0 ml-auto flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-surface p-0 text-text shadow-soft backdrop:bg-black/30 sm:mt-14 sm:mr-3 sm:mb-auto sm:max-h-[75dvh] sm:rounded-3xl"
    >
      <header className="flex items-center gap-1 border-b border-border px-4 py-2">
        <h2 id="notifications-title" className="flex-1 font-semibold">
          Notifications
        </h2>
        <IconButton label="Tout marquer comme lu" disabled={!unread} onClick={() => markRead.mutate('all')}>
          <CheckCheck aria-hidden className="size-5" />
        </IconButton>
        <IconButton
          label="Tout effacer"
          disabled={!notifications.length}
          onClick={() => confirm('Effacer tout l’historique des notifications ?') && clear.mutate()}
        >
          <Trash2 aria-hidden className="size-5" />
        </IconButton>
        <IconButton label="Fermer" onClick={() => dialogRef.current?.close()}>
          <X aria-hidden className="size-5" />
        </IconButton>
      </header>

      {!isPending && notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted">
          <BellOff aria-hidden className="size-8" />
          <p>Aucune notification.</p>
        </div>
      ) : (
        <ul className="overflow-y-auto p-2">
          {notifications.map((notification) => {
            const app = getApp(notification.source)
            const Icon = app?.icon ?? Bell
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!notification.readAt) markRead.mutate([notification.id])
                    dialogRef.current?.close()
                    navigate(notification.url || '/')
                  }}
                  className="flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
                    style={{ background: app?.color ?? 'var(--accent)' }}
                  >
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${notification.readAt ? '' : 'font-semibold'}`}>{notification.title}</span>
                    {notification.body && <span className="line-clamp-2 block text-sm text-muted">{notification.body}</span>}
                    <span className="mt-0.5 block text-xs text-muted">
                      {app?.name ?? 'MonHub'} · {formatRelative(new Date(notification.createdAt), now)}
                    </span>
                  </span>
                  {!notification.readAt && <span aria-label="Non lue" className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </dialog>
  )
}
