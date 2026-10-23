import { useQueryClient } from '@tanstack/react-query'
import { Download, LoaderCircle, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { buttonSecondary } from '../components/Modal'
import { useOnline } from '../data/useSync'
import { useToast } from '../components/toast'
import { countRows, createBackup, parseBackupZip, restoreBackup } from './backup'
import { rescheduleReminders } from './reschedule'

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Export de toutes les données (ZIP : JSON + dessins) et restauration. */
export function BackupSettings() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const online = useOnline()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const exportAll = async () => {
    setProgress('Préparation…')
    try {
      const blob = await createBackup(setProgress)
      download(blob, `monhub-sauvegarde-${new Date().toLocaleDateString('sv-SE')}.zip`)
      toast('Sauvegarde téléchargée.', 'success')
    } catch {
      toast('Sauvegarde impossible. Vérifie ta connexion.', 'error')
    } finally {
      setProgress(null)
    }
  }

  const importFile = async (file: File) => {
    let backup: ReturnType<typeof parseBackupZip>
    try {
      backup = parseBackupZip(new Uint8Array(await file.arrayBuffer()))
    } catch (error) {
      toast((error as Error).message, 'error')
      return
    }
    const date = backup.data.exportedAt ? new Date(backup.data.exportedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 'date inconnue'
    const message =
      `Restaurer la sauvegarde du ${date} (${countRows(backup.data)} éléments, ${Object.keys(backup.drawingFiles).length} fichiers de dessins) ?\n\n` +
      'Les éléments de la sauvegarde remplacent leur version actuelle ; ceux créés depuis sont conservés.'
    if (!confirm(message)) return
    setProgress('Restauration…')
    try {
      const timeZone = await restoreBackup(backup, setProgress)
      setProgress('Rappels…')
      await rescheduleReminders(timeZone)
      await queryClient.invalidateQueries()
      toast('Sauvegarde restaurée.', 'success')
    } catch {
      toast('Restauration interrompue. Vérifie ta connexion et recommence : rien ne sera dupliqué.', 'error')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">
        Un fichier ZIP avec toutes tes données (réglages, accueil, tâches, agenda, notes, horloge, musique, conversations) au format JSON, et tes dessins.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(progress) || !online} onClick={() => void exportAll()} className={`${buttonSecondary} flex items-center gap-2`}>
          <Download aria-hidden className="size-4" />
          Exporter mes données
        </button>
        <button type="button" disabled={Boolean(progress) || !online} onClick={() => input.current?.click()} className={`${buttonSecondary} flex items-center gap-2`}>
          <Upload aria-hidden className="size-4" />
          Restaurer une sauvegarde
        </button>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          aria-label="Fichier de sauvegarde"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void importFile(file)
          }}
        />
      </div>
      {progress && (
        <p role="status" className="flex items-center gap-2 text-muted">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {progress}
        </p>
      )}
      {!online && <p className="text-xs text-muted">Connexion nécessaire pour exporter ou restaurer.</p>}
    </div>
  )
}
