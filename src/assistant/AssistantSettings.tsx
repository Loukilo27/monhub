import { useEffect, useState } from 'react'
import { useSettings, useUpdatePreferences } from '../data/queries'
import { frenchVoices, speak } from './speech'

/** Réglages de l'assistant : lecture des réponses à voix haute et choix de la voix. */
export function AssistantSettings() {
  const preferences = useSettings().data?.preferences.ai ?? {}
  const updatePreferences = useUpdatePreferences()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(frenchVoices)

  // Les voix du système se chargent après coup dans certains navigateurs.
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const update = () => setVoices(frenchVoices())
    speechSynthesis.addEventListener('voiceschanged', update)
    return () => speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  return (
    <div className="space-y-3 text-sm">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        Lire les réponses à voix haute
        <input
          type="checkbox"
          checked={Boolean(preferences.speak)}
          onChange={(event) => updatePreferences({ ai: { ...preferences, speak: event.target.checked } })}
          className="size-5 accent-[var(--accent)]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex-1">
          <span className="mb-1 block">Voix</span>
          <select
            value={preferences.voiceURI ?? ''}
            onChange={(event) => updatePreferences({ ai: { ...preferences, voiceURI: event.target.value || undefined } })}
            className="min-h-11 w-full rounded-xl border border-border bg-bg px-3"
          >
            <option value="">Voix française par défaut</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => speak('Bonjour, je suis ton assistant MonHub.', preferences.voiceURI)} className="mt-5 min-h-11 rounded-xl border border-border px-4 font-medium hover:bg-surface-2">
          Écouter
        </button>
      </div>
      <p className="text-xs text-muted">
        L’assistant utilise Google Gemini (offre gratuite, environ 20 questions par jour sur le meilleur modèle, puis des modèles plus légers). Les échanges peuvent servir à Google pour améliorer ses produits.
      </p>
    </div>
  )
}
