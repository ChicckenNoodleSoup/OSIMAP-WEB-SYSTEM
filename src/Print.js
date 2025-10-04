import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

// Helper function to fetch all rows beyond 1000-limit
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

    // Apply filters if provided
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data.length === 0) {
      done = true;
    } else {
      allData = [...allData, ...data];
      from += pageSize;
      to += pageSize;
    }
  }

  return allData;
};

function Print() {
  const [accidents, setAccidents] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [barangayList, setBarangayList] = useState([]);
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedBarangay]);
  

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build filters for barangay only (NOT date)
      const filters = {};
      if (selectedBarangay) filters.barangay = selectedBarangay;

      // Fetch all rows in chunks
      let accidentData = await fetchAllRecords('road_traffic_accident', 'datecommitted', filters);

      // ⚠️ Calculate min/max BEFORE applying date filters
      if (accidentData.length > 0) {
        const dates = accidentData.map(a => a.datecommitted).sort();
        setMinDate(dates[0]);
        setMaxDate(dates[dates.length - 1]);
      }

      // NOW apply date filters client-side
      if (startDate) accidentData = accidentData.filter(a => a.datecommitted >= startDate);
      if (endDate) accidentData = accidentData.filter(a => a.datecommitted <= endDate);

      setAccidents(accidentData);
  
      // Fetch clusters (single query)
      const { data: clusterData, error: clusterError } = await supabase
        .from('Cluster_Centers')
        .select('*')
        .order('danger_score', { ascending: false });
      if (clusterError) throw clusterError;
      setClusters(clusterData || []);
  
      // Barangay list
      const uniqueBarangays = [...new Set(accidentData.map(a => a.barangay))].sort();
      setBarangayList(uniqueBarangays);
  
      // Min/max date
      if (accidentData.length > 0) {
        const dates = accidentData.map(a => a.datecommitted).sort();
        setMinDate(dates[0]);
        setMaxDate(dates[dates.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };  
  

  const generateSummaryStats = (filteredAccidents) => {
    const total = filteredAccidents.length;
    
    // Severity breakdown
    const severityCounts = {};
    filteredAccidents.forEach(acc => {
      const severity = acc.severity || 'Unknown';
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });
    
    // Barangay breakdown
    const barangayCounts = {};
    filteredAccidents.forEach(acc => {
      const barangay = acc.barangay || 'Unknown';
      barangayCounts[barangay] = (barangayCounts[barangay] || 0) + 1;
    });
    
    // Monthly breakdown
    const monthlyCounts = {};
    filteredAccidents.forEach(acc => {
      if (acc.datecommitted) {
        const month = acc.datecommitted.substring(0, 7); // YYYY-MM
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      }
    });
    
    return {
      total,
      severityCounts,
      barangayCounts,
      monthlyCounts
    };
  };

  const handlePrint = () => {
    window.print();
  };

  //  Step 1: Base filters (date + barangay)
  const baseAccidents = accidents.filter(a => {
    const inDateRange =
      (!startDate || a.datecommitted >= startDate) &&
      (!endDate || a.datecommitted <= endDate);
    const matchesBarangay =
      !selectedBarangay || a.barangay === selectedBarangay;
    return inDateRange && matchesBarangay;
  });

  //  Step 2: Base stats (for the current date/barangay filters)
  const statsAll = generateSummaryStats(baseAccidents);

  //  Step 3: Use base stats for percentage calculation
  const statsForPercentage = statsAll;

  //  Step 4: Filter for severity if needed
  const filteredAccidents = selectedSeverity
    ? baseAccidents.filter(a => a.severity === selectedSeverity)
    : baseAccidents;
  const statsFiltered = generateSummaryStats(filteredAccidents);

  //  Step 5: Display logic
  const stats = selectedSeverity ? statsFiltered : statsAll;
  const displayAccidents = filteredAccidents;

  const sortedBarangays = Object.entries(stats.barangayCounts)
    .sort((a, b) => b[1] - a[1]);
  const sortedMonths = Object.entries(stats.monthlyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (loading) {
    return <div className="p-8">Loading data...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Section - Visible on screen, hidden when printing */}
      <div className="no-print bg-white shadow-md p-6 mb-6">
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
              className="w-full px-3 py-2 border rounded"
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
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Barangay</label>
            <select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All Barangays</option>
              {barangayList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Minor">Minor</option>
            </select>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Print Report
        </button>
      </div>

      {/* Printable Report Section - HIDDEN on screen, visible only when printing */}
      <div className="print-only max-w-6xl mx-auto bg-white shadow-lg p-8 print:shadow-none print:p-0">
        {/* Report Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-center mb-2">
            Road Traffic Accident Report
          </h1>
          <div className="text-center text-gray-600">
            <p className="font-semibold">Report Generated On: {new Date().toLocaleString()}</p>
            <p className="mt-1">
              Report Period: {startDate || 'Beginning'} to {endDate || 'Present'}
            </p>
            {selectedBarangay && <p>Barangay: {selectedBarangay}</p>}
            {selectedSeverity && <p>Severity Filter: {selectedSeverity}</p>}
          </div>
        </div>

        {/* Summary Statistics */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">Summary Statistics</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Total Accidents</h3>
            <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Breakdown by Severity Level</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Severity</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Count</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedSeverity ? statsAll.severityCounts : stats.severityCounts)
                  .filter(([severity]) => !selectedSeverity || severity === selectedSeverity)
                  .map(([severity, count]) => (
                  <tr key={severity}>
                    <td className="border border-gray-300 px-4 py-2">{severity}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{count}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {((count / statsAll.total) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Accidents per Barangay (Ranked)</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Rank</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Barangay</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Accidents</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {sortedBarangays.map(([barangay, count], index) => (
                  <tr key={barangay}>
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2">{barangay}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{count}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {((count / stats.total) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedMonths.length > 1 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Monthly Trend</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Month</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Accidents</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMonths.map(([month, count]) => (
                    <tr key={month}>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(month + '-01').toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{count}</td>
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
          <h3 className="text-xl font-semibold mb-3">Severity Hotspots (High-Risk Clusters)</h3>
          
          {clusters.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Cluster ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Location</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Barangays</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Accidents</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Recent</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Danger Score</th>
                </tr>
              </thead>
              <tbody>
                {clusters.slice(0, 10).map((cluster) => (
                  <tr key={cluster.cluster_id}>
                    <td className="border border-gray-300 px-4 py-2">{cluster.cluster_id}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {cluster.center_lat?.toFixed(4)}, {cluster.center_lon?.toFixed(4)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {Array.isArray(cluster.barangays)
                        ? cluster.barangays.join(', ')
                        : typeof cluster.barangays === 'string'
                          ? cluster.barangays
                              .split(/[,;]+|(?<=\D)\s+(?=\D)/)
                              .map(b => b.trim())
                              .filter(Boolean)
                              .join(', ')
                          : ''}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{cluster.accident_count}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{cluster.recent_accidents}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                      {(cluster.danger_score * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No cluster data available.</p>
          )}
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 mt-8 pt-4 border-t">
          <p>This report is for official use only.</p>
          <p>Generated using OSIMAP</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        /* Hide report on screen */
        .print-only {
          display: none !important;
        }

        @media print {
          html, body, #root, .min-h-screen {
            background: #fff !important;
            background-image: none !important;
            background-color: #fff !important;
            color: #000 !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
        
            /* Disable Chrome’s “eco-print” adjustments */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        
          /*  Force all elements to have a clean white background */
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
        
          /* Ensure your report section itself prints with white background */
          .print-only {
            display: block !important;
            background: #fff !important;
            background-color: #fff !important;
            color: #000 !important;
          }
        
          .no-print {
            display: none !important;
          }
        
          img.bg-image {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        
          .print-section, section, table, div {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
        
          @page { 
            size: A4; 
            margin: 1cm; 
            background: #fff !important;
          }
        }
                
      `}</style>
    </div>
  );
}

export default Print;