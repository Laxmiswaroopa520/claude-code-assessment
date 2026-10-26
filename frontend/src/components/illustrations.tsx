// Decorative inline SVG illustrations (no image files or network requests). aria-hidden: purely visual.

export function HeroIllustration() {
  return (
    <svg className="hero-art" viewBox="0 0 320 200" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hero-card-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e0e7ff" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="hero-card-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="hero-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="hero-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#1e1b4b" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* back card */}
      <g filter="url(#hero-shadow)" transform="rotate(-8 190 95)">
        <rect x="120" y="30" width="170" height="104" rx="16" fill="url(#hero-card-b)" />
        <rect x="136" y="48" width="34" height="24" rx="5" fill="#fde68a" opacity="0.9" />
        <rect x="136" y="104" width="80" height="8" rx="4" fill="#ffffff" opacity="0.6" />
        <circle cx="262" cy="56" r="10" fill="#ffffff" opacity="0.35" />
        <circle cx="250" cy="56" r="10" fill="#ffffff" opacity="0.55" />
      </g>

      {/* front panel with a mini chart */}
      <g filter="url(#hero-shadow)">
        <rect x="70" y="78" width="176" height="110" rx="16" fill="url(#hero-card-a)" />
        <rect x="88" y="94" width="58" height="8" rx="4" fill="#c7d2fe" />
        <rect x="88" y="108" width="36" height="12" rx="4" fill="#4f46e5" />
        <rect x="96" y="160" width="10" height="16" rx="3" fill="#a5b4fc" />
        <rect x="114" y="150" width="10" height="26" rx="3" fill="#818cf8" />
        <rect x="132" y="156" width="10" height="20" rx="3" fill="#a5b4fc" />
        <rect x="150" y="140" width="10" height="36" rx="3" fill="#6366f1" />
        <rect x="168" y="146" width="10" height="30" rx="3" fill="#818cf8" />
        <rect x="186" y="132" width="10" height="44" rx="3" fill="#4f46e5" />
        <path d="M100 150 L119 138 L137 144 L155 126 L173 132 L191 116 L226 104" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="226" cy="104" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
      </g>

      {/* coins */}
      <g filter="url(#hero-shadow)">
        <ellipse cx="60" cy="168" rx="26" ry="9" fill="#d97706" />
        <rect x="34" y="150" width="52" height="18" fill="#f59e0b" />
        <ellipse cx="60" cy="150" rx="26" ry="9" fill="url(#hero-coin)" />
        <ellipse cx="60" cy="140" rx="26" ry="9" fill="#d97706" />
        <rect x="34" y="124" width="52" height="16" fill="#f59e0b" />
        <ellipse cx="60" cy="124" rx="26" ry="9" fill="url(#hero-coin)" />
        <ellipse cx="60" cy="124" rx="12" ry="4" fill="none" stroke="#b45309" strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* sparkles */}
      <path d="M292 150 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#ffffff" opacity="0.85" />
      <path d="M40 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffffff" opacity="0.7" />
      <circle cx="300" cy="30" r="3" fill="#ffffff" opacity="0.6" />
    </svg>
  )
}

export type EmptyArt = 'receipt' | 'chart' | 'folder' | 'target'

/** Small illustration for empty states. */
export function EmptyIllustration({ kind }: { kind: EmptyArt }) {
  return (
    <svg className="empty-art" viewBox="0 0 120 96" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="86" rx="40" ry="6" fill="#e0e7ff" />
      <circle cx="60" cy="44" r="38" fill="#eef2ff" />
      {kind === 'receipt' ? (
        <g>
          <path d="M42 18h36v54l-6-4-6 4-6-4-6 4-6-4-6 4z" fill="#ffffff" stroke="#a5b4fc" strokeWidth="2" strokeLinejoin="round" />
          <rect x="49" y="28" width="22" height="4" rx="2" fill="#c7d2fe" />
          <rect x="49" y="38" width="16" height="4" rx="2" fill="#c7d2fe" />
          <rect x="49" y="48" width="20" height="4" rx="2" fill="#6366f1" />
        </g>
      ) : null}
      {kind === 'chart' ? (
        <g>
          <rect x="34" y="20" width="52" height="46" rx="8" fill="#ffffff" stroke="#a5b4fc" strokeWidth="2" />
          <rect x="43" y="46" width="7" height="12" rx="2" fill="#c7d2fe" />
          <rect x="56" y="38" width="7" height="20" rx="2" fill="#818cf8" />
          <rect x="69" y="30" width="7" height="28" rx="2" fill="#6366f1" />
        </g>
      ) : null}
      {kind === 'folder' ? (
        <g>
          <path d="M32 30a6 6 0 0 1 6-6h14l6 6h24a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6z" fill="#ffffff" stroke="#a5b4fc" strokeWidth="2" />
          <rect x="44" y="42" width="32" height="5" rx="2.5" fill="#c7d2fe" />
          <rect x="44" y="52" width="20" height="5" rx="2.5" fill="#6366f1" />
        </g>
      ) : null}
      {kind === 'target' ? (
        <g>
          <circle cx="60" cy="44" r="24" fill="#ffffff" stroke="#a5b4fc" strokeWidth="2" />
          <circle cx="60" cy="44" r="15" fill="#e0e7ff" />
          <circle cx="60" cy="44" r="6" fill="#6366f1" />
          <path d="M60 44 L82 22" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  )
}
