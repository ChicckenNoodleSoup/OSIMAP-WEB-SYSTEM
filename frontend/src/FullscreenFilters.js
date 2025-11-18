import React from 'react';
import './FullscreenFilters.css';
import MultiSelectDropdown from './MultiSelectDropdown';
import SingleSelectDropdown from './SingleSelectDropdown'; 

const FullscreenFilters = ({
  yearFilter,
  locationFilter,
  offenseFilter,
  severityFilter,
  onYearChange,
  onLocationChange,
  onOffenseChange,
  onSeverityChange,
  availableYears,
  availableLocations,
  availableOffenseTypes,
  availableSeverities,
  showHeatmap,
  showClusters,
  showMarkers,
  onToggleHeatmap,
  onToggleClusters,
  onToggleMarkers,
  stats,
  // Search props
  searchTerm,
  searchResults,
  showSearchDropdown,
  selectedSearchIndex,
  searchInputRef,
  onSearchChange,
  onSearchKeyDown,
  onSearchFocus,
  onSearchResultSelect
}) => {
  return (
    <>
      {/* Main filters at top with search */}
      <div className="fullscreen-filters">
        <div className="filter-container">
          {/* Year filter - MultiSelectDropdown */}
          <MultiSelectDropdown
            options={availableYears}
            selectedValues={yearFilter}
            onChange={onYearChange}
            placeholder="Select Years"
            allLabel="All Years"
          />

          {/* Location filter - SingleSelectDropdown */}
          <SingleSelectDropdown
            options={availableLocations}
            selectedValue={locationFilter}
            onChange={onLocationChange}
            allLabel="All Locations"
            allValue="all"
          />

          {/* Offense filter - SingleSelectDropdown */}
          <SingleSelectDropdown
            options={availableOffenseTypes}
            selectedValue={offenseFilter}
            onChange={onOffenseChange}
            allLabel="All Offenses"
            allValue="all"
          />

          {/* Severity filter - SingleSelectDropdown */}
          <SingleSelectDropdown
            options={availableSeverities}
            selectedValue={severityFilter}
            onChange={onSeverityChange}
            allLabel="All Severities"
            allValue="all"
          />

          {/* Divider */}
          <div className="filter-divider"></div>

          {/* Search bar - moved from MapContainer */}
          <div className="simple-corner-search" ref={searchInputRef}>
            <input
              type="text"
              placeholder="Search barangay..."
              className="simple-search-input"
              value={searchTerm}
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              onFocus={onSearchFocus}
            />
            
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id || index}
                    className={`search-dropdown-item ${
                      index === selectedSearchIndex ? 'selected' : ''
                    }`}
                    onClick={() => onSearchResultSelect(result)}
                  >
                    <div className="search-item-main">
                      {result.type === 'barangay' ? (
                        <span className="search-barangay">📍 {result.name} (Barangay)</span>
                      ) : (
                        <span>{result.location}</span>
                      )}
                    </div>
                    {result.type === 'record' && (
                      <div className="search-item-meta">
                        {result.offense_type} • {result.severity} • {result.year}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Display controls on left side */}
      <div className="display-controls">
        <label>
          <input 
            type="checkbox" 
            checked={showHeatmap} 
            onChange={(e) => onToggleHeatmap(e.target.checked)} 
          /> Heatmap
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={showClusters} 
            onChange={(e) => onToggleClusters(e.target.checked)} 
          /> Clusters
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={showMarkers} 
            onChange={(e) => onToggleMarkers(e.target.checked)} 
          /> Points
        </label>
      </div>

      {/* Stats below filters */}
      {stats && (
        <div className="stats-container">
          <div className="stats">
            {stats.totalAccidents} accidents • {stats.totalClusters} clusters • {stats.noisePoints} noise
          </div>
        </div>
      )}
    </>
  );
};

// OPTIMIZATION: Prevent unnecessary re-renders
// Memoize to avoid re-rendering when parent re-renders but props haven't changed
export default React.memo(FullscreenFilters);