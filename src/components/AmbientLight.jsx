/**
 * Fixed, slowly drifting electric-blue and purple light behind the whole site.
 * Only transforms animate, so it stays smooth on iPhone.
 */
export function AmbientLight() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="animate-drift absolute -left-[30%] -top-[20%] size-[95vmax] rounded-full opacity-60"
        style={{ background: 'radial-gradient(closest-side, rgba(43,127,255,0.22), transparent 70%)' }}
      />
      <div
        className="animate-drift-reverse absolute -bottom-[35%] -right-[30%] size-[95vmax] rounded-full opacity-60"
        style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.2), transparent 70%)' }}
      />
    </div>
  )
}
