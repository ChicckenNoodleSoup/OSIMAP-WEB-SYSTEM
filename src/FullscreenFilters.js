import React from 'react';
import './FullscreenFilters.css';
import MultiSelectDropdown from './MultiSelectDropdown';

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
  stats
}) => {
  return (
    <>
      {/* Main filters at top */}
      <div className="fullscreen-filters">
        <div className="filter-container">
          {/* Year filter now uses MultiSelectDropdown */}
          <MultiSelectDropdown
            options={availableYears}
            selectedValues={yearFilter}
            onChange={onYearChange}
            placeholder="Select Years"
            allLabel="All Years"
          />

          <select
            className="filter-dropdown"
            value={locationFilter}
            onChange={(e) => onLocationChange(e.target.value)}
          >
            <option value="all">All Locations</option>
            {availableLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>

          <select
            className="filter-dropdown"
            value={offenseFilter}
            onChange={(e) => onOffenseChange(e.target.value)}
          >
            <option value="all">All Offenses</option>
            {availableOffenseTypes.map(offense => (
              <option key={offense} value={offense}>{offense}</option>
            ))}
          </select>

          <select
            className="filter-dropdown"
            value={severityFilter}
            onChange={(e) => onSeverityChange(e.target.value)}
          >
            <option value="all">All Severities</option>
            {availableSeverities.map(severity => (
              <option key={severity} value={severity}>{severity}</option>
            ))}
          </select>
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

export default FullscreenFilters;