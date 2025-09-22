// Profile.js
import React, { useState } from "react";
import "./Profile.css";

function Profile() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="profile-scroll-wrapper">
      <div className="profile-container">
        {/* Logo at the top */}
        <img src="/signin-logo.png" alt="Logo" className="profile-logo" />


        {/* Content Box (Tabs + Content together) */}
        <div className="profile-content">
          {/* Tabs inside content box */}
          <div className="profile-tabs">
            <div
              className={activeTab === "overview" ? "tab active" : "tab"}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </div>
            <div
              className={activeTab === "security" ? "tab active" : "tab"}
              onClick={() => setActiveTab("security")}
            >
              Security
            </div>
            <div
              className={activeTab === "activity" ? "tab active" : "tab"}
              onClick={() => setActiveTab("activity")}
            >
              Activity
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="tab-section">
              {/* <h3>Account Information</h3> */}
              <div className="profile-item">
                <p className="profile-label">Full Name</p>
                <p className="profile-value">John Doe</p>
              </div>
              <div className="profile-item">
                <p className="profile-label">Email</p>
                <p className="profile-value">johndoe@email.com</p>
              </div>
              <div className="profile-item">
                <p className="profile-label">Role</p>
                <p className="profile-value">Administrator</p>
              </div>
              <div className="profile-item">
                <p className="profile-label">Last Login</p>
                <p className="profile-value">Aug 18, 2025 10:45 AM</p>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="tab-section">
              {/* <h3>Security Settings</h3> */}
              <form className="profile-form">
                <input type="password" placeholder="New Password" />
                <input type="password" placeholder="Confirm Password" />
                <label className="checkbox-label">
                  <input type="checkbox" /> Enable Two-Factor Authentication
                </label>
                <div className="form-buttons">
                  <button type="button" className="profile-btn primary-btn">
                    Cancel
                  </button>
                  <button type="submit" className="profile-btn secondary-btn">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="tab-section">
              {/* <h3>Recent Activity</h3> */}
              <ul className="activity-log">
                <li>✔️ Logged in from IP 192.168.1.25 — Aug 18, 2025</li>
                <li>⚙️ Changed password — Aug 10, 2025</li>
                <li>📝 Updated user role for Jane Smith — Aug 8, 2025</li>
                <li>🚪 Logged out — Aug 7, 2025</li>
                <li>✔️ Logged in from IP 192.168.1.25 — Aug 18, 2025</li>
                <li>⚙️ Changed password — Aug 10, 2025</li>
                <li>📝 Updated user role for Jane Smith — Aug 8, 2025</li>
                <li>🚪 Logged out — Aug 7, 2025</li>
                <li>✔️ Logged in from IP 192.168.1.25 — Aug 18, 2025</li>
                <li>⚙️ Changed password — Aug 10, 2025</li>
                <li>📝 Updated user role for Jane Smith — Aug 8, 2025</li>
                <li>🚪 Logged out — Aug 7, 2025</li>


              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
