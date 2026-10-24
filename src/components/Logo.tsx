type Props = { size?: number; className?: string; showText?: boolean }

export default function Logo({ size = 32, className = '', showText = true }: Props) {
  return (
    <span className={`d-inline-flex align-items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="RS">
        <defs>
          <linearGradient id="rsGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4f46e5" />
            <stop offset="0.5" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#db2777" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#rsGrad)" />
        <text x="32" y="42" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="800" fontSize="26" fill="white">
          RS
        </text>
      </svg>
      {showText && <span className="rs-brand mb-0" style={{ fontSize: size * 0.55 }}>Referral Shopping</span>}
    </span>
  )
}
