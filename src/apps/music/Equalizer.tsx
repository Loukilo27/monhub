/** Petites barres animées « en écoute ». */
export function Equalizer() {
  return (
    <span aria-hidden className="flex h-4 items-end gap-0.5">
      {[0, 1, 2].map((bar) => (
        <span key={bar} className="w-1 animate-[eq_0.9s_ease-in-out_infinite] rounded-full bg-accent motion-reduce:animate-none" style={{ animationDelay: `${bar * 0.2}s`, height: '100%' }} />
      ))}
    </span>
  )
}
