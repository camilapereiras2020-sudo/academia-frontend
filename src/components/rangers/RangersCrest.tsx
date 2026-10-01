/**
 * RangersCrest — inline SVG crest/badge for the Rangers Academy brand.
 *
 * A circular WPA-poster-style shield: a campaign (ranger) hat silhouette
 * with a pair of antlers rising behind/through it, and a ribbon banner
 * arcing beneath the badge reading "RANGERS ACADEMY". Built as real SVG
 * (not a placeholder box) so it renders crisply at any size and can be
 * reused small in the header and large in the hero.
 */
type RangersCrestProps = {
  size?: number
  className?: string
  /** When false, omits the ribbon banner text (useful at very small sizes). */
  showRibbon?: boolean
}

export default function RangersCrest({ size = 96, className = "", showRibbon = true }: RangersCrestProps) {
  const id = "rangersCrestArc"
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label="Rangers Academy crest"
    >
      <defs>
        <path id={id} d="M 34 158 A 86 86 0 0 1 206 158" fill="none" />
      </defs>

      {/* Outer ring */}
      <circle cx="120" cy="120" r="112" fill="#16302A" stroke="#D4A94A" strokeWidth="4" />
      <circle cx="120" cy="120" r="100" fill="none" stroke="#C9B896" strokeWidth="1.5" opacity="0.5" />

      {/* Sunburst backdrop */}
      <g opacity="0.35" stroke="#D4A94A" strokeWidth="1.5">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16
          const rad = (angle * Math.PI) / 180
          const x1 = 120 + Math.cos(rad) * 58
          const y1 = 120 + Math.sin(rad) * 58
          const x2 = 120 + Math.cos(rad) * 96
          const y2 = 120 + Math.sin(rad) * 96
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
      </g>

      {/* Antlers, behind/through the hat */}
      <g fill="none" stroke="#C9B896" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        {/* left antler */}
        <path d="M108 118 C 92 108 86 90 70 84 M86 96 C 76 92 68 92 60 86 M96 106 C 84 104 76 100 66 100" />
        {/* right antler (mirrored) */}
        <path d="M132 118 C 148 108 154 90 170 84 M154 96 C 164 92 172 92 180 86 M144 106 C 156 104 164 100 174 100" />
      </g>

      {/* Campaign hat */}
      <g>
        {/* brim */}
        <ellipse cx="120" cy="146" rx="52" ry="13" fill="#F5F1E4" stroke="#16302A" strokeWidth="2" />
        {/* crown */}
        <path
          d="M96 146 C 92 118 100 96 120 92 C 140 96 148 118 144 146 Z"
          fill="#C9B896"
          stroke="#16302A"
          strokeWidth="2"
        />
        {/* pinched center crease */}
        <path d="M120 92 C 116 112 116 132 120 146" fill="none" stroke="#16302A" strokeWidth="2" />
        <path d="M108 100 C 106 116 108 134 112 145" fill="none" stroke="#A9955F" strokeWidth="1.5" opacity="0.7" />
        <path d="M132 100 C 134 116 132 134 128 145" fill="none" stroke="#A9955F" strokeWidth="1.5" opacity="0.7" />
        {/* hat band */}
        <rect x="97" y="132" width="46" height="7" fill="#B8892B" stroke="#16302A" strokeWidth="1.5" />
      </g>

      {/* Ribbon banner */}
      {showRibbon && (
        <g>
          <path
            d="M22 160 L 46 150 L 50 168 L 26 180 Z"
            fill="#8C6A22"
            stroke="#16302A"
            strokeWidth="1.5"
          />
          <path
            d="M218 160 L 194 150 L 190 168 L 214 180 Z"
            fill="#8C6A22"
            stroke="#16302A"
            strokeWidth="1.5"
          />
          <path
            d="M30 168 A 92 92 0 0 1 210 168 L 210 184 A 92 92 0 0 0 30 184 Z"
            fill="#B8892B"
            stroke="#16302A"
            strokeWidth="2"
          />
          <text fill="#16302A" fontSize="18" fontWeight="700" letterSpacing="1.5" fontFamily="'Oswald', sans-serif">
            <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
              RANGERS ACADEMY
            </textPath>
          </text>
        </g>
      )}
    </svg>
  )
}
