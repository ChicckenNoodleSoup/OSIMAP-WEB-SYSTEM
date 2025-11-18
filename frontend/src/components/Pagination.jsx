import React from 'react';
import './Pagination.css';

/**
 * Reusable Pagination Component
 * 
 * Provides consistent pagination UI across the application.
 * Supports custom item names, additional content in record count, and conditional rendering.
 * 
 * @param {number} currentPage - Current active page (1-based)
 * @param {number} totalPages - Total number of pages
 * @param {Function} onPageChange - Callback when page changes (receives page number)
 * @param {number} totalItems - Total number of items being paginated
 * @param {number} itemsPerPage - Number of items per page
 * @param {string} itemName - Name of items (e.g., "records", "accounts", "logs")
 * @param {string} className - Additional CSS classes
 * @param {ReactNode} children - Optional content to display in record count (e.g., filtered indicator)
 */
export const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  itemsPerPage,
  itemName = "items",
  className = "",
  children // Optional: for additional content like filtered indicator
}) => {
  // Don't render if only one page or no items
  if (totalPages <= 1 && totalItems === 0) {
    return null;
  }
  
  // Calculate display range
  const displayStart = totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
  const displayEnd = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <div className={`pagination-wrapper ${className}`}>
      <div className="record-count">
        {totalItems > 0 ? (
          <>
            Showing {displayStart}-{displayEnd} of {totalItems} {itemName}
            {children}
          </>
        ) : (
          <>No {itemName} found</>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
            aria-label="Previous page"
          >
            ⬅ Prev
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(
              Math.max(0, currentPage - 3),
              Math.min(totalPages, currentPage + 2)
            )
            .map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`pagination-number ${
                  currentPage === pageNum ? "active" : ""
                }`}
                aria-label={`Go to page ${pageNum}`}
                aria-current={currentPage === pageNum ? "page" : undefined}
              >
                {pageNum}
              </button>
            ))}
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            aria-label="Next page"
          >
            Next ➡
          </button>
        </div>
      )}
    </div>
  );
};

// OPTIMIZATION: Memoize to prevent unnecessary re-renders
export default React.memo(Pagination);

