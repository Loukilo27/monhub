import { Check, History, LoaderCircle, MessageSquarePlus, Mic, MicOff, SendHorizontal, Sparkles, Trash2, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../components/IconButton'
import { useSettings, useUpdatePreferences } from '../data/queries'
import { formatRelative } from '../lib/time'
import { MarkdownLite } from './MarkdownLite'
import { isRecognitionSupported, stopSpeaking, useDictation } from './speech'
import { useAiContext, useAssistant, useConversations } from './useAssistant'

const EXAMPLES = [
  'Qu’est-ce que j’ai demain ?',
  'Ajoute-moi un rendez-vous mardi prochain de 8 h à 10 h',
  'Lance une alarme dans dix minutes',
  'Quel temps fait-il à Paris ?',
]

/** Panneau de discussion avec l'assistant (Ctrl+K). */
export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const ctx = useAiContext(() => dialogRef.current?.close())
  const assistant = useAssistant(ctx)
  const conversations = useConversations()
  const preferences = useSettings().data?.preferences.ai
  const updatePreferences = useUpdatePreferences()
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const dictation = useDictation((text) => assistant.send(text))

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => stopSpeaking()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [assistant.messages, assistant.pending, assistant.busy])

  const submit = () => {
    assistant.send(input)
    setInput('')
  }

  const speaking = Boolean(preferences?.speak)

  return (
    <dialog
      ref={dialogRef}
      aria-label="Assistant"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
      className="mt-0 mr-0 mb-0 ml-auto flex h-dvh max-h-none w-full max-w-md flex-col border-l border-border bg-surface p-0 text-text shadow-soft backdrop:bg-black/30 sm:rounded-l-3xl"
    >
      <header className="flex items-center gap-1 border-b border-border px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
        <Sparkles aria-hidden className="size-5 text-accent" />
        <h2 className="flex-1 font-semibold">Assistant</h2>
        <IconButton label={speaking ? 'Ne plus lire les réponses' : 'Lire les réponses à voix haute'} aria-pressed={speaking} onClick={() => updatePreferences({ ai: { ...preferences, speak: !speaking } })}>
          {speaking ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
        </IconButton>
        <IconButton label="Historique des conversations" aria-pressed={showHistory} onClick={() => setShowHistory((value) => !value)}>
          <History aria-hidden className="size-5" />
        </IconButton>
        <IconButton
          label="Nouvelle conversation"
          onClick={() => {
            assistant.newConversation()
            setShowHistory(false)
          }}
        >
          <MessageSquarePlus aria-hidden className="size-5" />
        </IconButton>
        <IconButton label="Fermer (Échap)" onClick={() => dialogRef.current?.close()}>
          <X aria-hidden className="size-5" />
        </IconButton>
      </header>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted">Conversations</h3>
            {Boolean(conversations.data?.length) && (
              <button
                type="button"
                onClick={() => confirm('Effacer tout l’historique de l’assistant ?') && void assistant.deleteConversations(conversations.data!.map((item) => item.id))}
                className="min-h-9 rounded-lg px-2 text-sm text-danger hover:bg-danger/10"
              >
                Tout effacer
              </button>
            )}
          </div>
          {!conversations.data?.length ? (
            <p className="py-8 text-center text-sm text-muted">Aucune conversation enregistrée.</p>
          ) : (
            <ul className="space-y-1">
              {conversations.data.map((conversation) => (
                <li key={conversation.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      void assistant.openConversation(conversation.id)
                      setShowHistory(false)
                    }}
                    className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left hover:bg-surface-2 ${conversation.id === assistant.conversationId ? 'bg-surface-2' : ''}`}
                  >
                    <span className="block truncate text-sm font-medium">{conversation.title}</span>
                    {conversation.updated_at && <span className="text-xs text-muted">{formatRelative(new Date(conversation.updated_at))}</span>}
                  </button>
                  <IconButton label={`Supprimer « ${conversation.title} »`} onClick={() => void assistant.deleteConversations([conversation.id])} className="size-9!">
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
          {assistant.messages.length === 0 && !assistant.busy && (
            <div className="space-y-3 py-6 text-center">
              <p className="text-muted">Demande-moi quelque chose, à l’écrit ou à la voix.</p>
              <div className="flex flex-col gap-2">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => assistant.send(example)} className="rounded-2xl border border-border px-3 py-2 text-left text-sm hover:bg-surface-2">
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
          {assistant.messages.map((message) =>
            message.role === 'action' ? (
              <p key={message.id} className="text-center text-xs text-muted">
                {message.text}
              </p>
            ) : (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] space-y-1 rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user' ? 'rounded-br-md bg-accent text-accent-contrast' : 'rounded-bl-md bg-surface-2'
                  }`}
                >
                  {message.role === 'user' ? <p className="whitespace-pre-wrap">{message.text}</p> : <MarkdownLite text={message.text} />}
                  {Boolean(message.sources?.length) && (
                    <div className="mt-2 border-t border-border pt-1.5">
                      <p className="text-xs font-semibold text-muted">Sources</p>
                      <ul className="mt-0.5 space-y-0.5 text-xs">
                        {message.sources!.map((source) => (
                          <li key={source.url} className="truncate">
                            <a href={source.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {assistant.pending && (
            <div role="alertdialog" aria-label="Confirmer les actions" className="rounded-2xl border-2 border-accent bg-surface p-3">
              <p className="mb-2 text-sm font-semibold">Je vais faire ceci :</p>
              <ul className="mb-3 space-y-1 text-sm">
                {assistant.pending.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span aria-hidden>•</span>
                    {item.summary}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button type="button" onClick={() => assistant.decide(false)} className="min-h-11 flex-1 rounded-xl border border-border font-medium hover:bg-surface-2">
                  Annuler
                </button>
                <button type="button" autoFocus onClick={() => assistant.decide(true)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent font-medium text-accent-contrast">
                  <Check aria-hidden className="size-4" />
                  Confirmer
                </button>
              </div>
            </div>
          )}

          {assistant.busy && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
              Je réfléchis…
            </p>
          )}

          {assistant.error && (
            <div role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">
              {assistant.error.message}
              <button type="button" onClick={assistant.error.retry} className="ml-2 font-medium underline">
                Réessayer
              </button>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="border-t border-border p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
      >
        {dictation.error && <p className="mb-1 text-xs text-danger">{dictation.error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={dictation.listening ? dictation.interim : input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            readOnly={dictation.listening}
            aria-label="Message pour l’assistant"
            placeholder={dictation.listening ? 'Je t’écoute…' : 'Écris ta demande…'}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent"
          />
          {isRecognitionSupported() && (
            <button
              type="button"
              aria-label={dictation.listening ? 'Arrêter la dictée' : 'Parler (clic, ou maintenir appuyé)'}
              aria-pressed={dictation.listening}
              onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
              onPointerDown={(event) => {
                // Maintenir appuyé : on parle tant que le bouton est enfoncé.
                const startedAt = Date.now()
                if (!dictation.listening) dictation.start()
                const release = () => {
                  if (Date.now() - startedAt > 400) dictation.stop()
                  window.removeEventListener('pointerup', release)
                }
                window.addEventListener('pointerup', release)
                event.preventDefault()
              }}
              className={`grid size-11 shrink-0 place-items-center rounded-full ${dictation.listening ? 'animate-pulse bg-danger text-white' : 'bg-surface-2 hover:bg-border'}`}
            >
              {dictation.listening ? <MicOff aria-hidden className="size-5" /> : <Mic aria-hidden className="size-5" />}
            </button>
          )}
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={!input.trim() || assistant.busy || Boolean(assistant.pending)}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-contrast disabled:opacity-40"
          >
            <SendHorizontal aria-hidden className="size-5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted">Gemini (offre gratuite) : évite d’y confier des informations sensibles.</p>
      </form>
    </dialog>
  )
}
