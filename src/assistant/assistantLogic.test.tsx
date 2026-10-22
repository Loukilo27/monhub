import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { textToDoc } from '../apps/notes/ai'
import { MarkdownLite } from './MarkdownLite'
import { speakableText } from './speech'

describe('réponses de l’assistant', () => {
  it('met en forme listes, gras et liens sans HTML brut', () => {
    const { container } = render(<MarkdownLite text={'Demain :\n* **09:30** Réunion\n- Voir https://example.com/x\n<script>alert(1)</script>'} />)
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('strong')?.textContent).toBe('09:30')
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/x')
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>')
  })

  it('prépare un texte à lire à voix haute', () => {
    expect(speakableText('**Demain** :\n- [Le Monde](https://lemonde.fr) titre\n- voir https://x.fr')).toBe('Demain : Le Monde titre voir')
  })
})

describe('création de note par l’assistant', () => {
  it('transforme le texte en document (paragraphes et puces)', () => {
    const doc = textToDoc('Courses :\n- pain\n- lait\nMerci')
    expect(doc.content?.map((node) => node.type)).toEqual(['paragraph', 'bulletList', 'paragraph'])
    expect(doc.content?.[1].content).toHaveLength(2)
  })
})
