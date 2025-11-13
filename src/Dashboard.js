import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { usePageState } from './contexts/PageStateContext';
import './Dashboard.css';
import './PageHeader.css';
import { DateTime } from './DateTime';
import { supabase } from './supabaseClient';
import DashboardMapInsightsCarousel from './components/DashboardMapInsightsCarousel';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [userData, setUserData] = useState(null);
  const currentYearDefault = new Date().getFullYear();
  
  // Use persistent state for year and currentPage
  const [year, setYear] = usePageState('year', currentYearDefault);
  const [currentPage, setCurrentPage] = usePageState('currentPage', 0);
  
  const [count, setCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const [clusteredAccidentsCount, setClusteredAccidentsCount] = useState(null);
  const [loadingClusters, setLoadingClusters] = useState(false);

  const [severityCounts, setSeverityCounts] = useState({});
  const [loadingSeverity, setLoadingSeverity] = useState(false);

  const [barangayCounts, setBarangayCounts] = useState({});
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const barangaysPerPage = 10;

  // Fetch current user data from localStorage
  const fetchUserData = () => {
    try {
      const adminData = localStorage.getItem('adminData');
      if (adminData) {
        const userData = JSON.parse(adminData);
        setUserData(userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Fetch total accidents for year
  const fetchCountForYear = async (y) => {
    setLoadingCount(true);
    try {
      const { count: c, error } = await supabase
        .from('road_traffic_accident')
        .select('id', { count: 'exact', head: true })
        .eq('year', Number(y));

      if (error) {
        console.error(error);
        setCount(0);
      } else setCount(c ?? 0);
    } catch (err) {
      console.error(err);
      setCount(0);
    } finally {
      setLoadingCount(false);
    }
  };

  // Fetch clustered accidents with pagination
  const fetchClusteredAccidentCount = async (y) => {
    setLoadingClusters(true);
    setLoadingBarangays(true);
    try {
      let allRecords = [];
      const pageSize = 1000;
      let from = 0;
      let to = pageSize - 1;
      let done = false;

      // Fetch all records with pagination
      while (!done) {
        const { data, error } = await supabase
          .from('road_traffic_accident')
          .select('lat,lng,barangay')
          .eq('year', Number(y))
          .range(from, to);

        if (error) {
          console.error('Error fetching clustered data:', error);
          done = true;
        } else {
          allRecords = [...allRecords, ...(data || [])];
          if (!data || data.length < pageSize) {
            done = true;
          } else {
            from += pageSize;
            to += pageSize;
          }
        }
      }

      const grid = new Map();
      const bCounts = {};

      allRecords.forEach(r => {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        const barangay = r.barangay || 'Unknown';
        // clustering logic
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const key = (Math.round(lat*100)/100).toFixed(2) + ',' + (Math.round(lng*100)/100).toFixed(2);
          grid.set(key, (grid.get(key)||0)+1);
        }
        // barangay count
        bCounts[barangay] = (bCounts[barangay]||0)+1;
      });

      const clusteredSum = Array.from(grid.values()).reduce((acc,v)=>acc+(v>=2?v:0),0);
      setClusteredAccidentsCount(clusteredSum);
      setBarangayCounts(bCounts);
    } catch (err) {
      console.error('Error in fetchClusteredAccidentCount:', err);
      setClusteredAccidentsCount(0);
      setBarangayCounts({});
    } finally {
      setLoadingClusters(false);
      setLoadingBarangays(false);
    }
  };

  // Fetch severity counts with pagination to handle large datasets
  const fetchSeverityCounts = async (y) => {
    setLoadingSeverity(true);
    try {
      let allRecords = [];
      const pageSize = 1000;
      let from = 0;
      let to = pageSize - 1;
      let done = false;

      // Fetch all records with pagination
      while (!done) {
        const { data, error } = await supabase
          .from('road_traffic_accident')
          .select('severity')
          .eq('year', Number(y))
          .range(from, to);

        if (error) {
          console.error('Error fetching severity data:', error);
          done = true;
        } else {
          allRecords = [...allRecords, ...(data || [])];
          if (!data || data.length < pageSize) {
            done = true;
          } else {
            from += pageSize;
            to += pageSize;
          }
        }
      }

      // Aggregate severity counts from all records
      const counts = allRecords.reduce((acc, row) => {
        const s = (row.severity ?? 'Unknown').toString();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      
      setSeverityCounts(counts);
    } catch (err) {
      console.error('Error in fetchSeverityCounts:', err);
      setSeverityCounts({});
    } finally {
      setLoadingSeverity(false);
    }
  };

  // Reset page when year changes
  useEffect(() => {
    setCurrentPage(0);
  }, [year]);

  // Get barangay data based on the current page
  const getCurrentBarangayData = useCallback(() => {
    const sortedData = Object.entries(barangayCounts)
      .sort((a, b) => b[1] - a[1]);
    
    const totalData = sortedData.length;
    const remainingItems = totalData % 10;
    const isLastPage = currentPage === Math.floor(totalData / 10) - 1;

    // First page always shows top 10 barangays
    if (currentPage === 0) {
      return {
        labels: sortedData.slice(0, 10).map(([name]) => name),
        values: sortedData.slice(0, 10).map(([, count]) => count),
        title: "Top 10 Barangays by Accident Count"
      };
    }
    
    // If we're on the last page and there are less than 6 remaining items
    if (isLastPage && remainingItems > 0 && remainingItems < 6) {
      // Show current page's 10 barangays plus the remaining ones
      const startIndex = currentPage * 10;
      const endIndex = totalData;
      return {
        labels: sortedData.slice(startIndex).map(([name]) => name),
        values: sortedData.slice(startIndex).map(([, count]) => count),
        title: `Barangays ${startIndex + 1}-${endIndex}`
      };
    }
    
    // For regular pages, show next 10 barangays
    const startIndex = currentPage * 10;
    const endIndex = startIndex + 10;
    return {
      labels: sortedData.slice(startIndex, endIndex).map(([name]) => name),
      values: sortedData.slice(startIndex, endIndex).map(([, count]) => count),
      title: `Barangays ${startIndex + 1}-${Math.min(endIndex, totalData)}`
    };
  }, [barangayCounts, currentPage]);

  // Calculate total pages based on the number of barangays and our display logic
  const calculateTotalPages = () => {
    const totalBarangays = Object.keys(barangayCounts).length;
    if (totalBarangays <= 10) return 1;
    
    const fullPages = Math.floor(totalBarangays / 10);
    const remainingItems = totalBarangays % 10;
    
    // If we have remaining items that are less than 6,
    // they'll be shown with the last set of 10 barangays
    if (remainingItems > 0 && remainingItems < 6) {
      return fullPages; // No extra page needed as remaining items will be added to last page
    }
    
    return Math.ceil(totalBarangays / 10);
  };
  const totalPages = calculateTotalPages();

  useEffect(() => {
    fetchUserData();
    // Fetch all data in parallel for faster loading
    Promise.all([
      fetchCountForYear(year),
      fetchClusteredAccidentCount(year),
      fetchSeverityCounts(year)
    ]);
  }, [year]);

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="page-title-container">
          <img src="stopLight.svg" alt="Logo" className="page-logo" />
          <h1 className="page-title">Dashboard</h1>

          {/* Info button */}
          <button type="button" className="dashboard-info-btn" aria-label="Dashboard Info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
              <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="Poppins, sans-serif">i</text>
            </svg>
          </button>

          <div className="dashboard-edit-instructions" role="status">
            <strong>💡 How Dashboard Stats Work</strong>
            <div> • The total number of records shown changes depending on the year selected in the Current Records card.</div>
            <div> • Change the year in the card to update the stat in real time.</div>
          </div>
        </div>

        <DateTime />
      </div>

      <div className="dashboard-grid">
        
        {/* Left column */}
        <div className="dashboard-column">
          {/* Current Records - NOW WITH BARANGAY CHART */}
          <div
            className="dashboard-card card-large card-records-expanded"
            onClick={() => navigate('/currentrecords')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/currentrecords') }}
          >
            <h2>📊 Current Records</h2>

            <div className="dashboard-card-stat">
              <span className="stat-number">{count ?? '...'}</span>
              <span className="stat-label">Road Accidents in {year}</span>
            </div>

            <div className="dashboard-card-controls" onClick={e => e.stopPropagation()}>
              <label className="visually-hidden" htmlFor="year">Year</label>
              <input
                id="year"
                type="number"
                className="dashboard-year-input"
                value={year}
                onChange={e => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  setYear(v === '' ? '' : parseInt(v, 10));
                }}
                aria-label="Select year"
              />
            </div>

            {/* BARANGAY SECTION MOVED HERE */}
            <div className="barangay-section" onClick={e => e.stopPropagation()}>
              <div className="barangay-title">Per Barangay</div>
              {loadingBarangays ? (
                <LoadingSpinner text="Loading data" variant="compact" />
              ) : Object.keys(barangayCounts).length === 0 ? (
                <div className="stat-none">No data</div>
              ) : (
                <>
                  <div className="barangay-chart-wrapper">
                    <button
                      className="carousel-button prev"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage(prev => Math.max(0, prev - 1));
                      }}
                      disabled={currentPage === 0}
                    >
                      ←
                    </button>
                    <div className="barangay-chart-container">
                      <Bar
                        data={{
                          labels: getCurrentBarangayData().labels,
                          datasets: [
                            {
                              label: 'Number of Incidents',
                              data: getCurrentBarangayData().values,
                              backgroundColor: [
                                'rgba(255, 209, 102, 0.6)',
                                'rgba(153, 247, 109, 0.6)',
                                'rgba(255, 107, 107, 0.6)',
                                'rgba(66, 184, 255, 0.6)'
                              ],
                              borderColor: [
                                'rgba(255, 209, 102, 1)',
                                'rgba(153, 247, 109, 1)',
                                'rgba(255, 107, 107, 1)',
                                'rgba(66, 184, 255, 1)'
                              ],
                              borderWidth: 1,
                              borderRadius: 8,
                              hoverBackgroundColor: [
                                'rgba(255, 209, 102, 0.8)',
                                'rgba(153, 247, 109, 0.8)',
                                'rgba(255, 107, 107, 0.8)',
                                'rgba(66, 184, 255, 0.8)'
                              ],
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            title: {
                              display: true,
                              text: getCurrentBarangayData().title,
                              color: '#ffd166',
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              padding: {
                                bottom: 15
                              }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(10, 30, 60, 0.95)',
                              titleColor: '#ffd166',
                              bodyColor: '#FFFFFF',
                              borderColor: 'rgba(255, 255, 255, 0.1)',
                              borderWidth: 1,
                              padding: 12,
                              displayColors: false,
                              callbacks: {
                                title: (tooltipItems) => tooltipItems[0].label,
                                label: (context) => `${context.parsed.y} Incidents`,
                              }
                            }
                          },
                          scales: {
                            x: {
                              ticks: {
                                color: '#FFFFFF',
                                font: {
                                  size: 11
                                },
                                maxRotation: 45,
                                minRotation: 45
                              },
                              grid: {
                                display: false
                              }
                            },
                            y: {
                              beginAtZero: true,
                              ticks: {
                                color: '#FFFFFF',
                                font: {
                                  size: 12
                                },
                                precision: 0
                              },
                              grid: {
                                color: 'rgba(255, 255, 255, 0.1)',
                                drawBorder: false
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    <button
                      className="carousel-button next"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
                      }}
                      disabled={currentPage >= totalPages - 1}
                    >
                      →
                    </button>
                  </div>
                  {totalPages > 1 && (
                    <div 
                      className="carousel-info" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage(currentPage === 0 ? 1 : 0);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentPage(currentPage === 0 ? 1 : 0);
                        }
                      }}
                      data-current-page={currentPage}
                    >
                      {currentPage === 0 ? 'View Other Barangays ' : 'Back to Top 10'}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bottom row: User Profile + Add Record (side by side) */}
          <div className="bottom-cards-row">
            {/* User Profile */}
            <div
              className="dashboard-card card-medium user-profile"
              onClick={() => navigate('/profile')}
            >
              <h2>🧑‍✈️ User Profile</h2>

              <div className="profile-details">
                <div className="username">
                  {userData?.full_name || 'User'}
                </div>
                <div className="profile-info">
                  <div>{userData?.station || 'Station'}</div>
                  <div>{userData?.role || 'Role'}</div>
                </div>
              </div>
            </div>

            {/* Add Record */}
            <div
              className="dashboard-card card-medium add-record"
              onClick={() => navigate('/add-record')}
            >
              <h2>📋 Add Record</h2>
              <div className="icon-container">
                <img src="record-icon.png" alt="Add Icon" className="dashboard-icon" />
              </div>
            </div>
          </div>

        </div>

        {/* Right column - UPDATED WITHOUT BARANGAY SECTION */}
        <div className="dashboard-column">
          <div
            className="dashboard-card card-large card-map"
            onClick={() => navigate('/map')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/map') }}
          >
            <h2>🧭 Clustered Map</h2>

            <div className="dashboard-card-stat">
              <span className="stat-number">{loadingClusters?'...':(clusteredAccidentsCount ?? '0')}</span>
              <span className="stat-label">Clustered Accident{clusteredAccidentsCount===1?'':'s'}</span>
            </div>

            <div className="severity-section">
              <div className="severity-title">By Severity</div>
              {loadingSeverity ? (
                <LoadingSpinner text="Loading data" variant="compact" />
              ) : (
                <ul className="severity-list">
                  {Object.keys(severityCounts).length===0 ? (
                    <li className="severity-none">No data</li>
                  ) : (
                    Object.entries(severityCounts).map(([sev,c])=>{
                      const key = (sev||'unknown').toLowerCase();
                      const cls = key.includes('high')?'high': key.includes('med')||key.includes('moderate')?'medium': key.includes('low')?'low':'unknown';
                      return (
                        <li key={sev} className="severity-item">
                          <span className={`severity-badge ${cls}`}>{sev}</span>
                          <span className="severity-count">{c}</span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>

            {/* Insights Carousel */}
            <DashboardMapInsightsCarousel selectedYear={year} supabaseClient={supabase} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;