import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Global flag to prevent duplicate session expiration logging
let sessionExpirationLogged = false;

/**
 * Logs user activity to the logs table
 * @param {string} activity - Description of the activity
 * @param {string} logType - Type of log (INFO, SUCCESS, WARNING, ERROR, LOGIN, LOGOUT)
 * @param {string} details - Additional details about the activity
 * @param {string} ipAddress - IP address of the user (optional)
 * @param {string} userId - Optional user ID for cases where user is not authenticated
 */
export const logUserActivity = async (activity, logType = 'INFO', details = null, ipAddress = null, userId = null) => {
  try {
    // Get current user from localStorage or use provided userId
    let currentUser = null;
    if (userId) {
      currentUser = { id: userId };
    } else {
      const adminData = localStorage.getItem('adminData');
      currentUser = adminData ? JSON.parse(adminData) : null;
    }
    
    // For authentication events without a user, we'll log with null user_id
    const logUserId = currentUser?.id || null;

    // Get user's IP address if not provided
    if (!ipAddress) {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn('Could not fetch IP address:', error);
      }
    }

    // Insert log entry
    const { error } = await supabase
      .from('logs')
      .insert({
        user_id: logUserId,
        activity: activity,
        log_type: logType,
        details: details,
        ip_address: ipAddress
      });

    if (error) {
      console.error('Error logging user activity:', error);
    } else {
      console.log('Activity logged:', activity);
    }
  } catch (error) {
    console.error('Error in logUserActivity:', error);
  }
};

/**
 * Logs authentication events
 */
export const logAuthEvent = {
  login: (ipAddress = null) => {
    sessionExpirationLogged = false; // Reset flag on login
    return logUserActivity('User logged in successfully', 'LOGIN', null, ipAddress);
  },
  logout: (ipAddress = null) => logUserActivity('User logged out', 'LOGOUT', null, ipAddress),
  failedLogin: (ipAddress = null, email = null) => logUserActivity('Failed login attempt', 'WARNING', `Invalid credentials for email: ${email || 'unknown'}`, ipAddress),
  loginBlockedPending: (ipAddress = null, email = null) => logUserActivity('Login blocked - account pending', 'WARNING', `User attempted login with pending account: ${email || 'unknown'}`, ipAddress),
  loginBlockedRejected: (ipAddress = null, email = null) => logUserActivity('Login blocked - account rejected/revoked', 'WARNING', `User attempted login with rejected/revoked account: ${email || 'unknown'}`, ipAddress),
  sessionExpired: () => {
    if (!sessionExpirationLogged) {
      sessionExpirationLogged = true;
      return logUserActivity('Session expired', 'WARNING', 'User session timed out due to inactivity');
    }
    return Promise.resolve(); // Return resolved promise if already logged
  }
};

/**
 * Logs account management events
 */
export const logAccountEvent = {
  created: (userId, details = 'Account status: pending') => logUserActivity('New account created', 'INFO', details, null, userId),
  approved: (userId, details = 'Status changed from pending to approved') => logUserActivity('Account approved by administrator', 'SUCCESS', details),
  rejected: (userId, details = 'Status changed from pending to rejected') => logUserActivity('Account rejected by administrator', 'WARNING', details),
  revoked: (userId, details = 'Status changed from approved to revoked') => logUserActivity('Account revoked by administrator', 'WARNING', details),
  deleted: (userId, details = 'Account permanently removed from system') => logUserActivity('Account deleted by administrator', 'WARNING', details),
  undone: (userId, details = 'Status reverted to previous state') => logUserActivity('Account status undone by administrator', 'INFO', details),
  roleUpdated: (userId, details = 'User role updated') => logUserActivity('User role updated by administrator', 'INFO', details)
};

/**
 * Logs profile management events
 */
export const logProfileEvent = {
  updated: (details = 'Profile information updated') => logUserActivity('Profile information updated', 'INFO', details),
  passwordChanged: () => logUserActivity('Password changed', 'INFO', 'Password successfully updated')
};

/**
 * Logs data management events
 */
export const logDataEvent = {
  fileUploaded: (filename) => logUserActivity('Excel file uploaded for processing', 'INFO', `File: ${filename}`),
  processingStarted: () => logUserActivity('Data processing pipeline started', 'INFO', 'Processing Excel data through Python scripts'),
  processingCompleted: () => logUserActivity('Data processing pipeline completed', 'SUCCESS', 'Data successfully converted to GeoJSON'),
  processingFailed: (errorDetails) => logUserActivity('Data processing failed', 'ERROR', `Error: ${errorDetails}`)
};

/**
 * Logs system access events
 */
export const logSystemEvent = {
  printReport: (reportType = 'accident data report') => logUserActivity(`Printed ${reportType}`, 'INFO', `Report type: ${reportType}`)
};

export default {
  logUserActivity,
  logAuthEvent,
  logAccountEvent,
  logProfileEvent,
  logDataEvent,
  logSystemEvent
};