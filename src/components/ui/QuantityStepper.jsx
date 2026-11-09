import { Minus, Plus } from 'lucide-react'
import { MAX_QTY } from '../../data/store'
import { cn } from '../../lib/utils'

export function QuantityStepper({ value, onChange, min = 1, label = 'Quantity', size = 'md', className }) {
  const btn = size === 'sm' ? 'size-8' : 'size-11'
  return (
    <div
      className={cn('inline-flex items-center rounded-full border border-white/10 bg-white/[0.03]', className)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={cn(btn, 'grid place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30')}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <span className={cn('min-w-8 text-center font-medium tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, 'grid place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30')}
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
