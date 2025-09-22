import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { DateTime } from './DateTime';

function Dashboard() {
  const navigate = useNavigate();

  // Placeholder constants (replace with real data later)
  const recordCount = 12000;
  const lastUpdated = 'September 22, 2025, 6:45 PM';

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <DateTime />
      </div>

      <div className="dashboard-grid">
        {/* Left column */}
        <div className="dashboard-column">
          <div className="dashboard-card card-large" onClick={() => navigate('/currentrecords')}>
            <h2>Current Records</h2>
            <img src="/records-icon.png" alt="Records Icon" className="records-icon" />
            <div className="card-content">
              <p><strong>Entries:</strong> {recordCount}</p>
              <p><strong>Last Updated:</strong> {lastUpdated}</p>
            </div>
          </div>

          <div className="small-cards-row">
            <div className="dashboard-card card-small" onClick={() => navigate('/add-record')}>
              <h2>Add Record</h2>
              <div className="icon-container">
                <img src="/record-icon.png" alt="Record Icon" className="dashboard-icon" />
              </div>
            </div>

            <div className="dashboard-card card-small" onClick={() => navigate('/helpsupport')}>
              <h2>Help & Support</h2>
              <div className="icon-container">
                <img src="/help-icon.png" alt="Help Icon" className="dashboard-icon" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-column">
          <div className="dashboard-card card-large card-map" onClick={() => navigate('/map')}>
            <h2>Map View</h2>
          </div>

          <div className="dashboard-card card-medium" onClick={() => navigate('/profile')}>
            <h2>User Profile</h2>
            <h3 className="username">John Doe</h3>
            <div className="profile-info">
              <img src="/profile-icon.png" alt="Profile Icon" className="profile-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
