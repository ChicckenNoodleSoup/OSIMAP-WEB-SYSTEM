import React, { useState, useEffect } from "react";
import { useUser } from "./UserContext";
import "./Profile.css";

function Profile() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const { user, updateUser } = useUser();

  // Initialize edit form with current user data
  useEffect(() => {
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      station: user.station
    });
  }, [user]);

  // Clear message when switching tabs
  useEffect(() => {
    setMessage('');
  }, [activeTab]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setIsEditing(false); // Cancel any editing when changing tabs
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage('');
  };

  const handleSave = () => {
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      setMessage('Name and email are required fields.');
      return;
    }

    updateUser({
      fullName: editForm.fullName,
      email: editForm.email,
      role: editForm.role,
      station: editForm.station
    });

    setIsEditing(false);
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCancel = () => {
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      station: user.station
    });
    setIsEditing(false);
    setMessage('');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage('All password fields are required.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    // Here you would make an API call to update the password
    setMessage('Password updated successfully!');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="profile-scroll-wrapper">
      <div className="profile-container">
        {/* Logo at the top */}
        <img src="/signin-logo.svg" alt="Logo" className="profile-logo" />

        {/* Content Box (Tabs + Content together) */}
        <div className="profile-content">
          {/* Message Display */}
          {message && (
            <div className={`profile-message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {/* Tabs inside content box */}
          <div className="profile-tabs">
            <div
              className={activeTab === "profile" ? "tab active" : "tab"}
              onClick={() => handleTabChange("overview")}
            >
              Overview
            </div>
            <div
              className={activeTab === "security" ? "tab active" : "tab"}
              onClick={() => handleTabChange("security")}
            >
              Security
            </div>
            <div
              className={activeTab === "activity" ? "tab active" : "tab"}
              onClick={() => handleTabChange("activity")}
            >
              Activity
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="tab-section">
              <h3 className="tab-title"></h3>
              
              {/* Profile Fields */}
              <div className="profile-item">
                <p className="profile-label">🧷 Full Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.fullName || ''}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="profile-edit-input"
                  />
                ) : (
                  <p className="profile-value">{user.fullName}</p>
                )}
              </div>

              <div className="profile-item">
                <p className="profile-label">📮 Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="profile-edit-input"
                  />
                ) : (
                  <p className="profile-value">{user.email}</p>
                )}
              </div>

              <div className="profile-item">
                <p className="profile-label">🧑🏻‍✈️ Role</p>
                {isEditing ? (
                  <select
                    value={editForm.role || ''}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="profile-edit-select"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Officer">Officer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Analyst">Analyst</option>
                  </select>
                ) : (
                  <p className="profile-value">{user.role}</p>
                )}
              </div>

              <div className="profile-item">
                <p className="profile-label">🏢 Station</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.station || ''}
                    onChange={(e) => setEditForm({ ...editForm, station: e.target.value })}
                    className="profile-edit-input"
                  />
                ) : (
                  <p className="profile-value">{user.station}</p>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="tab-section">
              <h3 className="tab-title">Security Settings</h3>
              <form className="profile-form" onSubmit={handlePasswordSubmit}>
                <input 
                  type="password" 
                  placeholder="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="profile-edit-input"
                />
                <input 
                  type="password" 
                  placeholder="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="profile-edit-input"
                />
                <input 
                  type="password" 
                  placeholder="Confirm Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="profile-edit-input"
                />
                <label className="checkbox-label">
                  <input type="checkbox" /> Enable Two-Factor Authentication
                </label>
                <div className="form-buttons">
                  <button 
                    type="button" 
                    className="profile-btn secondary-btn"
                    onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="profile-btn primary-btn">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="tab-section">
              <h3 className="tab-title">Activity Log</h3>
              <ul className="activity-log">
                <li>✔️ Logged in from IP 192.168.1.25 — Aug 18, 2025</li>
                <li>⚙️ Changed password — Aug 10, 2025</li>
                <li>📝 Updated user role for Jane Smith — Aug 8, 2025</li>
                <li>🚪 Logged out — Aug 7, 2025</li>
                <li>📊 Generated monthly report — Aug 5, 2025</li>
                <li>🔄 Updated profile information — Aug 4, 2025</li>
              </ul>
            </div>
          )}
        </div>

        {/* Buttons at the very bottom of the card */}
        <div className="profile-footer-buttons">
          {activeTab === "overview" && !isEditing && (
            <button onClick={handleEdit} className="edit-btn">
              Edit Profile
            </button>
          )}
          {activeTab === "overview" && isEditing && (
            <div className="edit-buttons">
              <button onClick={handleSave} className="save-btn">
                ✓ Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                ✕ Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;