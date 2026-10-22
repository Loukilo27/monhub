import { inputClass } from './AuthLayout'

/** Champ pour un code à 6 chiffres (auto-rempli par le clavier Android quand c'est possible). */
export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">Code à 6 chiffres</span>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
      />
    </label>
  )
}
