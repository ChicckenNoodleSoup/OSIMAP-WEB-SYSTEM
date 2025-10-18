import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAdministrator } from './utils/authUtils';
import './Sidebar.css';

function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <img
            src={collapsed ? "/osimap-logo.svg" : "/signin-logo.png"}
            alt="Logo"
            className="logo-img"
          />
        </div>

        <div
          className="hamburger-menu"
          role="button"
          aria-label="Toggle sidebar"
          aria-expanded={!collapsed}
          tabIndex={0}
          onClick={toggleSidebar}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSidebar();
            }
          }}
        >
          ☰
        </div>

        {!collapsed && (
          <div className="menu">
            <div
              className={`menu-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              <img src="/dashboard-icon.png" alt="Dashboard" />
              <span>Dashboard</span>
            </div>

            <div
              className={`menu-item ${isActive('/map') ? 'active' : ''}`}
              onClick={() => navigate('/map')}
            >
              <img src="/map-icon.png" alt="View Map" />
              <span>View Map</span>
            </div>

            <div
              className={`menu-item ${isActive('/currentrecords') ? 'active' : ''}`}
              onClick={() => navigate('/currentrecords')}
            >
              <img src="/currentrecords-icon.png" alt="Current Records" />
              <span>Current Records</span>
            </div>

            <div
              className={`menu-item ${isActive('/add-record') ? 'active' : ''}`}
              onClick={() => navigate('/add-record')}
            >
              <img src="/record-icon.png" alt="Add Record" />
              <span>Add Record</span>
            </div>

            <div
              className={`menu-item ${isActive('/print') ? 'active' : ''}`}
              onClick={() => navigate('/print')}
            >
              <img src="/print-icon.png" alt="Help" />
              <span>Print Records</span>
            </div>

            {isAdministrator() && (
              <div
                className={`menu-item ${isActive('/admin-dashboard') ? 'active' : ''}`}
                onClick={() => navigate('/admin-dashboard')}
              >
                <img src="/admin-dashboard-icon.png" alt="Admin Dashboard" />
                <span>Admin Dashboard</span>
              </div>
            )}

            <div
              className={`menu-item ${isActive('/helpsupport') ? 'active' : ''}`}
              onClick={() => navigate('/helpsupport')}
            >
              <img src="/help-icon.png" alt="Help" />
              <span>Developer Support</span>
            </div>

          </div>
        )}
      </div>

      {!collapsed && (
        <div className="sidebar-bottom">
          <div
            className={`menu-item ${isActive('/profile') ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            <img src="/profile-icon.png" alt="User" />
            <span>User Profile</span>
          </div>

          <div className="logout-btn" onClick={onLogout}>
            <button>Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;