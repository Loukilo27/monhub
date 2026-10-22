/** Petite sonnerie générée (Web Audio), réservée aux alarmes et minuteurs : aucun fichier à télécharger. */
export function playAlarmChime(repeats = 3) {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const start = context.currentTime + 0.05
  for (let index = 0; index < repeats; index++) {
    for (const [offset, frequency] of [
      [0, 880],
      [0.18, 1174.7],
    ] as const) {
      const at = start + index * 0.9 + offset
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.5)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.55)
    }
  }
  setTimeout(() => void context.close(), (repeats * 0.9 + 1) * 1000)
}
