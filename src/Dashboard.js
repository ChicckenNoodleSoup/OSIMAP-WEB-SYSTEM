import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext'; // Only new import added
import './Dashboard.css';
import { DateTime } from './DateTime';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [userData, setUserData] = useState(null);
  const currentYearDefault = new Date().getFullYear();
  const [year, setYear] = useState(currentYearDefault);
  const [count, setCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const [clusteredAccidentsCount, setClusteredAccidentsCount] = useState(null);
  const [loadingClusters, setLoadingClusters] = useState(false);

  const [severityCounts, setSeverityCounts] = useState({});
  const [loadingSeverity, setLoadingSeverity] = useState(false);

  const [barangayCounts, setBarangayCounts] = useState({});

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

  // Fetch clustered accidents
  const fetchClusteredAccidentCount = async (y) => {
    setLoadingClusters(true);
    try {
      const { data, error } = await supabase
        .from('road_traffic_accident')
        .select('lat,lng,barangay')
        .eq('year', Number(y));

      if (error) {
        console.error(error);
        setClusteredAccidentsCount(0);
        setBarangayCounts({});
        return;
      }

      const grid = new Map();
      const bCounts = {};

      (data || []).forEach(r => {
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
      console.error(err);
      setClusteredAccidentsCount(0);
      setBarangayCounts({});
    } finally {
      setLoadingClusters(false);
    }
  };

  // Fetch severity counts
  const fetchSeverityCounts = async (y) => {
    setLoadingSeverity(true);
    try {
      const { data, error } = await supabase
        .from('road_traffic_accident')
        .select('severity')
        .eq('year', Number(y));

      if (error) {
        console.error(error);
        setSeverityCounts({});
        return;
      }

      const counts = (data || []).reduce((acc,row)=>{
        const s = (row.severity??'Unknown').toString();
        acc[s] = (acc[s]||0)+1;
        return acc;
      },{});
      setSeverityCounts(counts);
    } catch(err){
      console.error(err);
      setSeverityCounts({});
    } finally {
      setLoadingSeverity(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchCountForYear(year);
    fetchClusteredAccidentCount(year);
    fetchSeverityCounts(year);
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
          {/* Current Records */}
          <div
            className="dashboard-card card-large"
            onClick={() => navigate('/currentrecords')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/currentrecords') }}
          >
            <h2>📊 Current Records</h2>

            <div className="dashboard-card-stat">
              <span className="stat-number">{count ?? '...'}</span>
              <span className="stat-label">road accidents in {year}</span>
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
          </div>

          {/* Bottom row: User Profile + Add Record (side by side) */}
          <div className="bottom-cards-row">
            {/* User Profile - ONLY THIS SECTION WAS MODIFIED */}
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
            {/* END OF MODIFIED SECTION */}

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

        {/* Right column */}
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
              <span className="stat-label">clustered accident{clusteredAccidentsCount===1?'':'s'}</span>
            </div>

            <div className="severity-section">
              <div className="severity-title">By Severity</div>
              {loadingSeverity ? (
                <div className="stat-loading">Loading…</div>
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

            <div className="barangay-section">
              <div className="barangay-title">Per Barangay</div>
              {Object.keys(barangayCounts).length === 0 ? (
                <div className="stat-none">No data</div>
              ) : (
                <ul className="barangay-list">
                  {Object.entries(barangayCounts)
                    .sort((a, b) => b[1] - a[1]) // sort descending by count
                    .map(([b, count]) => (
                      <li key={b} className="barangay-item">
                        <span className="barangay-name">{b}</span>
                        <span className="barangay-count">{count}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;