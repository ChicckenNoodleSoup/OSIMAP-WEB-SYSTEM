import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      <div className="dashboard-grid">

        {/* Left column */}
        <div className="dashboard-column">
          <div className="dashboard-card card-large" onClick={() => navigate('/currentrecords')}>
            <h2>Current Records</h2>
            <p>View all existing records</p>
          </div>

          <div className="small-cards-row">
            <div className="dashboard-card card-small" onClick={() => navigate('/add-record')}>
              <h2>Add Record</h2>
              <p>Quickly add a new record</p>
            </div>

            <div className="dashboard-card card-small" onClick={() => navigate('/help')}>
              <h2>Help & Support</h2>
              <p>Get assistance and FAQs</p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-column">
          <div className="dashboard-card card-large card-map" onClick={() => navigate('/map')}>
            <h2>Map View</h2>
            <p>See accident locations</p>
          </div>

          <div className="dashboard-card card-medium" onClick={() => navigate('/profile')}>
              <h2>User Profile</h2>
              <p>Manage your account</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;


