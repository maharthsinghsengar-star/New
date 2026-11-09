import { useId } from 'react'
import { cn } from '../../lib/utils'
import { safeId } from '../visuals/geometry'

export function LogoMark({ className }) {
  const gid = `logo-${safeId(useId())}`
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8cc8ff" />
          <stop offset="0.45" stopColor="#2b7fff" />
          <stop offset="0.8" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ff7a1a" />
        </linearGradient>
      </defs>
      <path d="M16 3.5S7 13.6 7 19.6a9 9 0 0 0 18 0C25 13.6 16 3.5 16 3.5Z" fill={`url(#${gid})`} />
      <path d="M11.6 20.4a4.5 4.5 0 0 0 4.4 4.4" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className, markClassName = 'size-7' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[1.05rem] font-semibold tracking-[0.32em] text-white">AQUORA</span>
    </span>
  )
}
