import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
            src={collapsed ? "/osimap-logo.png" : "/signin-logo.png"}
            alt="Logo"
            className="logo-img"
          />
        </div>

        <div className="hamburger-menu" onClick={toggleSidebar}>☰</div>

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
              className={`menu-item ${isActive('/helpsupport') ? 'active' : ''}`}
              onClick={() => navigate('/helpsupport')}
            >
              <img src="/help-icon.png" alt="Help" />
              <span>Help & Support</span>
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
