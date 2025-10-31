import React, { useState, useEffect } from "react";
import { useUser } from "./UserContext";
import { createClient } from "@supabase/supabase-js";
import { secureHash, verifySecureHash } from "./utils/passwordUtils";
import { validatePassword, validateFullName, validateEmail, validateStation } from "./utils/validation";
import { logProfileEvent } from "./utils/loggingUtils";
import SingleSelectDropdown from "./SingleSelectDropdown";
import "./Profile.css";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const { user, updateUser } = useUser();

  // Fetch user data from Supabase
  useEffect(() => {
    fetchUserData();
  }, []);

  // Initialize edit form when user data is loaded
  useEffect(() => {
    if (userData) {
      setEditForm({
        fullName: userData.full_name,
        email: userData.email,
        station: userData.station || ''
      });
    }
  }, [userData]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Get user data from localStorage (your current auth system)
      const adminData = localStorage.getItem('adminData');
      
      if (!adminData) {
        setMessage('No user data found. Please log in again.');
        return;
      }

      const userData = JSON.parse(adminData);
      setUserData(userData);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading profile data');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSave = async () => {
    // Validate all fields
    const fullNameError = validateFullName(editForm.fullName);
    if (fullNameError) {
      setMessage(fullNameError);
      return;
    }

    const emailError = validateEmail(editForm.email);
    if (emailError) {
      setMessage(emailError);
      return;
    }

    const stationError = validateStation(editForm.station);
    if (stationError) {
      setMessage(stationError);
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('police')
        .update({
          full_name: editForm.fullName,
          email: editForm.email,
          station: editForm.station
        })
        .eq('email', userData.email);

      if (error) {
        console.error('Error updating profile:', error);
        setMessage('Error updating profile. Please try again.');
        return;
      }

      // Update local user data
      setUserData(prev => ({
        ...prev,
        full_name: editForm.fullName,
        email: editForm.email,
        station: editForm.station
      }));

      // Update localStorage with new data
      const updatedUserData = {
        ...userData,
        full_name: editForm.fullName,
        email: editForm.email,
        station: editForm.station
      };
      localStorage.setItem('adminData', JSON.stringify(updatedUserData));

      // Update context
      updateUser({
        fullName: editForm.fullName,
        email: editForm.email,
        role: userData.role,
        station: editForm.station
      });

      // Log profile update
      const updateDetails = `Updated: ${editForm.fullName} (${editForm.email}) - Station: ${editForm.station}`;
      await logProfileEvent.updated(updateDetails);

      setIsEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (userData) {
      setEditForm({
        fullName: userData.full_name,
        email: userData.email,
        station: userData.station || ''
      });
    }
    setIsEditing(false);
    setMessage('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage('All password fields are required.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    // Validate new password
    const passwordError = validatePassword(passwordForm.newPassword);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    try {
      setIsLoading(true);

      // Verify current password
      const isCurrentPasswordValid = await verifySecureHash(passwordForm.currentPassword, userData.password);
      
      if (!isCurrentPasswordValid) {
        setMessage('Current password is incorrect.');
        return;
      }

      // Hash new password
      const hashedNewPassword = await secureHash(passwordForm.newPassword);

      // Update password in database
      const { error } = await supabase
        .from('police')
        .update({ password: hashedNewPassword })
        .eq('email', userData.email);

      if (error) {
        console.error('Error updating password:', error);
        setMessage('Error updating password. Please try again.');
        return;
      }

      // Update local user data with new hashed password
      const updatedUserData = {
        ...userData,
        password: hashedNewPassword
      };
      setUserData(updatedUserData);
      
      // Update localStorage with new password hash
      localStorage.setItem('adminData', JSON.stringify(updatedUserData));

      // Log password change
      await logProfileEvent.passwordChanged();

      setMessage('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error updating password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !userData) {
    return (
      <div className="profile-scroll-wrapper">
        <div className="profile-container">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="profile-scroll-wrapper">
        <div className="profile-container">
          <div className="error">Error loading profile data</div>
        </div>
      </div>
    );
  }

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
              className={activeTab === "overview" ? "tab active" : "tab"}
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
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="tab-section">
              <h3 className="tab-title">Profile Overview</h3>
              
              {/* Profile Fields */}
              <div className="profile-item">
                <p className="profile-label">🧷 Full Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.fullName || ''}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="profile-edit-input"
                    maxLength={100}
                    required
                  />
                ) : (
                  <p className="profile-value">{userData.full_name}</p>
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
                    maxLength={254}
                    required
                  />
                ) : (
                  <p className="profile-value">{userData.email}</p>
                )}
              </div>

              <div className="profile-item">
                <p className="profile-label">🧑🏻‍✈️ Role</p>
                <p className="profile-value">{userData.role}</p>
              </div>

              <div className="profile-item">
                <p className="profile-label">🏢 Station</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.station || ''}
                    onChange={(e) => setEditForm({ ...editForm, station: e.target.value })}
                    className="profile-edit-input"
                    maxLength={50}
                    required
                  />
                ) : (
                  <p className="profile-value">{userData.station || 'Not specified'}</p>
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
                  maxLength={128}
                />
                <input 
                  type="password" 
                  placeholder="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="profile-edit-input"
                  maxLength={128}
                />
                <input 
                  type="password" 
                  placeholder="Confirm Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="profile-edit-input"
                  maxLength={128}
                />
                <div className="form-buttons">
                  <button 
                    type="button" 
                    className="btn btn--ghost"
                    onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn--primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Buttons at the very bottom of the card */}
        <div className="profile-footer-buttons">
          {activeTab === "overview" && !isEditing && (
            <button onClick={handleEdit} className="btn btn--primary">
              Edit Profile
            </button>
          )}
          {activeTab === "overview" && isEditing && (
            <div className="edit-buttons">
              <button 
                onClick={handleSave} 
                className="btn btn--success"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : '✓ Save'}
              </button>
              <button 
                onClick={handleCancel} 
                className="btn btn--danger"
                disabled={isLoading}
              >
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