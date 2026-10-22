import { Fragment, type ReactNode } from 'react'

/** Gras (**…**) et liens ([texte](url) ou adresse nue), sans HTML brut. */
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) nodes.push(text.slice(last, match.index))
    if (match[1]) nodes.push(<strong key={match.index}>{match[1]}</strong>)
    else {
      const url = match[3] ?? match[4]
      nodes.push(
        <a key={match.index} href={url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
          {match[2] ?? new URL(url).hostname}
        </a>,
      )
    }
    last = match.index! + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Mise en forme légère des réponses de l'assistant : paragraphes, listes à puces, gras, liens. */
export function MarkdownLite({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (!list.length) return
    blocks.push(
      <ul key={blocks.length} className="my-1 list-disc space-y-0.5 pl-5">
        {list.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ul>,
    )
    list = []
  }
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      list.push(bullet[1])
      continue
    }
    flush()
    if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ''))}</p>)
  }
  flush()
  return <Fragment>{blocks}</Fragment>
}
