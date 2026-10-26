interface PagerProps {
  page: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function Pager({ page, totalPages, totalCount, onPageChange }: PagerProps) {
  const lastPage = Math.max(totalPages, 1)
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Previous
      </button>
      <span>
        Page {page} of {lastPage} ({totalCount} {totalCount === 1 ? 'expense' : 'expenses'})
      </span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
        Next
      </button>
    </nav>
  )
}
