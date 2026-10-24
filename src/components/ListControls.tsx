import type { ReactNode } from 'react'
import { Form, Pagination, Row, Col, InputGroup, Button } from 'react-bootstrap'

export const PAGE_SIZES = [10, 20, 50] as const

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    page: safePage,
    totalPages,
    total,
    slice: items.slice(start, start + pageSize),
  }
}

type SearchFilterProps = {
  search: string
  onSearch: (v: string) => void
  placeholder?: string
  status?: string
  onStatus?: (v: string) => void
  statusOptions?: { value: string; label: string }[]
  pageSize: number
  onPageSize: (n: number) => void
  extra?: ReactNode
}

export function ListFilters({
  search,
  onSearch,
  placeholder = 'Search…',
  status,
  onStatus,
  statusOptions,
  pageSize,
  onPageSize,
  extra,
}: SearchFilterProps) {
  return (
    <Row className="g-2 mb-3 align-items-end">
      <Col xs={12} md={4}>
        <Form.Label className="small text-muted mb-1">Search</Form.Label>
        <InputGroup>
          <InputGroup.Text>
            <i className="bi bi-search" />
          </InputGroup.Text>
          <Form.Control
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
          />
          {search && (
            <Button variant="outline-secondary" onClick={() => onSearch('')}>
              <i className="bi bi-x" />
            </Button>
          )}
        </InputGroup>
      </Col>
      {onStatus && statusOptions && (
        <Col xs={6} md={3}>
          <Form.Label className="small text-muted mb-1">Status</Form.Label>
          <Form.Select value={status} onChange={(e) => onStatus(e.target.value)}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Form.Select>
        </Col>
      )}
      <Col xs={6} md={2}>
        <Form.Label className="small text-muted mb-1">Per page</Form.Label>
        <Form.Select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Form.Select>
      </Col>
      {extra && <Col xs={12} md="auto">{extra}</Col>}
    </Row>
  )
}

export function ListPagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1 && total === 0) return null
  const items: number[] = []
  const window = 2
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      items.push(i)
    }
  }
  const show: (number | '…')[] = []
  let prev = 0
  for (const i of items) {
    if (prev && i - prev > 1) show.push('…')
    show.push(i)
    prev = i
  }
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <span className="small text-muted">
        {total} item{total === 1 ? '' : 's'} · page {page} / {totalPages}
      </span>
      <Pagination className="mb-0" size="sm">
        <Pagination.Prev disabled={page <= 1} onClick={() => onPage(page - 1)} />
        {show.map((x, idx) =>
          x === '…' ? (
            <Pagination.Ellipsis key={`e${idx}`} disabled />
          ) : (
            <Pagination.Item key={x} active={x === page} onClick={() => onPage(x)}>
              {x}
            </Pagination.Item>
          )
        )}
        <Pagination.Next disabled={page >= totalPages} onClick={() => onPage(page + 1)} />
      </Pagination>
    </div>
  )
}
