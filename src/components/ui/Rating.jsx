import { Star } from 'lucide-react'
import { cn, formatCount } from '../../lib/utils'

export function Rating({ value, count, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-white/60', className)}>
      <Star className="size-3.5 fill-ember-400 text-ember-400" aria-hidden="true" />
      <span className="font-medium text-white/85">{value.toFixed(1)}</span>
      {count != null && <span>({formatCount(count)})</span>}
      <span className="sr-only">out of 5 stars from {formatCount(count)} reviews</span>
    </span>
  )
}
