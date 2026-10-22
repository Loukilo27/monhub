import { Palette } from 'lucide-react'
import { fileNames, useDrawings, useThumbnails } from './data'

/** Widget Dernier dessin (2×2). */
export default function LastDrawingWidget() {
  const { drawings } = useDrawings()
  const last = drawings.find((drawing) => drawing.version > 0)
  const thumbs = useThumbnails(last ? [last] : [])
  const url = last ? thumbs[fileNames(last).thumb] : undefined

  if (!last) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-sm text-muted">
        <Palette aria-hidden className="size-8" />
        Aucun dessin
      </div>
    )
  }

  return (
    <figure className="relative h-full bg-surface-2">
      {url && <img src={url} alt={`Dernier dessin : ${last.title || 'Sans titre'}`} className="h-full w-full object-cover" />}
      <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-3 pt-6 pb-2 text-sm font-medium text-white">
        {last.title || 'Sans titre'}
      </figcaption>
    </figure>
  )
}
