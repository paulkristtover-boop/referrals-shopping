import { BRAND } from '../lib/brand'

type Props = { size?: number; className?: string; showText?: boolean }

export default function Logo({ size = 32, className = '', showText = true }: Props) {
  return (
    <span className={`d-inline-flex align-items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label={BRAND}>
        <rect width="64" height="64" rx="14" fill="#2563eb" />
        <text x="32" y="42" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="800" fontSize="26" fill="white">
          RS
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
