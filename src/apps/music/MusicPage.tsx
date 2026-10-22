import { Disc3, ExternalLink, Music2, Plus, RefreshCw, Settings2, Trash2, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { IconButton } from '../../components/IconButton'
import { inputBase } from '../../components/Modal'
import { useToast } from '../../components/toast'
import { useSettings, useUpdatePreferences } from '../../data/queries'
import { useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import { formatRelative } from '../../lib/time'
import { useNowMinute } from '../../lib/useNow'
import { errorMessage, useRecent, useRefreshTop, useTop } from './api'
import { Equalizer } from './Equalizer'
import { ListeningChart } from './ListeningChart'
import { canonicalSpotifyUrl, spotifyEmbedUrl } from './spotifyEmbed'
import { PERIODS, type ChartItem, type MusicPeriod, type Playlist, type RecentTrack } from './types'

function Cover({ src, alt, className = 'size-12', round = false }: { src: string | null; alt: string; className?: string; round?: boolean }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`${className} shrink-0 object-cover ${round ? 'rounded-full' : 'rounded-lg'}`} />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center bg-surface-2 text-muted ${round ? 'rounded-full' : 'rounded-lg'}`}>
      <Music2 aria-hidden className="size-1/2" />
    </span>
  )
}


function Section({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        {icon}
        <span className="flex-1">{title}</span>
        {action}
      </h3>
      {children}
    </section>
  )
}

function TopList({ items, kind }: { items: ChartItem[]; kind: 'track' | 'artist' | 'album' }) {
  if (!items.length) return <p className="py-4 text-center text-sm text-muted">Aucune écoute sur cette période.</p>
  const max = items[0]?.plays || 1
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.artist}-${item.name}`} className="flex items-center gap-3">
          <span className="w-5 text-right text-sm text-muted tabular-nums">{index + 1}</span>
          <Cover src={item.image} alt="" className="size-11" round={kind === 'artist'} />
          <span className="min-w-0 flex-1">
            <a href={item.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">
              {item.name}
            </a>
            {item.artist && <span className="block truncate text-xs text-muted">{item.artist}</span>}
            <span aria-hidden className="mt-1 block h-1 rounded-full bg-[var(--chart-1)] opacity-80" style={{ width: `${(item.plays / max) * 100}%` }} />
          </span>
          <span className="text-sm text-muted tabular-nums">{item.plays}</span>
        </li>
      ))}
    </ol>
  )
}

function NowPlaying({ track, last }: { track: RecentTrack | null; last?: RecentTrack }) {
  const now = useNowMinute()
  const shown = track ?? last
  if (!shown) return <p className="text-sm text-muted">Aucune écoute récente sur Last.fm.</p>
  return (
    <div className="flex items-center gap-4">
      <Cover src={shown.image} alt={`Pochette de ${shown.album || shown.name}`} className="size-20 sm:size-24" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-accent uppercase">
          {track ? (
            <>
              <Equalizer /> En écoute
            </>
          ) : (
            <span className="text-muted">Dernière écoute {shown.playedAt ? formatRelative(new Date(shown.playedAt), now) : ''}</span>
          )}
        </p>
        <p className="truncate text-lg font-semibold">{shown.name}</p>
        <p className="truncate text-sm text-muted">
          {shown.artist}
          {shown.album && ` · ${shown.album}`}
        </p>
      </div>
    </div>
  )
}

function LastfmUserSettings() {
  const current = useSettings().data?.preferences.music?.lastfmUser ?? ''
  const update = useUpdatePreferences()
  const [value, setValue] = useState(current)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        update({ music: { lastfmUser: value.trim() } })
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="flex-1">
        <span className="mb-1 block text-sm font-medium">Nom d’utilisateur Last.fm</span>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="ex. Loukilo27" className={inputBase} />
      </label>
      <button type="submit" disabled={!value.trim() || value.trim() === current} className="mt-6 min-h-11 rounded-xl bg-accent px-4 font-medium text-accent-contrast disabled:opacity-50">
        Enregistrer
      </button>
    </form>
  )
}

