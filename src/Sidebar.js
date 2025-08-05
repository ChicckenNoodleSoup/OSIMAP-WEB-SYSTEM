import React from 'react';
import { useNavigate } from 'react-router-dom';

function Sidebar({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="sidebar">
      <div>
        <div className="logo">
          <img src="/logo192.png" alt="Logo" />
          <span>OSIMAP</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/')}>
          <img src="https://via.placeholder.com/24.png?text=Dashboard" alt="Dashboard" />
          <span>Dashboard</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/map')}>
          <img src="https://via.placeholder.com/24.png?text=Map" alt="Map" />
          <span>View Map</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/add-record')}>
          <img src="https://via.placeholder.com/24.png?text=Add" alt="Add" />
          <span>Add Record</span>
        </div>
        <div className="menu-item" onClick={() => alert('Feature coming soon!')}>
          <img src="https://via.placeholder.com/24.png?text=Records" alt="Records" />
          <span>Current Records</span>
        </div>
        <div className="menu-item">
          <img src="https://via.placeholder.com/24.png?text=Support" alt="Support" />
          <span>Help & Support</span>
        </div>
      </div>
      <div>
        <div className="menu-item">
          <img src="https://via.placeholder.com/24.png?text=Profile" alt="Profile" />
          <span>User Profile</span>
        </div>
        <div className="menu-item" onClick={onLogout}>
          <span style={{ color: 'red' }}>Logout</span>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
