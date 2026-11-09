import { getFinish } from '../../data/finishes'
import { cn } from '../../lib/utils'

/**
 * Colour finish picker (radio group semantics).
 * `onPreview` (optional) is called with a finish while a swatch is hovered,
 * and with null when the pointer leaves — used for live card previews.
 */
export function Swatches({ finishes, value, onChange, onPreview, size = 'md', label = 'Colour', className }) {
  const dims = size === 'sm' ? 'size-5' : size === 'lg' ? 'size-9' : 'size-7'
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-2', className)}
      onPointerLeave={onPreview ? () => onPreview(null) : undefined}
    >
      {finishes.map((key) => {
        const finish = getFinish(key)
        const selected = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={finish.name}
            title={finish.name}
            onClick={(event) => {
              event.stopPropagation()
              onChange(key)
            }}
            onPointerEnter={onPreview ? (event) => event.pointerType === 'mouse' && onPreview(key) : undefined}
            className={cn(
              // The ::after extends the tap target to ~38px without changing the look.
              'relative grid place-items-center rounded-full p-[3px] transition duration-300 after:absolute after:-inset-1.5 after:content-[""] active:scale-90',
              selected
                ? 'ring-1 ring-white/85 shadow-[0_0_14px_rgba(140,200,255,0.35)]'
                : 'ring-1 ring-white/10 hover:ring-white/40',
            )}
          >
            <span
              className={cn(dims, 'block rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.45)]')}
              style={{ background: finish.swatch }}
            />
          </button>
        )
      })}
    </div>
  )
}
