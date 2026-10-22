/**
 * Sonneries générées avec Web Audio : aucun fichier à télécharger, fonctionnent hors-ligne.
 * Les navigateurs n'autorisent le son qu'après une interaction avec la page : le contexte audio
 * est donc « déverrouillé » au premier clic ou appui sur une touche (voir unlockAudio).
 */

export const ALARM_SOUNDS = [
  { id: 'carillon', label: 'Carillon' },
  { id: 'douceur', label: 'Douceur' },
  { id: 'bip', label: 'Bip' },
  { id: 'radar', label: 'Radar' },
] as const

type Note = [offset: number, frequency: number, duration: number, type?: OscillatorType]

/** Motif de chaque sonnerie (durée d'un cycle en secondes, notes). */
const PATTERNS: Record<string, { cycle: number; notes: Note[] }> = {
  carillon: {
    cycle: 1.6,
    notes: [
      [0, 1046.5, 0.6],
      [0.2, 1318.5, 0.6],
      [0.4, 1568, 0.9],
    ],
  },
  douceur: {
    cycle: 2.4,
    notes: [
      [0, 523.25, 1.2, 'triangle'],
      [0.6, 659.25, 1.2, 'triangle'],
      [1.2, 783.99, 1.4, 'triangle'],
    ],
  },
  bip: {
    cycle: 1,
    notes: [
      [0, 1000, 0.12, 'square'],
      [0.2, 1000, 0.12, 'square'],
      [0.4, 1000, 0.12, 'square'],
    ],
  },
  radar: {
    cycle: 1.2,
    notes: [
      [0, 1400, 0.08],
      [0.1, 1400, 0.08],
      [0.2, 1400, 0.08],
      [0.3, 1400, 0.08],
    ],
  },
}

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (context) return context
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  context = new AudioContextClass()
  return context
}

/** À appeler une fois au démarrage : déverrouille l'audio au premier geste de l'utilisateur. */
export function unlockAudioOnFirstGesture() {
  const unlock = () => {
    void audioContext()?.resume()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

function scheduleCycle(ctx: AudioContext, output: AudioNode, soundId: string, at: number, volume: number) {
  const pattern = PATTERNS[soundId] ?? PATTERNS.carillon
  for (const [offset, frequency, duration, type = 'sine'] of pattern.notes) {
    const start = at + offset
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(gain).connect(output)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.05)
  }
  return pattern.cycle
}

/**
 * Joue une sonnerie en boucle (volume croissant) jusqu'à l'appel de la fonction renvoyée,
 * ou au plus `maxSeconds`.
 */
export function playSound(soundId: string, { loop = true, maxSeconds = 300 } = {}): () => void {
  const ctx = audioContext()
  if (!ctx) return () => {}
  void ctx.resume()
  // Sortie propre à cette lecture : la couper arrête aussi les notes déjà programmées.
  const output = ctx.createGain()
  output.connect(ctx.destination)
  let stopped = false
  let next = ctx.currentTime + 0.05
  const end = next + maxSeconds
  let cycles = 0
  const tick = () => {
    if (stopped) return
    // Programme les cycles avec un peu d'avance pour un son régulier.
    while (next < ctx.currentTime + 1.5 && next < end) {
      const volume = Math.min(0.35, 0.12 + cycles * 0.03)
      next += scheduleCycle(ctx, output, soundId, next, volume)
      cycles++
      if (!loop) {
        stopped = true
        return
      }
    }
    if (next >= end) return
    timer = setTimeout(tick, 400)
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  tick()
  return () => {
    stopped = true
    clearTimeout(timer)
    output.gain.setValueAtTime(0, ctx.currentTime)
    setTimeout(() => output.disconnect(), 100)
  }
}
