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
      const allAccidentData = await fetchAllRecords('road_traffic_accident', 'datecommitted');

      // Extract unique barangays
      const allBarangays = [...new Set(allAccidentData.map(a => a.barangay))].sort();
      setBarangayList(allBarangays);

      // Find min and max dates from records
      const dates = allAccidentData
        .map(a => a.datecommitted)
        .filter(Boolean)
        .sort();
      
      if (dates.length > 0) {
        setMinDate(dates[0]);
        setMaxDate(dates[dates.length - 1]);
      }

      setAccidents(allAccidentData);

      // Fetch cluster data
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
        <div className="frosted-container" style={{ maxWidth: 'none', width: '100%' }}>
          <div className="dashboard-card p-6 mb-6" style={{ width: '100%', maxWidth: 'none' }}>
            <h2 className="text-2xl font-bold mb-4">Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="filter-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="filter-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Barangay</label>
            <CustomDropdown
              options={barangayList}
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              allLabel="All Barangays"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Severity</label>
            <CustomDropdown
              options={['Critical', 'High', 'Medium', 'Low', 'Minor']}
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              allLabel="All Severities"
            />
          </div>
            </div>
            {minDate && (
              <p className="text-xs text-gray-400 mt-2">
                Available date range: {minDate} to {maxDate}
              </p>
            )}
            <div className="mt-4 flex gap-4 items-start">
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
        <div className="max-w-6xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b-3 border-gray-900 pb-4 mb-4">
          <div className="text-center mb-2">
            <h1 className="text-4xl font-bold mb-1">ROAD TRAFFIC ACCIDENT REPORT</h1>
            <p className="text-sm text-gray-600">For Official Use Only</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p><strong>Report Generated:</strong> {new Date().toLocaleString()}</p>
              <p><strong>Report Period:</strong> {startDate || minDate || 'All Records'} to {endDate || maxDate || 'Present'}</p>
            </div>
            <div>
              {selectedBarangay && <p><strong>Barangay Filter:</strong> {selectedBarangay}</p>}
              {selectedSeverity && <p><strong>Severity Filter:</strong> {selectedSeverity}</p>}
              <p><strong>Total Accidents:</strong> {stats.total}</p>
            </div>
          </div>
        </div>

        {/* Executive Summary - Key Metrics */}
        <section className="mb-4">
          <h2 className="text-2xl font-bold mb-3 border-b-2 border-gray-700 pb-2">
            EXECUTIVE SUMMARY
          </h2>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="border-2 border-gray-300 p-3 text-center bg-gray-50">
              <p className="text-sm font-semibold text-gray-600 mb-1">TOTAL ACCIDENTS</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="border-2 border-red-300 p-3 text-center bg-red-50">
              <p className="text-sm font-semibold text-red-600 mb-1">CRITICAL/HIGH</p>
              <p className="text-3xl font-bold text-red-700">
                {(statsAll.severityCounts['Critical'] || 0) + (statsAll.severityCounts['High'] || 0)}
              </p>
            </div>
            <div className="border-2 border-blue-300 p-3 text-center bg-blue-50">
              <p className="text-sm font-semibold text-blue-600 mb-1">HIGH-RISK ZONES</p>
              <p className="text-3xl font-bold text-blue-700">{clusters.filter(c => c.danger_score > 0.7).length}</p>
            </div>
            <div className="border-2 border-orange-300 p-3 text-center bg-orange-50">
              <p className="text-sm font-semibold text-orange-600 mb-1">LOCATIONS AFFECTED</p>
              <p className="text-3xl font-bold text-orange-700">{Object.keys(stats.barangayCounts).length}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold mb-2 text-gray-800">TOP 5 HIGH-RISK BARANGAYS</h3>
              <table className="w-full text-sm border border-gray-300">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border px-2 py-1 text-left">Barangay</th>
                    <th className="border px-2 py-1 text-right">Accidents</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBarangays.slice(0, 5).map(([barangay, count]) => (
                    <tr key={barangay}>
                      <td className="border px-2 py-1">{barangay}</td>
                      <td className="border px-2 py-1 text-right font-semibold">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-gray-800">SEVERITY DISTRIBUTION</h3>
              <table className="w-full text-sm border border-gray-300">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border px-2 py-1 text-left">Level</th>
                    <th className="border px-2 py-1 text-right">Count</th>
                    <th className="border px-2 py-1 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statsAll.severityCounts)
                    .sort((a, b) => {
                      const order = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Minor': 5 };
                      return (order[a[0]] || 99) - (order[b[0]] || 99);
                    })
                    .map(([severity, count]) => (
                      <tr key={severity} className={severity === 'Critical' || severity === 'High' ? 'bg-red-50' : ''}>
                        <td className="border px-2 py-1">{severity}</td>
                        <td className="border px-2 py-1 text-right font-semibold">{count}</td>
                        <td className="border px-2 py-1 text-right">{((count / statsAll.total) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Geographic Analysis - Complete Barangay Breakdown */}
        <section className="mb-4">
          <h2 className="text-2xl font-bold mb-3 border-b-2 border-gray-700 pb-2">
            GEOGRAPHIC ANALYSIS
          </h2>
          <p className="text-sm text-gray-600 mb-3">Complete breakdown of accidents by barangay, ranked by frequency</p>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-400 px-3 py-2 text-left">Rank</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Barangay</th>
                <th className="border border-gray-400 px-3 py-2 text-right">Total Accidents</th>
                <th className="border border-gray-400 px-3 py-2 text-right">% of Total</th>
                <th className="border border-gray-400 px-3 py-2 text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {sortedBarangays.map(([barangay, count], i) => {
                // Calculate percentage based on ALL barangays' total, not filtered total
                const percentage = (count / statsAllBarangays.total) * 100;
                const riskLevel = percentage > 10 ? 'HIGH' : percentage > 5 ? 'MEDIUM' : 'LOW';
                const riskColor = riskLevel === 'HIGH' ? 'bg-red-100' : riskLevel === 'MEDIUM' ? 'bg-yellow-100' : '';
                return (
                  <tr key={barangay} className={riskColor}>
                    <td className="border border-gray-300 px-3 py-2 font-semibold">{i + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold">{barangay}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{count}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">{percentage.toFixed(1)}%</td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">
                      <span className={`px-2 py-1 rounded ${
                        riskLevel === 'HIGH' ? 'bg-red-200 text-red-800' :
                        riskLevel === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>
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
          <section className="mb-4">
            <h2 className="text-2xl font-bold mb-3 border-b-2 border-gray-700 pb-2">
              TEMPORAL ANALYSIS
            </h2>
            <p className="text-sm text-gray-600 mb-3">Monthly accident trends for identifying patterns and seasonal variations</p>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-400 px-3 py-2 text-left">Period</th>
                  <th className="border border-gray-400 px-3 py-2 text-right">Accidents</th>
                  <th className="border border-gray-400 px-3 py-2 text-right">% of Total</th>
                  <th className="border border-gray-400 px-3 py-2 text-center">Trend</th>
                </tr>
              </thead>
              <tbody>
                {sortedMonths.map(([month, count], index) => {
                  const prevCount = index > 0 ? sortedMonths[index - 1][1] : count;
                  const trend = count > prevCount ? '↑' : count < prevCount ? '↓' : '→';
                  const trendColor = count > prevCount ? 'text-red-600' : count < prevCount ? 'text-green-600' : 'text-gray-600';
                  return (
                    <tr key={month}>
                      <td className="border border-gray-300 px-3 py-2">
                        {new Date(`${month}-01`).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{count}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {((count / stats.total) * 100).toFixed(1)}%
                      </td>
                      <td className={`border border-gray-300 px-3 py-2 text-center font-bold text-xl ${trendColor}`}>
                        {trend}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* High-Risk Locations - Priority Enforcement Areas */}
        <section className="mb-4">
          <h2 className="text-2xl font-bold mb-3 border-b-2 border-gray-700 pb-2">
            HIGH-RISK LOCATIONS - PRIORITY ENFORCEMENT AREAS
          </h2>
          <p className="text-sm text-gray-600 mb-3">Accident clusters requiring immediate attention and increased patrol presence</p>
          {clusters.length > 0 ? (
            <>
              <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-500">
                <p className="font-semibold text-yellow-800 text-sm">⚠️ ALERT: {clusters.filter(c => c.danger_score > 0.7).length} locations identified as CRITICAL RISK zones</p>
              </div>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="border border-gray-400 px-3 py-2 text-left">Priority</th>
                    <th className="border border-gray-400 px-3 py-2 text-left">GPS Coordinates</th>
                    <th className="border border-gray-400 px-3 py-2 text-left">Affected Barangays</th>
                    <th className="border border-gray-400 px-3 py-2 text-right">Total Accidents</th>
                    <th className="border border-gray-400 px-3 py-2 text-right">Recent (90d)</th>
                    <th className="border border-gray-400 px-3 py-2 text-center">Danger Level</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.slice(0, 15).map((c, index) => {
                    const dangerLevel = c.danger_score > 0.7 ? 'CRITICAL' : c.danger_score > 0.5 ? 'HIGH' : c.danger_score > 0.3 ? 'MODERATE' : 'LOW';
                    const dangerColor = dangerLevel === 'CRITICAL' ? 'bg-red-100' : dangerLevel === 'HIGH' ? 'bg-orange-100' : dangerLevel === 'MODERATE' ? 'bg-yellow-100' : '';
                    return (
                      <tr key={c.cluster_id} className={dangerColor}>
                        <td className="border border-gray-300 px-3 py-2 font-bold text-center">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-2 font-mono text-xs">
                          {c.center_lat?.toFixed(5)}, {c.center_lon?.toFixed(5)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-xs">
                          {Array.isArray(c.barangays)
                            ? c.barangays.join(', ')
                            : c.barangays?.split(/[,;]+|(?<=\D)\s+(?=\D)/)
                                .map(b => b.trim())
                                .filter(Boolean)
                                .join(', ')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{c.accident_count}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{c.recent_accidents}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <div className="font-bold">
                            <span className={`px-2 py-1 rounded text-xs ${
                              dangerLevel === 'CRITICAL' ? 'bg-red-600 text-white' :
                              dangerLevel === 'HIGH' ? 'bg-orange-600 text-white' :
                              dangerLevel === 'MODERATE' ? 'bg-yellow-600 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              {dangerLevel}
                            </span>
                            <div className="text-xs text-gray-600 mt-1">{(c.danger_score * 100).toFixed(0)}%</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-gray-600">No cluster data available for analysis.</p>
          )}
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t-2 border-gray-300">
          <p className="font-bold">CONFIDENTIAL - FOR OFFICIAL USE ONLY</p>
          <p className="mt-1">Generated using OSIMAP (Optimized Spatial Information Map for Accident Prevention)</p>
          <p>Philippine National Police - Traffic Management Division</p>
        </div>
        </div>
      </div>

      {/* Print Styles (restored rules to allow multi-page printing) */}
      <style>{`
        .print-only { display: none !important; }

        @media print {
          /* Hide everything except the print-only section */
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