function Playlists() {
  const playlists = [...(useRows<Playlist>('music_playlists').data ?? [])].sort((a, b) => a.position - b.position)
  const save = useSaveRows<Playlist>('music_playlists')
  const remove = useDeleteRows('music_playlists')
  const toast = useToast()
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')

  const add = () => {
    const url = canonicalSpotifyUrl(link)
    if (!url) {
      toast('Lien Spotify non reconnu (playlist, album, titre, artiste ou podcast).', 'error')
      return
    }
    save.mutate([{ id: crypto.randomUUID(), title: title.trim(), spotify_url: url, position: Date.now() }])
    setLink('')
    setTitle('')
  }

  return (
    <Section title="Mes playlists" icon={<Disc3 aria-hidden className="size-5 text-accent" />}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <input value={link} onChange={(event) => setLink(event.target.value)} aria-label="Lien Spotify" placeholder="Lien Spotify (Partager → Copier le lien)" className={`${inputBase} min-w-60 flex-[2]`} />
        <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Nom (facultatif)" placeholder="Nom (facultatif)" className={`${inputBase} min-w-40 flex-1`} />
        <button type="submit" disabled={!link.trim()} className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-contrast disabled:opacity-50">
          <Plus aria-hidden className="size-5" />
          Ajouter
        </button>
      </form>
      {playlists.length === 0 ? (
        <p className="text-sm text-muted">Ajoute tes playlists favorites pour les écouter ici.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <div className="mb-1 flex items-center gap-1">
                <span className="flex-1 truncate text-sm font-medium">{playlist.title || 'Playlist'}</span>
                <a href={playlist.spotify_url} target="_blank" rel="noreferrer" aria-label="Ouvrir dans Spotify" title="Ouvrir dans Spotify" className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
                  <ExternalLink aria-hidden className="size-4" />
                </a>
                <IconButton label={`Retirer ${playlist.title || 'la playlist'}`} onClick={() => remove.mutate([playlist.id])} className="size-9!">
                  <Trash2 aria-hidden className="size-4" />
                </IconButton>
              </div>
              <iframe
                title={playlist.title || 'Lecteur Spotify'}
                src={spotifyEmbedUrl(playlist.spotify_url) ?? undefined}
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="h-[352px] w-full rounded-2xl border-0"
              />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">
        Lecteur officiel de Spotify : sans abonnement Premium, il peut se limiter à des extraits. Il ne pilote pas l’application Spotify de ton PC.
      </p>
    </Section>
  )
}

export default function MusicPage() {
  const [period, setPeriod] = useState<MusicPeriod>('month')
  const [list, setList] = useState<'track' | 'artist' | 'album'>('artist')
  const [showSettings, setShowSettings] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const recent = useRecent()
  const top = useTop(period)
  const refreshTop = useRefreshTop()
  const toast = useToast()
  const now = useNowMinute()
  const noUser = (recent.error as { code?: string } | null)?.code === 'no_user'

  const refresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshTop(period), recent.refetch()])
    } catch (error) {
      toast(errorMessage(error), 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const data = top.data
  const yearly = period === 'year' || period === 'prev-year'
  const topArtist = data?.artists[0]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-2xl font-semibold">Musique</h2>
        <IconButton label="Actualiser les statistiques" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw aria-hidden className={`size-5 ${refreshing ? 'animate-spin' : ''}`} />
        </IconButton>
        <IconButton label="Compte Last.fm" aria-expanded={showSettings} onClick={() => setShowSettings((value) => !value)}>
          <Settings2 aria-hidden className="size-5" />
        </IconButton>
      </div>

      {(showSettings || noUser) && (
        <Section title="Compte Last.fm" icon={<UserRound aria-hidden className="size-5 text-accent" />}>
          <LastfmUserSettings />
          <p className="mt-2 text-xs text-muted">Tes écoutes Spotify sont enregistrées sur Last.fm (Réglages Last.fm → Applications → Spotify).</p>
        </Section>
      )}

      <Section title="En ce moment">
        {recent.isPending ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : recent.error ? (
          <p className="text-sm text-danger">{errorMessage(recent.error)}</p>
        ) : (
          recent.data && <NowPlaying track={recent.data.nowPlaying} last={recent.data.recent[0]} />
        )}
      </Section>

      <div role="tablist" aria-label="Période" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={period === item.id}
            onClick={() => setPeriod(item.id)}
            className="min-h-11 shrink-0 rounded-full px-4 text-sm font-medium text-muted hover:bg-surface-2 aria-selected:bg-accent aria-selected:text-accent-contrast"
          >
            {item.label}
          </button>
        ))}
      </div>

      {top.isPending ? (
        <p className="py-10 text-center text-muted">Calcul des statistiques… (quelques secondes la première fois)</p>
      ) : top.error ? (
        <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">{errorMessage(top.error)}</p>
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
                <p className="text-sm text-muted">Écoutes · {data.label}</p>
                <p className="text-4xl font-semibold tabular-nums">{data.total.toLocaleString('fr-FR')}</p>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft sm:col-span-2">
                <Cover src={topArtist?.image ?? null} alt="" className="size-14" round />
                <div className="min-w-0">
                  <p className="text-sm text-muted">Artiste n° 1</p>
                  <p className="truncate text-xl font-semibold">{topArtist?.name ?? '—'}</p>
                  {topArtist && <p className="text-sm text-muted">{topArtist.plays} écoutes</p>}
                </div>
              </div>
            </div>

            <Section title={yearly ? 'Écoutes par mois' : 'Écoutes par jour'}>
              <ListeningChart data={data.histogram} unit={yearly ? 'mois' : 'jour'} />
              <p className="mt-1 text-right text-xs text-muted">Calculé {formatRelative(new Date(data.computedAt), now)}</p>
            </Section>

            <Section
              title="Classement"
              action={
                <span role="tablist" aria-label="Classement" className="flex gap-1 text-sm font-normal">
                  {(
                    [
                      ['artist', 'Artistes'],
                      ['track', 'Titres'],
                      ['album', 'Albums'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={list === id}
                      onClick={() => setList(id)}
                      className="min-h-9 rounded-full px-3 text-muted aria-selected:bg-surface-2 aria-selected:font-semibold aria-selected:text-text"
                    >
                      {label}
                    </button>
                  ))}
                </span>
              }
            >
              <TopList items={list === 'artist' ? data.artists : list === 'track' ? data.tracks : data.albums} kind={list} />
            </Section>
          </>
        )
      )}

      {recent.data && recent.data.recent.length > 0 && (
        <Section title="Historique récent">
          <ul className="divide-y divide-border">
            {recent.data.recent.slice(0, 15).map((track) => (
              <li key={`${track.playedAt}-${track.name}`} className="flex items-center gap-3 py-2">
                <Cover src={track.image} alt="" className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{track.name}</span>
                  <span className="block truncate text-xs text-muted">{track.artist}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{track.playedAt ? formatRelative(new Date(track.playedAt), now) : ''}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{recent.data.totalScrobbles.toLocaleString('fr-FR')} écoutes enregistrées sur Last.fm au total.</p>
        </Section>
      )}

      <Playlists />
    </div>
  )
}
