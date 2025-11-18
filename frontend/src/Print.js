import React, { useState, useEffect, useRef } from 'react';
import './Print.css';
import './Spinner.css';
import './PageHeader.css';
import { supabase } from './supabaseClient';
import { DateTime } from './DateTime';
import { logSystemEvent } from './utils/loggingUtils';
import { LoadingSpinner } from './components/LoadingSpinner'; 

const fetchAllRecords = async (tableName, orderField = 'id', filters = {}) => {
  const pageSize = 1000;
  let allData = [];
  let from = 0;
  let to = pageSize - 1;
  let done = false;

  while (!done) {
    let query = supabase
      .from(tableName)
      .select('*')
      .order(orderField, { ascending: true })
      .range(from, to);

    for (const [key, value] of Object.entries(filters)) {
      if (value) query = query.eq(key, value);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data.length) done = true;
    else {
      allData = [...allData, ...data];
      from += pageSize;
      to += pageSize;
    }
  }

  return allData;
};

// Custom Dropdown Component
const CustomDropdown = ({ options, value, onChange, allLabel = "All" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleOptionClick = (val) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value) return allLabel;
    return value;
  };

  return (
    <div className="print-custom-dropdown" ref={dropdownRef}>
      <div 
        className="print-dropdown-trigger" 
        onClick={handleToggle}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <span className="print-dropdown-text">{getDisplayText()}</span>
        <span className={`print-dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      
      {isOpen && (
        <div className="print-dropdown-options" role="listbox">
          <div 
            className={`print-dropdown-option ${!value ? 'selected' : ''}`}
            onClick={() => handleOptionClick('')}
            role="option"
            aria-selected={!value}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOptionClick('');
              }
            }}
          >
            <span>{allLabel}</span>
          </div>
          
          {options.map((option) => (
            <div 
              key={option}
              className={`print-dropdown-option ${value === option ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
              role="option"
              aria-selected={value === option}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOptionClick(option);
                }
              }}
            >
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function Print() {
  const [accidents, setAccidents] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [barangayList, setBarangayList] = useState([]);
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch accidents and clusters in parallel for faster loading
      const [allAccidentData, clusterResult] = await Promise.all([
        fetchAllRecords('road_traffic_accident', 'datecommitted'),
        supabase
          .from('Cluster_Centers')
          .select('*')
          .order('danger_score', { ascending: false })
      ]);

      // Process accident data
      const allBarangays = [...new Set(allAccidentData.map(a => a.barangay))].sort();
      setBarangayList(allBarangays);

      const dates = allAccidentData
        .map(a => a.datecommitted)
        .filter(Boolean)
        .sort();
      
      if (dates.length > 0) {
        setMinDate(dates[0]);
        setMaxDate(dates[dates.length - 1]);
      }

      setAccidents(allAccidentData);

      // Process cluster data
      if (clusterResult.error) throw clusterResult.error;
      setClusters(clusterResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const generateSummaryStats = (filteredAccidents) => {
    const total = filteredAccidents.length;
    const severityCounts = {};
    const barangayCounts = {};
    const monthlyCounts = {};

    filteredAccidents.forEach(acc => {
      const severity = acc.severity || 'Unknown';
      const barangay = acc.barangay || 'Unknown';
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      barangayCounts[barangay] = (barangayCounts[barangay] || 0) + 1;
      if (acc.datecommitted) {
        const month = acc.datecommitted.substring(0, 7);
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      }
    });

    return { total, severityCounts, barangayCounts, monthlyCounts };
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await logSystemEvent.printReport('accident data report');
    window.print();
    
    setIsPrinting(false);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedBarangay('');
    setSelectedSeverity('');
  };

  // Calculate stats for ALL barangays (for percentage calculations)
  const allBarangaysAccidents = accidents.filter(a => {
    const inDateRange =
      (!startDate || a.datecommitted >= startDate) &&
      (!endDate || a.datecommitted <= endDate);
    return inDateRange; // Don't filter by barangay here
  });
  const statsAllBarangays = generateSummaryStats(allBarangaysAccidents);

  // Calculate stats for current filters (for display)
  const baseAccidents = accidents.filter(a => {
    const inDateRange =
      (!startDate || a.datecommitted >= startDate) &&
      (!endDate || a.datecommitted <= endDate);
    const matchesBarangay = !selectedBarangay || a.barangay === selectedBarangay;
    return inDateRange && matchesBarangay;
  });

  const statsAll = generateSummaryStats(baseAccidents);
  const filteredAccidents = selectedSeverity
    ? baseAccidents.filter(a => a.severity === selectedSeverity)
    : baseAccidents;
  const stats = selectedSeverity
    ? generateSummaryStats(filteredAccidents)
    : statsAll;

  const sortedBarangays = Object.entries(stats.barangayCounts)
    .sort((a, b) => b[1] - a[1]);
  const sortedMonths = Object.entries(stats.monthlyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Loading data..." variant="full-height" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ padding: '24px' }}>
      <div className="page-header">
        <div className="page-title-container">
          <img src="stopLight.svg" alt="Logo" className="page-logo" />
          <h1 className="page-title">Print Records</h1>

          <button type="button" className="pr-cr-info-btn" aria-label="Print Info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
              <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="Poppins, sans-serif">i</text>
            </svg>
          </button>

          <div className="pr-cr-edit-instructions" role="status" aria-hidden="true">
            <strong>💡 Print Help</strong>
            <div> • Choose a start and end date or select a barangay and severity.</div>
            <div> • Click <strong>Apply Filters</strong> to load the report.</div>
            <div> • When filters are applied the Print button will enable.</div>
          </div>
        </div>

        <DateTime />
      </div>
      {/* Filter Section */}
      <div className="no-print">
        <div className="frosted-container" style={{ maxWidth: 'none', width: '100%', marginBottom: '50px' }}>
          <div className="dashboard-card p-6 mb-6" style={{ width: '100%', maxWidth: 'none', padding: '40px 48px' }}>
            <h2 className="text-2xl font-bold mb-8">Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div style={{ marginBottom: '8px' }}>
                <label className="block text-sm font-medium mb-4">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="filter-input"
                />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label className="block text-sm font-medium mb-4">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="filter-input"
                />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label className="block text-sm font-medium mb-4">Barangay</label>
                <CustomDropdown
                  options={barangayList}
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  allLabel="All Barangays"
                />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label className="block text-sm font-medium mb-4">Severity</label>
                <CustomDropdown
                  options={['Critical', 'High', 'Medium', 'Low', 'Minor']}
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  allLabel="All Severities"
                />
              </div>
            </div>
            {minDate && (
              <p className="text-xs text-gray-400 mt-8 mb-4">
                Available date range: {minDate} to {maxDate}
              </p>
            )}
            <div className="mt-8 flex gap-4 items-start">
              <button
                onClick={handleClearFilters}
                disabled={isPrinting || (!startDate && !endDate && !selectedBarangay && !selectedSeverity)}
                className={`clear-btn px-6 py-2 rounded 
                  ${isPrinting || (!startDate && !endDate && !selectedBarangay && !selectedSeverity) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Clear Filters
              </button>

              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className={`print-btn mt-0 px-6 py-2 rounded 
                  ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isPrinting ? 'Preparing Report...' : 'Print Report'}
              </button>

              {!startDate && !endDate && !selectedBarangay && !selectedSeverity && (
                <p className="helper-text mt-2">
                  No filters selected - all accidents will be included in the report.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Section */}
      <div className="print-only">
        <div className="print-report-container">
          {/* Report Header */}
          <div className="print-header">
            <div className="print-header-content">
              <div className="print-header-main">
                <h1 className="print-title">ROAD TRAFFIC ACCIDENT REPORT</h1>
                <p className="print-subtitle">City of San Fernando Police Station</p>
                <p className="print-subtitle-secondary">For Official Use Only</p>
              </div>
              <div className="print-header-info">
                <div className="print-info-row">
                  <span className="print-info-label">Report Generated:</span>
                  <span className="print-info-value">{new Date().toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}</span>
                </div>
                <div className="print-info-row">
                  <span className="print-info-label">Report Period:</span>
                  <span className="print-info-value">{startDate || minDate || 'All Records'} to {endDate || maxDate || 'Present'}</span>
                </div>
                {selectedBarangay && (
                  <div className="print-info-row">
                    <span className="print-info-label">Barangay Filter:</span>
                    <span className="print-info-value">{selectedBarangay}</span>
                  </div>
                )}
                {selectedSeverity && (
                  <div className="print-info-row">
                    <span className="print-info-label">Severity Filter:</span>
                    <span className="print-info-value">{selectedSeverity}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <section className="print-section">
            <h2 className="print-section-title">EXECUTIVE SUMMARY</h2>
            
            <div className="print-metrics-grid">
              <div className="print-metric-card print-metric-primary">
                <div className="print-metric-label">TOTAL ACCIDENTS</div>
                <div className="print-metric-value">{stats.total}</div>
              </div>
              <div className="print-metric-card print-metric-danger">
                <div className="print-metric-label">CRITICAL/HIGH SEVERITY</div>
                <div className="print-metric-value">
                  {(statsAll.severityCounts['Critical'] || 0) + (statsAll.severityCounts['High'] || 0)}
                </div>
              </div>
              <div className="print-metric-card print-metric-warning">
                <div className="print-metric-label">HIGH-RISK ZONES</div>
                <div className="print-metric-value">{clusters.filter(c => c.danger_score > 0.7).length}</div>
              </div>
              <div className="print-metric-card print-metric-info">
                <div className="print-metric-label">LOCATIONS AFFECTED</div>
                <div className="print-metric-value">{Object.keys(stats.barangayCounts).length}</div>
              </div>
            </div>

            <div className="print-summary-grid">
              <div className="print-summary-box">
                <h3 className="print-summary-title">TOP 5 HIGH-RISK BARANGAYS</h3>
                <table className="print-table print-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Barangay</th>
                      <th className="text-right">Accidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBarangays.slice(0, 5).map(([barangay, count], index) => (
                      <tr key={barangay}>
                        <td className="text-center">{index + 1}</td>
                        <td>{barangay}</td>
                        <td className="text-right font-bold">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="print-summary-box">
                <h3 className="print-summary-title">SEVERITY DISTRIBUTION</h3>
                <table className="print-table print-table-compact">
                  <thead>
                    <tr>
                      <th>Severity Level</th>
                      <th className="text-right">Count</th>
                      <th className="text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(statsAll.severityCounts)
                      .sort((a, b) => {
                        const order = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Minor': 5 };
                        return (order[a[0]] || 99) - (order[b[0]] || 99);
                      })
                      .map(([severity, count]) => (
                        <tr key={severity} className={severity === 'Critical' || severity === 'High' ? 'print-row-highlight' : ''}>
                          <td className="font-semibold">{severity}</td>
                          <td className="text-right font-bold">{count}</td>
                          <td className="text-right">{statsAll.total > 0 ? ((count / statsAll.total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Geographic Analysis */}
          <section className="print-section">
            <h2 className="print-section-title">GEOGRAPHIC ANALYSIS</h2>
            <p className="print-section-description">Complete breakdown of accidents by barangay, ranked by frequency</p>
            <table className="print-table">
              <thead>
                <tr>
                  <th className="text-center">Rank</th>
                  <th>Barangay</th>
                  <th className="text-right">Total Accidents</th>
                  <th className="text-right">% of Total</th>
                  <th className="text-center">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {sortedBarangays.map(([barangay, count], i) => {
                  const percentage = statsAllBarangays.total > 0 ? (count / statsAllBarangays.total) * 100 : 0;
                  const riskLevel = percentage > 10 ? 'HIGH' : percentage > 5 ? 'MEDIUM' : 'LOW';
                  return (
                    <tr key={barangay} className={riskLevel === 'HIGH' ? 'print-row-high-risk' : riskLevel === 'MEDIUM' ? 'print-row-medium-risk' : ''}>
                      <td className="text-center font-bold">{i + 1}</td>
                      <td className="font-semibold">{barangay}</td>
                      <td className="text-right font-bold">{count}</td>
                      <td className="text-right">{percentage.toFixed(1)}%</td>
                      <td className="text-center">
                        <span className={`print-risk-badge print-risk-${riskLevel.toLowerCase()}`}>
                          {riskLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Temporal Analysis */}
          {sortedMonths.length > 1 && (
            <section className="print-section">
              <h2 className="print-section-title">TEMPORAL ANALYSIS</h2>
              <p className="print-section-description">Monthly accident trends for identifying patterns and seasonal variations</p>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="text-right">Accidents</th>
                    <th className="text-right">% of Total</th>
                    <th className="text-center">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMonths.map(([month, count], index) => {
                    const prevCount = index > 0 ? sortedMonths[index - 1][1] : count;
                    const trend = count > prevCount ? '↑' : count < prevCount ? '↓' : '→';
                    const trendClass = count > prevCount ? 'print-trend-up' : count < prevCount ? 'print-trend-down' : 'print-trend-stable';
                    return (
                      <tr key={month}>
                        <td className="font-semibold">
                          {new Date(`${month}-01`).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                          })}
                        </td>
                        <td className="text-right font-bold">{count}</td>
                        <td className="text-right">{stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0}%</td>
                        <td className={`text-center font-bold print-trend ${trendClass}`}>{trend}</td>
                      </tr>
                    );
                 })}
              </tbody>
              </table>
            </section>
          )}

          {/* High-Risk Locations */}
          <section className="print-section">
            <h2 className="print-section-title">HIGH-RISK LOCATIONS</h2>
            <p className="print-section-description">Accident clusters requiring immediate attention and increased patrol presence</p>
            {clusters.length > 0 ? (
              <>
                {clusters.filter(c => c.danger_score > 0.7).length > 0 && (
                  <div className="print-alert-box">
                    <strong>⚠️ ALERT:</strong> {clusters.filter(c => c.danger_score > 0.7).length} location{clusters.filter(c => c.danger_score > 0.7).length !== 1 ? 's' : ''} identified as CRITICAL RISK zones requiring immediate intervention
                  </div>
                )}
                <table className="print-table">
                  <thead>
                    <tr>
                      <th className="text-center">Priority</th>
                      <th>GPS Coordinates</th>
                      <th>Affected Barangays</th>
                      <th className="text-right">Total Accidents</th>
                      <th className="text-right">Recent (90d)</th>
                      <th className="text-center">Danger Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusters.slice(0, 15).map((c, index) => {
                      const dangerLevel = c.danger_score > 0.7 ? 'CRITICAL' : c.danger_score > 0.5 ? 'HIGH' : c.danger_score > 0.3 ? 'MODERATE' : 'LOW';
                      const dangerClass = dangerLevel === 'CRITICAL' ? 'print-row-critical' : dangerLevel === 'HIGH' ? 'print-row-high' : dangerLevel === 'MODERATE' ? 'print-row-moderate' : '';
                      return (
                        <tr key={c.cluster_id} className={dangerClass}>
                          <td className="text-center font-bold">{index + 1}</td>
                          <td className="print-coordinates">
                            {c.center_lat?.toFixed(5)}, {c.center_lon?.toFixed(5)}
                          </td>
                          <td>
                            {Array.isArray(c.barangays)
                              ? c.barangays.join(', ')
                              : c.barangays?.split(/[,;]+|(?<=\D)\s+(?=\D)/)
                                  .map(b => b.trim())
                                  .filter(Boolean)
                                  .join(', ')}
                          </td>
                          <td className="text-right font-bold">{c.accident_count}</td>
                          <td className="text-right font-bold">{c.recent_accidents}</td>
                          <td className="text-center">
                            <div className="print-danger-badge-container">
                              <span className={`print-danger-badge print-danger-${dangerLevel.toLowerCase()}`}>
                                {dangerLevel}
                              </span>
                              <div className="print-danger-score">{(c.danger_score * 100).toFixed(0)}%</div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="print-no-data">No cluster data available for analysis.</p>
            )}
          </section>

          {/* Footer */}
          <div className="print-footer">
            <div className="print-footer-line"></div>
            <p className="print-footer-confidential">CONFIDENTIAL - FOR OFFICIAL USE ONLY</p>
            <p className="print-footer-system">Generated using OSIMAP (Optimized Spatial Information Map for Accident Prevention)</p>
            <p className="print-footer-org">City of San Fernando Police Station</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Print;