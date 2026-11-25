import { Badge, Button } from 'react-bootstrap'
import {
  type RefCategory,
  type Tier,
  FREE_STARTER_REFS,
  categoryHint,
  categoryLabel,
  perReferralNgn,
} from '../lib/pricing'
import { formatMoney } from '../lib/money'

type Props = {
  category: RefCategory
  packages: Tier[]
  selectedRefs: number
  onSelect: (refs: number) => void
  freeUsed?: boolean
  showFree?: boolean
}

export default function PackagePicker({
  category,
  packages,
  selectedRefs,
  onSelect,
  freeUsed,
  showFree,
}: Props) {
  return (
    <div className="package-picker">
      <div className="small text-muted mb-2">{categoryHint(category)}</div>
      <div className="package-picker-grid">
        {showFree && (
          <button
            type="button"
            className={`pkg-tile ${selectedRefs === FREE_STARTER_REFS ? 'pkg-tile-active' : ''} ${freeUsed ? 'pkg-tile-disabled' : ''}`}
            disabled={freeUsed}
            onClick={() => onSelect(FREE_STARTER_REFS)}
          >
            <div className="pkg-tile-refs">{FREE_STARTER_REFS}</div>
            <div className="pkg-tile-label">referrals</div>
            <div className="pkg-tile-price text-success">Free</div>
            <div className="pkg-tile-unit">once per account</div>
            {freeUsed && <Badge bg="secondary">Used</Badge>}
          </button>
        )}
        {packages.map((p) => {
          const per = perReferralNgn(p.priceNgn, p.referrals)
          const active = selectedRefs === p.referrals
          return (
            <button
              type="button"
              key={p.referrals}
              className={`pkg-tile ${active ? 'pkg-tile-active' : ''}`}
              onClick={() => onSelect(p.referrals)}
            >
              <div className="pkg-tile-refs">{p.referrals.toLocaleString()}</div>
              <div className="pkg-tile-label">referrals</div>
              <div className="pkg-tile-price">{formatMoney(p.priceNgn)}</div>
              <div className="pkg-tile-unit">~{formatMoney(per)} / ref</div>
            </button>
          )
        })}
      </div>
      <div className="small text-muted mt-2">
        <strong>{categoryLabel(category)}</strong>
        {category === 'gambling' ? ' · higher price because deposit is harder' : ' · lower price · signup only'}
      </div>
    </div>
  )
}
