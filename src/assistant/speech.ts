import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Reconnaissance vocale du navigateur (Web Speech API, fr-FR) : gratuite, disponible dans Chrome
 * et Edge sur PC et Android. Le texte est transmis au service de reconnaissance du navigateur.
 */
interface RecognitionResultEvent {
  resultIndex: number
  results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number }
}

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: RecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionConstructor = new () => Recognition

function recognitionClass(): RecognitionConstructor | undefined {
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

export function isRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(recognitionClass())
}

/** Dictée : texte provisoire pendant qu'on parle, puis `onFinal` avec la phrase complète. */
export function useDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const finalText = useRef('')
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  })

  const start = useCallback(() => {
    const Class = recognitionClass()
    if (!Class || recognition.current) return
    const instance = new Class()
    instance.lang = 'fr-FR'
    instance.interimResults = true
    instance.continuous = false
    finalText.current = ''
    instance.onresult = (event) => {
      let partial = ''
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]
        if (result.isFinal) finalText.current += result[0].transcript
        else partial += result[0].transcript
      }
      setInterim((finalText.current + partial).trim())
    }
    instance.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Micro non autorisé : autorise-le dans les réglages du navigateur.' : event.error === 'no-speech' ? '' : 'Reconnaissance vocale indisponible.')
    }
    instance.onend = () => {
      recognition.current = null
      setListening(false)
      setInterim('')
      const text = finalText.current.trim()
      if (text) onFinalRef.current(text)
    }
    recognition.current = instance
    setError('')
    setListening(true)
    instance.start()
  }, [])

  const stop = useCallback(() => recognition.current?.stop(), [])
  useEffect(() => () => recognition.current?.abort(), [])

  return { listening, interim, error, start, stop }
}

/** Texte lisible à voix haute : sans la mise en forme Markdown ni les liens. */
export function speakableText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function frenchVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  return speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('fr'))
}

/** Lit une réponse à voix haute (synthèse vocale du navigateur). */
export function speak(text: string, voiceURI?: string) {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(speakableText(text))
  utterance.lang = 'fr-FR'
  const voice = frenchVoices().find((candidate) => candidate.voiceURI === voiceURI) ?? frenchVoices()[0]
  if (voice) utterance.voice = voice
  speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}
