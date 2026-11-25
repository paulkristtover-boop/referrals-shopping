import { BRAND, BRAND_SHORT } from '../lib/brand'

type Props = { size?: number; className?: string; showText?: boolean }

/**
 * Referrals Shopping mark — Nigeria green + gold accent.
 * Geometric "RS" with soft referral-loop motif.
 */
export default function Logo({ size = 32, className = '', showText = true }: Props) {
  const id = `rs-logo-${size}`
  return (
    <span className={`d-inline-flex align-items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={BRAND}
      >
        <defs>
          <linearGradient id={`${id}-bg`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00A86B" />
            <stop offset="0.55" stopColor="#008751" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
          <linearGradient id={`${id}-gold`} x1="40" y1="12" x2="56" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5D76E" />
            <stop offset="1" stopColor="#D4A017" />
          </linearGradient>
        </defs>
        {/* Rounded square badge */}
        <rect width="64" height="64" rx="16" fill={`url(#${id}-bg)`} />
        {/* Soft highlight */}
        <path
          d="M16 8h32a8 8 0 0 1 8 8v8c-12 4-28 4-40 0V16a8 8 0 0 1 8-8z"
          fill="#fff"
          fillOpacity="0.12"
        />
        {/* Referral loop (two arcs) */}
        <path
          d="M22 28c0-6 5-10 11-10s11 4 11 10"
          stroke={`url(#${id}-gold)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
        />
        <path
          d="M42 36c0 6-5 10-11 10s-11-4-11-10"
          stroke="#E8F8F0"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        {/* Arrow tips on loop */}
        <path d="M31 18l2.5 3.5H28.5L31 18z" fill={`url(#${id}-gold)`} />
        <path d="M33 46l-2.5-3.5h5L33 46z" fill="#E8F8F0" />
        {/* RS monogram */}
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, 'Segoe UI', sans-serif"
          fontWeight="800"
          fontSize="18"
          letterSpacing="-0.5"
          fill="#FFFFFF"
        >
          {BRAND_SHORT}
        </text>
      </svg>
      {showText && (
        <span className="rs-brand mb-0" style={{ fontSize: size * 0.48 }}>
          {BRAND}
        </span>
      )}
    </span>
  )
}
