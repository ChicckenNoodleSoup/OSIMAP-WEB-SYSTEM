import React, { useState, useEffect, useRef } from 'react';
import './Print.css';
import './Spinner.css';
import './PageHeader.css';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from './DateTime';
import { logSystemEvent } from './utils/loggingUtils';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
); 

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
  const [filtersApplied, setFiltersApplied] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [pendingStartDate, setPendingStartDate] = useState('');
  const [pendingEndDate, setPendingEndDate] = useState('');
  const [pendingBarangay, setPendingBarangay] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [barangayList, setBarangayList] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedBarangay]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let accidentData = await fetchAllRecords('road_traffic_accident', 'datecommitted');

      const allBarangays = [...new Set(accidentData.map(a => a.barangay))].sort();
      setBarangayList(allBarangays);

      if (selectedBarangay)
        accidentData = accidentData.filter(a => a.barangay === selectedBarangay);
      if (startDate)
        accidentData = accidentData.filter(a => a.datecommitted >= startDate);
      if (endDate)
        accidentData = accidentData.filter(a => a.datecommitted <= endDate);

      setAccidents(accidentData);

      setPendingStartDate(startDate);
      setPendingEndDate(endDate);
      setPendingBarangay(selectedBarangay);

      const { data: clusterData, error: clusterError } = await supabase
        .from('Cluster_Centers')
        .select('*')
        .order('danger_score', { ascending: false });
      if (clusterError) throw clusterError;

      setClusters(clusterData || []);
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
    await logSystemEvent.printReport('accident data report');
    window.print();
  };

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
        <div className="loading-center full-height" role="status" aria-live="polite">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
            <svg 
              className="loading-spinner" 
              viewBox="-13 -13 45 45" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle className="box5631" cx="13" cy="1" r="5"/>
              <circle className="box5631" cx="25" cy="1" r="5"/>
              <circle className="box5631" cx="1" cy="13" r="5"/>
              <circle className="box5631" cx="13" cy="13" r="5"/>
              <circle className="box5631" cx="25" cy="13" r="5"/>
              <circle className="box5631" cx="1" cy="25" r="5"/>
              <circle className="box5631" cx="13" cy="25" r="5"/>
              <circle className="box5631" cx="25" cy="25" r="5"/>
              <circle className="box5631" cx="1" cy="1" r="5"/>
            </svg>
            <div className="loading-text">Loading data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ padding: '24px' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginTop: '1rem' }}>
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
        <div className="frosted-container" style={{ maxWidth: 'none', width: '100%' }}>
          <div className="dashboard-card p-6 mb-6" style={{ width: '100%', maxWidth: 'none' }}>
            <h2 className="text-2xl font-bold mb-4">Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={pendingStartDate}
                  onChange={(e) => {
                    setPendingStartDate(e.target.value);
                    setFiltersApplied(false);
                  }}
                  min="2000-01-01"
                  max={today}
                  className="filter-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={pendingEndDate}
                  onChange={(e) => {
                    setPendingEndDate(e.target.value);
                    setFiltersApplied(false);
                  }}
                  min="2000-01-01"
                  max={today}
                  className="filter-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Barangay</label>
                <CustomDropdown
                  options={barangayList}
                  value={pendingBarangay}
                  onChange={(e) => {
                    setPendingBarangay(e.target.value);
                    setFiltersApplied(false);
                  }}
                  allLabel="All Barangays"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Severity</label>
                <CustomDropdown
                  options={['Critical', 'High', 'Medium', 'Low', 'Minor']}
                  value={selectedSeverity}
                  onChange={(e) => {
                    setSelectedSeverity(e.target.value);
                    setFiltersApplied(false);
                  }}
                  allLabel="All Severities"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setStartDate(pendingStartDate);
                  setEndDate(pendingEndDate);
                  setSelectedBarangay(pendingBarangay);
                  setFiltersApplied(true);
                }}
                className="apply-btn px-6 py-2 rounded hover:opacity-95 mr-4"
              >
                Apply Filters
              </button>

              <button
                onClick={handlePrint}
                disabled={!filtersApplied}
                className={`print-btn mt-0 px-6 py-2 rounded 
                  ${filtersApplied ? '' : 'opacity-50 cursor-not-allowed'}`}
              >
                Print Report
              </button>

              {!filtersApplied && (
                <p className="helper-text mt-2">
                  Please apply filters before printing the report.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Section */}
      <div className="print-only">
        <div className="max-w-6xl mx-auto bg-white shadow-lg p-8 print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6 text-center">
            <h1 className="text-3xl font-bold mb-2">Road Traffic Accident Report</h1>
            <p className="font-semibold">
              Report Generated On: {new Date().toLocaleString()}
            </p>
            <p className="mt-1">
              Report Period: {startDate || 'Beginning'} to {endDate || 'Present'}
            </p>
            {selectedBarangay && <p>Barangay: {selectedBarangay}</p>}
            {selectedSeverity && <p>Severity Filter: {selectedSeverity}</p>}
          </div>

          {/* Summary */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">
              Summary Statistics
            </h2>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Total Accidents</h3>
              <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            </div>

            {/* Severity Table */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Breakdown by Severity</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left">Severity</th>
                    <th className="border px-4 py-2 text-right">Count</th>
                    <th className="border px-4 py-2 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statsAll.severityCounts)
                    .filter(([sev]) => !selectedSeverity || sev === selectedSeverity)
                    .map(([severity, count]) => (
                      <tr key={severity}>
                        <td className="border px-4 py-2">{severity}</td>
                        <td className="border px-4 py-2 text-right">{count}</td>
                        <td className="border px-4 py-2 text-right">
                          {((count / statsAll.total) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Barangay Table */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Accidents per Barangay</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left">Rank</th>
                    <th className="border px-4 py-2 text-left">Barangay</th>
                    <th className="border px-4 py-2 text-right">Accidents</th>
                    <th className="border px-4 py-2 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBarangays.map(([barangay, count], i) => (
                    <tr key={barangay}>
                      <td className="border px-4 py-2">{i + 1}</td>
                      <td className="border px-4 py-2">{barangay}</td>
                      <td className="border px-4 py-2 text-right">{count}</td>
                      <td className="border px-4 py-2 text-right">
                        {((count / stats.total) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Monthly Trend */}
            {sortedMonths.length > 1 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Monthly Trend</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">Month</th>
                      <th className="border px-4 py-2 text-right">Accidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMonths.map(([month, count]) => (
                      <tr key={month}>
                        <td className="border px-4 py-2">
                          {new Date(`${month}-01`).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                          })}
                        </td>
                        <td className="border px-4 py-2 text-right">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* High-Risk Analysis */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">High-Risk Analysis</h2>
            {clusters.length > 0 ? (
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left">Cluster ID</th>
                    <th className="border px-4 py-2 text-left">Location</th>
                    <th className="border px-4 py-2 text-left">Barangays</th>
                    <th className="border px-4 py-2 text-right">Accidents</th>
                    <th className="border px-4 py-2 text-right">Recent</th>
                    <th className="border px-4 py-2 text-right">Danger Score</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.slice(0, 10).map((c) => (
                    <tr key={c.cluster_id}>
                      <td className="border px-4 py-2">{c.cluster_id}</td>
                      <td className="border px-4 py-2 text-sm">
                        {c.center_lat?.toFixed(4)}, {c.center_lon?.toFixed(4)}
                      </td>
                      <td className="border px-4 py-2 text-sm">
                        {Array.isArray(c.barangays)
                          ? c.barangays.join(', ')
                          : c.barangays?.split(/[,;]+|(?<=\D)\s+(?=\D)/)
                              .map(b => b.trim())
                              .filter(Boolean)
                              .join(', ')}
                      </td>
                      <td className="border px-4 py-2 text-right">{c.accident_count}</td>
                      <td className="border px-4 py-2 text-right">{c.recent_accidents}</td>
                      <td className="border px-4 py-2 text-right font-semibold">
                        {(c.danger_score * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-600">No cluster data available.</p>
            )}
          </section>

          <div className="text-center text-sm text-gray-600 mt-8 pt-4 border-t">
            <p>This report is for official use only.</p>
            <p>Generated using OSIMAP</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        .print-only { display: none !important; }

        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-only,
          .print-only * {
            visibility: visible !important;
          }
        
          html,
          body,
          #root,
          .min-h-screen {
            background: #fff !important;
            background-image: none !important;
            background-color: #fff !important;
            color: #000 !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        
          * {
            background: transparent !important;
            background-image: none !important;
            background-color: transparent !important;
            color: #000 !important;
            box-shadow: none !important;
            border-color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        
          .print-only {
            padding: 1cm !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            z-index: 999999 !important;
            display: block !important;
            background-color: #fff !important;
            color: #000 !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: auto !important;
          }
        
          .no-print {
            display: none !important;
          }
        
          img.bg-image {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        
          .print-section,
          section,
          table,
          div {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
        
          @page {
            size: A4;
            margin: 1cm;
            background: #fff !important;
          }
        
          @-moz-document url-prefix() {
            .print-only {
              position: static !important;
              width: 100% !important;
              margin: 0 auto !important;
            }
            body {
              overflow: visible !important;
            }
          }
        }
      `}</style>
    </div>
  );
}

export default Print;