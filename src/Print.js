import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

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
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch accidents
      const { data: accidentData, error: accidentError } = await supabase
        .from('road_traffic_accident')
        .select('*')
        .order('datecommitted', { ascending: false });

      if (accidentError) throw accidentError;

      // Fetch clusters
      const { data: clusterData, error: clusterError } = await supabase
        .from('Cluster_Centers')
        .select('*')
        .order('danger_score', { ascending: false });

      if (clusterError) throw clusterError;

      setAccidents(accidentData || []);
      setClusters(clusterData || []);
      
      // Extract unique barangays
      const uniqueBarangays = [...new Set(accidentData.map(a => a.barangay))].sort();
      setBarangayList(uniqueBarangays);
      
      // Find min and max dates
      if (accidentData && accidentData.length > 0) {
        const dates = accidentData.map(a => a.datecommitted).filter(d => d);
        const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));
        setMinDate(sortedDates[0] || '');
        setMaxDate(sortedDates[sortedDates.length - 1] || '');

      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const getFilteredAccidents = () => {
    return accidents.filter(accident => {
      // Date filter
      if (startDate && accident.datecommitted < startDate) return false;
      if (endDate && accident.datecommitted > endDate) return false;
      
      // Barangay filter
      if (selectedBarangay && accident.barangay !== selectedBarangay) return false;
      
      // Severity filter
      if (selectedSeverity && accident.severity !== selectedSeverity) return false;
      
      return true;
    });
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

  const filteredAccidents = getFilteredAccidents();
  const stats = generateSummaryStats(filteredAccidents);
  const sortedBarangays = Object.entries(stats.barangayCounts)
    .sort((a, b) => b[1] - a[1]);
  const sortedMonths = Object.entries(stats.monthlyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (loading) {
    return <div className="p-8">Loading data...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Section - Hidden when printing */}
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

      {/* Printable Report Section */}
      <div className="max-w-6xl mx-auto bg-white shadow-lg p-8 print:shadow-none print:p-0">
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
                {Object.entries(stats.severityCounts).map(([severity, count]) => (
                  <tr key={severity}>
                    <td className="border border-gray-300 px-4 py-2">{severity}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{count}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {((count / stats.total) * 100).toFixed(1)}%
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
                    <td className="border border-gray-300 px-4 py-2 text-sm">{cluster.barangays}</td>
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
          <p>This report is brought to you by Jollibee. Bida ang saya.</p>
          <p>Generated using OSIMAP</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          @page {
            size: A4;
          }
          
          .max-w-6xl {
            max-width: 100% !important;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          h2, h3 {
            page-break-after: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default Print;