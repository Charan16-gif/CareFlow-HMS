import React from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CareFlow HMS Reusable Glassmorphism Pagination Component.
 * Supports page size switching, smart page windowing, total count display,
 * and complete WAI-ARIA accessible keyboard navigation.
 */
const Pagination = ({
  currentPage = 1,
  totalCount = 0,
  pageSize = 5,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50, 100],
  disabled = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Automatically adjust to the last valid page if records deletion leaves the user on an empty page
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1 && onPageChange) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  // If 5 or fewer records in total, completely hide pagination & per-page dropdown
  if (totalCount <= 5) {
    return null;
  }

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // Pages on each side of current
    const left = currentPage - delta;
    const right = currentPage + delta + 1;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const handlePrev = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav
      className="careflow-pagination"
      role="navigation"
      aria-label="Pagination Navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem 0.5rem',
        borderTop: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))',
        marginTop: '1rem',
      }}
    >
      {/* Record Counts and Page Size Selector */}
      <div className="careflow-pagination-info">
        <span>
          Showing <strong className="careflow-pagination-bold">{startRecord}</strong>–
          <strong className="careflow-pagination-bold">{endRecord}</strong> of{' '}
          <strong className="careflow-pagination-bold">{totalCount}</strong> records
        </span>

        {onPageSizeChange && totalCount > 5 && (
          <div className="careflow-pagination-pagesize">
            <label htmlFor="careflow-page-size-select" className="careflow-pagination-label">
              Per page:
            </label>
            <select
              id="careflow-page-size-select"
              className="careflow-page-size-select"
              value={pageSize}
              disabled={disabled}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                if (onPageSizeChange) onPageSizeChange(newSize);
                if (onPageChange) onPageChange(1);
              }}
              aria-label="Select number of records per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="careflow-page-size-option">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Buttons - only when totalPages > 1 */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
      >
        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1 || disabled}
          aria-label="Go to previous page"
          aria-disabled={currentPage <= 1 || disabled}
          className="admin-btn admin-btn-outline"
          style={{
            padding: '0.4rem 0.65rem',
            minWidth: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            opacity: currentPage <= 1 || disabled ? 0.4 : 1,
            cursor: currentPage <= 1 || disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
          }}
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        {/* Page Number Buttons */}
        {getPageNumbers().map((item, index) => {
          if (item === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                style={{
                  padding: '0.35rem 0.5rem',
                  color: 'var(--text-muted, #94a3b8)',
                  userSelect: 'none',
                }}
              >
                …
              </span>
            );
          }

          const isCurrent = item === currentPage;
          return (
            <button
              key={`page-${item}`}
              type="button"
              onClick={() => !disabled && onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={`admin-btn ${isCurrent ? 'admin-btn-primary' : 'admin-btn-outline'}`}
              style={{
                padding: '0.35rem 0.75rem',
                minWidth: '36px',
                height: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: isCurrent ? 700 : 500,
                fontSize: '0.85rem',
                borderRadius: '8px',
                cursor: isCurrent || disabled ? 'default' : 'pointer',
              }}
            >
              {item}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages || disabled}
          aria-label="Go to next page"
          aria-disabled={currentPage >= totalPages || disabled}
          className="admin-btn admin-btn-outline"
          style={{
            padding: '0.4rem 0.65rem',
            minWidth: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            opacity: currentPage >= totalPages || disabled ? 0.4 : 1,
            cursor: currentPage >= totalPages || disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
          }}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
      )}
    </nav>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  pageSize: PropTypes.number,
  onPageChange: PropTypes.func.isRequired,
  onPageSizeChange: PropTypes.func,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  disabled: PropTypes.bool,
};

export default Pagination;

