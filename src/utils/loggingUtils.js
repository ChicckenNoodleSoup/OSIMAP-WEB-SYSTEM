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
 * Returns the log entry ID for linking to upload history
 */
export const logDataEvent = {
  uploadCompleted: async (filename, status, details = null) => {
    const activity = status === 'success' 
      ? `File upload completed successfully: ${filename}`
      : `File upload failed: ${filename}`;
    const logType = status === 'success' ? 'SUCCESS' : 'ERROR';
    
    try {
      // Get current user from localStorage
      const adminData = localStorage.getItem('adminData');
      const currentUser = adminData ? JSON.parse(adminData) : null;
      const logUserId = currentUser?.id || null;

      // Get user's IP address
      let ipAddress = null;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn('Could not fetch IP address:', error);
      }

      // Insert log entry and return the ID
      const { data: logData, error } = await supabase
        .from('logs')
        .insert({
          user_id: logUserId,
          activity: activity,
          log_type: logType,
          details: details,
          ip_address: ipAddress
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error logging upload completion:', error);
        return null;
      }
      
      return logData?.id;
    } catch (error) {
      console.error('Error in logDataEvent.uploadCompleted:', error);
      return null;
    }
  }
};

/**
 * Logs system access events
 */
export const logSystemEvent = {
  printReport: (reportType = 'accident data report') => logUserActivity(`Printed ${reportType}`, 'INFO', `Report type: ${reportType}`)
};

/**
 * Upload history management (stored in Supabase)
 * 
 * SECURITY NOTE: All operations are scoped to the current logged-in user
 * using their ID from the 'police' table stored in localStorage.
 */
export const uploadHistoryService = {
  /**
   * Get current user ID from localStorage
   * @returns {string|null} User ID (UUID) or null if not authenticated
   */
  _getCurrentUserId: () => {
    try {
      const adminData = localStorage.getItem('adminData');
      if (!adminData) return null;
      
      const currentUser = JSON.parse(adminData);
      if (!currentUser?.id) return null;
      
      return currentUser.id;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  /**
   * Save upload summary to Supabase
   * @param {object} summary - Upload summary object
   * @param {number} logId - Associated log entry ID
   */
  save: async (summary, logId = null) => {
    try {
      const userId = uploadHistoryService._getCurrentUserId();
      if (!userId) {
        console.error('Cannot save upload history: No user ID found');
        return null;
      }

      const { data, error } = await supabase
        .from('upload_history')
        .insert({
          user_id: userId, // SECURITY: Always use authenticated user's ID
          log_id: logId,
          file_name: summary.fileName,
          file_size: summary.fileSize,
          upload_started_at: summary.uploadedAt,
          upload_completed_at: summary.completedAt || null,
          processing_time: summary.processingTime || null,
          records_processed: summary.recordsProcessed || null,
          sheets_processed: summary.sheetsProcessed || [],
          new_records: summary.newRecords !== undefined ? summary.newRecords : null,
          duplicate_records: summary.duplicateRecords !== undefined ? summary.duplicateRecords : null,
          status: summary.status,
          error_message: summary.errorMessage || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving upload history:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in uploadHistoryService.save:', error);
      return null;
    }
  },

  /**
   * Fetch upload history from Supabase (scoped to current user)
   * @param {number} limit - Number of records to fetch
   * @returns {Array} Upload history records for current user only
   */
  fetch: async (limit = 10) => {
    try {
      const userId = uploadHistoryService._getCurrentUserId();
      if (!userId) return [];

      // SECURITY: Query is filtered by current user's ID
      const { data, error } = await supabase
        .from('upload_history')
        .select('*')
        .eq('user_id', userId) // CRITICAL: Only fetch current user's records
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching upload history:', error);
        return [];
      }

      // Additional security check: Verify all returned records belong to current user
      const filteredData = (data || []).filter(record => record.user_id === userId);
      
      if (filteredData.length !== (data || []).length) {
        console.error('Security warning: Some records did not belong to current user');
      }

      return filteredData;
    } catch (error) {
      console.error('Error in uploadHistoryService.fetch:', error);
      return [];
    }
  },

  /**
   * Clear all upload history for current user ONLY
   * @returns {boolean} True if successful, false otherwise
   */
  clear: async () => {
    try {
      const userId = uploadHistoryService._getCurrentUserId();
      if (!userId) return false;

      // SECURITY: Delete only records belonging to current user
      const { error } = await supabase
        .from('upload_history')
        .delete()
        .eq('user_id', userId); // CRITICAL: Only delete current user's records

      if (error) {
        console.error('Error clearing upload history:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in uploadHistoryService.clear:', error);
      return false;
    }
  }
};

export default {
  logUserActivity,
  logAuthEvent,
  logAccountEvent,
  logProfileEvent,
  logDataEvent,
  logSystemEvent,
  uploadHistoryService
};