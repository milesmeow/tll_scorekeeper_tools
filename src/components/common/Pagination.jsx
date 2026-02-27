/**
 * Reusable pagination component with top/bottom placement support.
 * Shows "Showing X–Y of Z items" info and page navigation buttons with ellipsis.
 */
export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Build the list of page numbers to display (with null as ellipsis sentinel)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Always include: first, last, and a window of currentPage ± 1
    const window = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
    const pages = [...window]
      .filter(p => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)

    // Insert null between non-consecutive pages (ellipsis markers)
    const result = []
    for (let i = 0; i < pages.length; i++) {
      if (i > 0 && pages[i] - pages[i - 1] > 1) {
        result.push(null)
      }
      result.push(pages[i])
    }
    return result
  }

  const pageNumbers = getPageNumbers()

  const btnBase = 'px-3 py-1 text-sm rounded border transition-colors'
  const btnActive = 'bg-blue-600 text-white border-blue-600'
  const btnInactive = 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
  const btnDisabled = 'px-3 py-1 text-sm rounded border bg-white text-gray-300 border-gray-200 cursor-not-allowed'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="text-sm text-gray-600">
        Showing <span className="font-medium">{startItem}</span>–<span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> game{totalItems !== 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={currentPage === 1 ? btnDisabled : `${btnBase} ${btnInactive}`}
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {pageNumbers.map((page, index) =>
          page === null ? (
            <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`${btnBase} ${page === currentPage ? btnActive : btnInactive}`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={currentPage === totalPages ? btnDisabled : `${btnBase} ${btnInactive}`}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
