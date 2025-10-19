import React, { useState, useEffect } from 'react';
import { createClient } from "@supabase/supabase-js";
import { sendAccountStatusEmail } from './utils/emailService';
import { isAdministrator } from './utils/authUtils';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import './AdminDashboard.css';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function AdminDashboard() {
  const [allAccounts, setAllAccounts] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' or 'logs'

  // Check user role on component mount
  useEffect(() => {
    if (!isAdministrator()) {
      setAccessDenied(true);
      setIsLoading(false);
      return;
    }
    fetchAllAccounts();
  }, []);

  // Fetch user logs when logs tab is active
  useEffect(() => {
    if (activeTab === 'logs' && userLogs.length === 0) {
      fetchUserLogs();
    }
  }, [activeTab]);

  const fetchAllAccounts = async () => {
    try {
      // Get current user's email from localStorage
      const adminData = localStorage.getItem('adminData');
      const currentUserEmail = adminData ? JSON.parse(adminData).email : null;

      const { data, error } = await supabase
        .from('police')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching accounts:', error);
        setMessage('Error loading accounts');
        return;
      }

      // Filter out the current admin user
      const filteredAccounts = (data || []).filter(account => 
        account.email !== currentUserEmail
      );

      setAllAccounts(filteredAccounts);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('logs')
        .select(`
          *,
          police:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to last 100 logs

      if (error) {
        console.error('Error fetching user logs:', error);
        setMessage('Error loading user logs');
        return;
      }

      setUserLogs(data || []);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading user logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleAccountAction = async (accountId, action) => {
    try {
      let newStatus;
      let actionText;
      
      if (action === 'approve') {
        newStatus = 'approved';
        actionText = 'approved';
      } else if (action === 'reject') {
        newStatus = 'rejected';
        actionText = 'rejected';
      } else if (action === 'revoke') {
        newStatus = 'rejected';
        actionText = 'revoked';
      } else if (action === 'delete') {
        // Handle delete action separately
        await handleDeleteAccount(accountId);
        return;
      }
      
      const { error } = await supabase
        .from('police')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) {
        console.error('Error updating account status:', error);
        setMessage('Error updating account status');
        return;
      }

      // Send email notification
      await sendEmailNotification(accountId, newStatus);
      
      // Refresh the list
      await fetchAllAccounts();
      
      setMessage(`Account ${actionText} successfully`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error processing request');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      const { error } = await supabase
        .from('police')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting account:', error);
        setMessage('Error deleting account');
        return;
      }

      // Refresh the list
      await fetchAllAccounts();
      
      setMessage('Account deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error deleting account');
    }
  };

  const sendEmailNotification = async (accountId, status) => {
    try {
      // Get account details
      const { data: account } = await supabase
        .from('police')
        .select('email, full_name')
        .eq('id', accountId)
        .single();

      if (!account) return;

      // Send email notification
      const result = await sendAccountStatusEmail(account.email, account.full_name, status);
      
      if (result.success) {
        console.log(`Email notification sent to ${account.email}: Account ${status}`);
      } else {
        console.error('Failed to send email notification:', result.error);
      }
      
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading">Loading accounts...</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="admin-dashboard-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page. Only Administrators can view the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="admin-dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Manage accounts and view user activity logs</p>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          Account Management ({allAccounts.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          User Activity Logs
        </button>
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <>
          {allAccounts.length === 0 ? (
            <div className="no-accounts">
              <p>No accounts found</p>
            </div>
          ) : (
            <div className="accounts-table-container">
              <div className="accounts-table-header">
                <div className="header-name">Name</div>
                <div className="header-status">Status</div>
                <div className="header-actions">Actions</div>
              </div>
              <div className="accounts-table-body">
                {allAccounts.map((account) => (
                  <div key={account.id} className="account-row">
                    <div className="account-name">
                      {account.full_name}
                    </div>
                    <div className="account-status">
                      <span className={`status-badge ${account.status?.toLowerCase()}`}>
                        {account.status === 'pending' ? 'Pending' : 
                         account.status === 'approved' ? 'Verified' :
                         account.status === 'rejected' ? 'Rejected' : account.status}
                      </span>
                    </div>
                    <div className="account-actions">
                      {account.status === 'pending' && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleAccountAction(account.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleAccountAction(account.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {account.status === 'approved' && (
                        <button
                          className="revoke-btn"
                          onClick={() => handleAccountAction(account.id, 'revoke')}
                        >
                          Revoke Verification
                        </button>
                      )}
                      {account.status === 'rejected' && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleAccountAction(account.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleAccountAction(account.id, 'delete')}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {logsLoading ? (
            <div className="loading">Loading user activity logs...</div>
          ) : userLogs.length === 0 ? (
            <div className="no-logs">
              <p>No user activity logs found</p>
            </div>
          ) : (
            <div className="logs-list">
              {userLogs.map((log) => (
                <div key={log.id} className="log-card">
                  <div className="log-info">
                    <div className="log-header">
                      <h4>{log.police?.full_name || 'Unknown User'}</h4>
                      <span className="log-time">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="log-email">{log.police?.email || 'No email'}</p>
                    <p className="log-activity">
                      <strong>Activity:</strong> {log.activity || 'No activity description'}
                    </p>
                    {log.details && (
                      <p className="log-details">
                        <strong>Details:</strong> {log.details}
                      </p>
                    )}
                    {log.ip_address && (
                      <p className="log-ip">
                        <strong>IP:</strong> {log.ip_address}
                      </p>
                    )}
                  </div>
                  <div className="log-type">
                    <span className={`log-type-badge ${log.log_type?.toLowerCase() || 'info'}`}>
                      {log.log_type || 'INFO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;