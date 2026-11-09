import { getFinish } from '../../data/finishes'
import { cn } from '../../lib/utils'

/** Colour finish picker (radio group semantics). */
export function Swatches({ finishes, value, onChange, size = 'md', label = 'Colour', className }) {
  const dims = size === 'sm' ? 'size-5' : size === 'lg' ? 'size-9' : 'size-7'
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap items-center gap-2', className)}>
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
            className={cn(
              'relative grid place-items-center rounded-full p-[3px] transition duration-300',
              selected ? 'ring-1 ring-white/80' : 'ring-1 ring-white/10 hover:ring-white/40',
            )}
          >
            <span
              className={cn(dims, 'block rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.45)]')}
              style={{ background: finish.swatch }}
            />
          </button>
        )
      })}
    </div>
  )
}
