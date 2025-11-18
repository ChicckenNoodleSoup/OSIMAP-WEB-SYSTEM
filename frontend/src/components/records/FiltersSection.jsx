import React from 'react';
import SingleSelectDropdown from '../../SingleSelectDropdown';
import Tooltip from './Tooltip';

const FiltersSection = ({
  barangayList,
  selectedBarangay,
  setSelectedBarangay,
  selectedSeverity,
  setSelectedSeverity,
  sortBy,
  setSortBy,
  searchTerm,
  setSearchTerm,
  setCurrentPage
}) => {
  const handleClearFilters = () => {
    setSelectedBarangay("all");
    setSelectedSeverity("all");
    setSortBy("date-desc");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedBarangay !== "all" || 
                          selectedSeverity !== "all" || 
                          sortBy !== "date-desc" || 
                          searchTerm;

  return (
    <div className="filters-section">
      <div className="filters-container">
        <div className="filter-group">
          <label className="filter-label">Barangay</label>
          <SingleSelectDropdown
            options={barangayList}
            selectedValue={selectedBarangay}
            onChange={(value) => {
              setSelectedBarangay(value);
              setCurrentPage(1);
            }}
            placeholder="All Barangays"
            allLabel="All Barangays"
            allValue="all"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Severity</label>
          <SingleSelectDropdown
            options={['Critical', 'High', 'Medium', 'Low', 'Minor']}
            selectedValue={selectedSeverity}
            onChange={(value) => {
              setSelectedSeverity(value);
              setCurrentPage(1);
            }}
            placeholder="All Severities"
            allLabel="All Severities"
            allValue="all"
          />
        </div>

        <div className="filter-group">
            <label className="filter-label">Sort By</label>
              <SingleSelectDropdown
                options={['Date (Newest First)', 'Date (Oldest First)', 'Severity (High to Low)', 'Severity (Low to High)']}
                selectedValue={sortBy}
                onChange={(value) => setSortBy(value)}
                placeholder="Sort By"
                allLabel="Default Sort"
                allValue="date-desc"
              />
        </div>

        <button
          onClick={handleClearFilters}
          className="clear-filters-btn"
          disabled={!hasActiveFilters}
        >
          <Tooltip id="clear-filters" text="Reset all filters and search to show all records">
            Clear All Filters
          </Tooltip>
        </button>
      </div>
    </div>
  );
};

export default FiltersSection;

