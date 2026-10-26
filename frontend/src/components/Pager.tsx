import { Button } from './ui/Button'

interface PagerProps {
  page: number
  pageSize: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function Pager({ page, pageSize, totalPages, totalCount, onPageChange }: PagerProps) {
  const lastPage = Math.max(totalPages, 1)
  const first = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalCount)
  return (
    <nav className="pager" aria-label="Pagination">
      <span>
        {totalCount === 0 ? 'No results' : `Showing ${first}–${last} of ${totalCount}`}
      </span>
      <div className="row">
        <Button size="sm" icon="chevron-left" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <span>
          Page {page} of {lastPage}
        </span>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
          Next
        </Button>
      </div>
    </nav>
  )
}
