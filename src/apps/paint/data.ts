import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { backend } from '../../data'
import { useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import { parseDoc, serialize } from './history'
import { canvasToBlob, flatten, renderDoc } from './render'
import type { Drawing, PaintDoc } from './types'

export const fileNames = (drawing: Pick<Drawing, 'id' | 'version'>) => ({
  json: `${drawing.id}-v${drawing.version}.json`,
  png: `${drawing.id}-v${drawing.version}.png`,
  thumb: `${drawing.id}-v${drawing.version}.webp`,
})

export function useDrawings() {
  const query = useRows<Drawing>('drawings')
  const drawings = [...(query.data ?? [])].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
  return { drawings, loaded: query.isSuccess }
}

/** Liens des miniatures (valables 1 h, rafraîchis toutes les 50 min). */
export function useThumbnails(drawings: Drawing[]) {
  const names = drawings.filter((drawing) => drawing.version > 0).map((drawing) => fileNames(drawing).thumb)
  return useQuery({
    queryKey: ['drawing-thumbs', names],
    queryFn: () => backend.fileUrls('drawings', names),
    enabled: names.length > 0,
    staleTime: 50 * 60_000,
  }).data ?? {}
}

export async function loadDoc(drawing: Drawing): Promise<PaintDoc> {
  if (drawing.version === 0) return { format: 'monhub-paint', version: 1, width: drawing.width, height: drawing.height, background: drawing.background, ops: [] }
  const blob = await backend.downloadFile('drawings', fileNames(drawing).json)
  return parseDoc(await blob.text())
}

export function useDrawingActions() {
  const save = useSaveRows<Drawing>('drawings')
  const remove = useDeleteRows('drawings')

  /**
   * Enregistre une nouvelle version : document JSON, image PNG et miniature, puis la ligne.
   * Les fichiers de la version précédente sont ensuite supprimés.
   */
  const saveDrawing = useCallback(
    async (drawing: Drawing, doc: Omit<PaintDoc, 'format' | 'version'>, ink: HTMLCanvasElement) => {
      const next = { ...drawing, version: drawing.version + 1, background: doc.background, updated_at: new Date().toISOString() }
      const files = fileNames(next)
      const [png, thumb] = await Promise.all([
        canvasToBlob(flatten(ink, doc.background), 'image/png'),
        canvasToBlob(flatten(ink, doc.background, 480), 'image/webp', 0.85),
      ])
      await Promise.all([
        backend.uploadFile('drawings', files.json, new Blob([serialize(doc)], { type: 'application/json' })),
        backend.uploadFile('drawings', files.png, png),
        backend.uploadFile('drawings', files.thumb, thumb),
      ])
      await save.mutateAsync([next])
      if (drawing.version > 0) {
        const old = fileNames(drawing)
        void backend.removeFiles('drawings', [old.json, old.png, old.thumb]).catch(() => undefined)
      }
      return next
    },
    [save],
  )

  const createDrawing = useCallback(
    async (format: { width: number; height: number }, title: string) => {
      const drawing: Drawing = { id: crypto.randomUUID(), title, width: format.width, height: format.height, background: '#ffffff', version: 0 }
      await save.mutateAsync([{ ...drawing, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      return drawing
    },
    [save],
  )

  const renameDrawing = useCallback((drawing: Drawing, title: string) => save.mutateAsync([{ ...drawing, title }]), [save])

  const deleteDrawing = useCallback(
    async (drawing: Drawing) => {
      await remove.mutateAsync([drawing.id])
      if (drawing.version > 0) {
        const files = fileNames(drawing)
        void backend.removeFiles('drawings', [files.json, files.png, files.thumb]).catch(() => undefined)
      }
    },
    [remove],
  )

  /** Copie complète (document + images) sous un nouveau nom. */
  const duplicateDrawing = useCallback(
    async (drawing: Drawing) => {
      const copy: Drawing = { ...drawing, id: crypto.randomUUID(), title: `${drawing.title || 'Sans titre'} (copie)`, version: 0 }
      if (drawing.version === 0) {
        await save.mutateAsync([{ ...copy, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        return copy
      }
      const doc = await loadDoc(drawing)
      return saveDrawing({ ...copy, created_at: new Date().toISOString() }, doc, renderDoc(doc))
    },
    [save, saveDrawing],
  )

  return { saveDrawing, createDrawing, renameDrawing, deleteDrawing, duplicateDrawing }
}

/** Télécharge l'image PNG d'un dessin. */
export async function exportPng(drawing: Drawing, blob?: Blob) {
  const image = blob ?? (await backend.downloadFile('drawings', fileNames(drawing).png))
  const url = URL.createObjectURL(image)
  const link = document.createElement('a')
  link.href = url
  link.download = `${(drawing.title || 'dessin').replace(/[\\/:*?"<>|]+/g, '-')}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
