// Minimal social glyphs drawn in the same 24px / 1.75 stroke style as Lucide.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function InstagramIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function XIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4l6.5 8.7L4.3 20M19.7 4l-6.1 6.6M8.4 4H4l11.6 16H20L8.4 4z" />
    </svg>
  )
}

export function YouTubeIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.3 9.4v5.2l4.4-2.6-4.4-2.6z" fill="currentColor" />
    </svg>
  )
}

export function TikTokIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.4 2.6 2.4 4.6 5 5" />
    </svg>
  )
}
