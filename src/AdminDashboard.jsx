import React, { useState, useEffect } from 'react';
import { createClient } from "@supabase/supabase-js";
import { sendAccountStatusEmail } from './utils/emailService';
import { isAdministrator } from './utils/authUtils';
import { logAccountEvent } from './utils/loggingUtils';
import { secureHash } from './utils/passwordUtils';
import { validateFullName, validateEmail, validatePassword, validateStation } from './utils/validation';
import SingleSelectDropdown from './SingleSelectDropdown';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { DateTime } from './DateTime';
import { Shield, Users, Activity, CheckCircle, XCircle, Clock, Mail, User, UserCog, UserPlus } from 'lucide-react';
import './AdminDashboard.css';
import './Spinner.css';
import './PageHeader.css';

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
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts', 'logs', 'roles', 'create'
  const [accountsSubTab, setAccountsSubTab] = useState('rejected'); // 'rejected', 'pending', 'approved'
  
  // Pagination states
  const [accountsCurrentPage, setAccountsCurrentPage] = useState(1);
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [rolesCurrentPage, setRolesCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Role assignment state
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  // Create account state
  const [createAccountForm, setCreateAccountForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '',
    station: '',
    status: 'approved' // Admin-created accounts are auto-approved
  });
  const [showPassword, setShowPassword] = useState(false);

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

  // Reset pagination when switching account sub-tabs
  useEffect(() => {
    setAccountsCurrentPage(1);
  }, [accountsSubTab]);

  // Get accounts for current sub-tab (must be defined before using it)
  const getAccountsForCurrentTab = () => {
    if (accountsSubTab === 'rejected') {
      return allAccounts.filter(account => 
        account.status === 'rejected' || account.status === 'revoked'
      );
    } else if (accountsSubTab === 'pending') {
      return allAccounts.filter(account => account.status === 'pending');
    } else if (accountsSubTab === 'approved') {
      return allAccounts.filter(account => account.status === 'approved');
    }
    return [];
  };

  // Pagination logic
  const getPaginatedAccounts = () => {
    const accountsForCurrentTab = getAccountsForCurrentTab();
    const startIndex = (accountsCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return accountsForCurrentTab.slice(startIndex, endIndex);
  };

  const getPaginatedLogs = () => {
    const startIndex = (logsCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return userLogs.slice(startIndex, endIndex);
  };

  const approvedAccountsForRoles = allAccounts.filter(acc => acc.status === 'approved');
  
  const getPaginatedRoles = () => {
    const startIndex = (rolesCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return approvedAccountsForRoles.slice(startIndex, endIndex);
  };

  // Calculate display ranges
  const accountsDisplayStart = getAccountsForCurrentTab().length > 0 ? ((accountsCurrentPage - 1) * itemsPerPage) + 1 : 0;
  const accountsDisplayEnd = Math.min(accountsCurrentPage * itemsPerPage, getAccountsForCurrentTab().length);

  const logsDisplayStart = userLogs.length > 0 ? ((logsCurrentPage - 1) * itemsPerPage) + 1 : 0;
  const logsDisplayEnd = Math.min(logsCurrentPage * itemsPerPage, userLogs.length);

  const rolesDisplayStart = approvedAccountsForRoles.length > 0 ? ((rolesCurrentPage - 1) * itemsPerPage) + 1 : 0;
  const rolesDisplayEnd = Math.min(rolesCurrentPage * itemsPerPage, approvedAccountsForRoles.length);

  // Organize accounts by status
  const getAccountsByStatus = () => {
    const rejectedRevoked = allAccounts.filter(account => 
      account.status === 'rejected' || account.status === 'revoked'
    );
    const pending = allAccounts.filter(account => account.status === 'pending');
    const approved = allAccounts.filter(account => account.status === 'approved');
    
    return { rejectedRevoked, pending, approved };
  };

  const accountsTotalPages = Math.ceil(getAccountsForCurrentTab().length / itemsPerPage);
  const logsTotalPages = Math.ceil(userLogs.length / itemsPerPage);
  const rolesTotalPages = Math.ceil(approvedAccountsForRoles.length / itemsPerPage);

  const fetchAllAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('police')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching accounts:', error);
        setMessage('Error loading accounts');
        return;
      }

      // Show all accounts except administrators
      const filteredAccounts = (data || []).filter(account => 
        account.role !== 'Administrator'
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
        .order('created_at', { ascending: false });

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
        newStatus = 'revoked';
        actionText = 'revoked';
      } else if (action === 'undo') {
        // Get the account to determine its previous status
        const account = allAccounts.find(acc => acc.id === accountId);
        if (account && account.status === 'revoked') {
          newStatus = 'approved';
        } else if (account && account.status === 'approved') {
          newStatus = 'pending';
        } else {
          newStatus = 'pending';
        }
        actionText = 'undone';
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

      // Log the account action
      const account = allAccounts.find(acc => acc.id === accountId);
      const logDetails = `Account ${actionText}: ${account?.full_name} (${account?.email})`;
      
      if (action === 'approve') {
        await logAccountEvent.approved(accountId, logDetails);
      } else if (action === 'reject') {
        await logAccountEvent.rejected(accountId, logDetails);
      } else if (action === 'revoke') {
        await logAccountEvent.revoked(accountId, logDetails);
      } else if (action === 'undo') {
        await logAccountEvent.undone(accountId, logDetails);
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

  const canUndo = (reviewedAt) => {
    if (!reviewedAt) return false;
    const reviewTime = new Date(reviewedAt).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - reviewTime;
    // Allow undo within 24 hours (24 * 60 * 60 * 1000 milliseconds)
    return timeDifference <= 24 * 60 * 60 * 1000;
  };

  const handleDeleteAccount = async (accountId) => {
    // Get account details for confirmation
    const account = allAccounts.find(acc => acc.id === accountId);
    const accountName = account ? account.full_name : 'this account';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${accountName}? This action cannot be undone.`
    );
    
    if (!confirmed) {
      return; // User cancelled the deletion
    }

    try {
      // Send email notification before deleting the account
      if (account) {
        const result = await sendAccountStatusEmail(account.email, account.full_name, 'deleted');
        if (result.success) {
          console.log(`Deletion email sent to ${account.email}`);
        } else {
          console.error('Failed to send deletion email:', result.error);
        }
      }

      const { error } = await supabase
        .from('police')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting account:', error);
        setMessage('Error deleting account');
        return;
      }

      // Log the account deletion
      const logDetails = `Account deleted: ${account?.full_name} (${account?.email})`;
      await logAccountEvent.deleted(accountId, logDetails);

      // Refresh the list
      await fetchAllAccounts();
      
      setMessage(`${accountName} deleted successfully`);
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

  // Handle role assignment
  const handleRoleAssignment = async (userId, role) => {
    try {
      const { error } = await supabase
        .from('police')
        .update({ role })
        .eq('id', userId);

      if (error) {
        console.error('Error updating role:', error);
        setMessage('Error updating role. Please try again.');
        return;
      }

      // Log the role change
      const account = allAccounts.find(acc => acc.id === userId);
      const logDetails = `Role updated: ${account?.full_name} (${account?.email}) - New role: ${role}`;
      await logAccountEvent.roleUpdated(userId, logDetails);

      await fetchAllAccounts();
      setMessage('Role updated successfully!');
      setTimeout(() => setMessage(''), 3000);
      setSelectedUser(null);
      setNewRole('');
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error updating role');
    }
  };

  // Handle account creation by admin
  const handleCreateAccount = async (e) => {
    e.preventDefault();

    // Validate all fields
    const fullNameError = validateFullName(createAccountForm.fullName);
    if (fullNameError) {
      setMessage(fullNameError);
      return;
    }

    const emailError = validateEmail(createAccountForm.email);
    if (emailError) {
      setMessage(emailError);
      return;
    }

    const passwordError = validatePassword(createAccountForm.password);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    const stationError = validateStation(createAccountForm.station);
    if (stationError) {
      setMessage(stationError);
      return;
    }

    if (!createAccountForm.role) {
      setMessage('Role is required.');
      return;
    }

    try {
      setIsLoading(true);

      // Check if email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('police')
        .select('email')
        .eq('email', createAccountForm.email);

      if (checkError) {
        setMessage('Error checking account availability. Please try again.');
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        setMessage('Email already exists');
        return;
      }

      // Hash the password
      const hashedPassword = await secureHash(createAccountForm.password);

      // Insert new account
      const { data, error } = await supabase
        .from('police')
        .insert([
          {
            full_name: createAccountForm.fullName,
            email: createAccountForm.email,
            password: hashedPassword,
            role: createAccountForm.role,
            station: createAccountForm.station,
            status: 'approved', // Admin-created accounts are auto-approved
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        setMessage(`Error creating account: ${error.message}`);
        return;
      }

      // Log account creation
      await logAccountEvent.created(data[0].id, `Admin created account: ${createAccountForm.fullName} (${createAccountForm.email})`);

      // Clear form
      setCreateAccountForm({
        fullName: '',
        email: '',
        password: '',
        role: '',
        station: '',
        status: 'approved'
      });

      await fetchAllAccounts();
      setMessage('Account created successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error creating account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="scroll-wrapper">
        <div className="admin-dashboard-container">
          <div className="loading-center full-height" role="status" aria-live="polite">
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
              <svg 
                className="loading-spinner" 
                viewBox="-13 -13 45 45" 
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle className="box5631" cx="13" cy="1" r="5"/>
                <circle className="box5631" cx="25" cy="1" r="5"/>
                <circle className="box5631" cx="1" cy="13" r="5"/>
                <circle className="box5631" cx="13" cy="13" r="5"/>
                <circle className="box5631" cx="25" cy="13" r="5"/>
                <circle className="box5631" cx="1" cy="25" r="5"/>
                <circle className="box5631" cx="13" cy="25" r="5"/>
                <circle className="box5631" cx="25" cy="25" r="5"/>
                <circle className="box5631" cx="1" cy="1" r="5"/>
              </svg>
              <div className="loading-text">Loading accounts...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="scroll-wrapper">
        <div className="admin-dashboard-container">
          <div className="access-denied">
            <Shield size={48} className="access-denied-icon" />
            <h2>Access Denied</h2>
            <p>You don't have permission to access this page. Only Administrators can view the admin dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admindash-scroll-wrapper">
      <div className="admindash-container">
        <div className="page-header">
          <div className="page-title-container">
            <img src="stopLight.svg" alt="Logo" className="page-logo" />
            <h1 className="page-title">Admin Dashboard</h1>
          </div>

          <DateTime />
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message.includes('Error') ? <XCircle size={18} /> : <CheckCircle size={18} />}
            <span>{message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            <Users size={16} />
            <span>Accounts</span>
            <span className="tab-badge">{allAccounts.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <UserCog size={16} />
            <span>Assign Roles</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Activity size={16} />
            <span>Activity Logs</span>
          </button>
        </div>

        {/* Account Sub-Tab Navigation */}
        {activeTab === 'accounts' && (
          <div className="sub-tab-navigation">
            <button
              className={`sub-tab-btn ${accountsSubTab === 'rejected' ? 'active' : ''}`}
              onClick={() => setAccountsSubTab('rejected')}
            >
              <XCircle size={16} />
              <span>Rejected/Revoked</span>
              <span className="tab-badge">{getAccountsByStatus().rejectedRevoked.length}</span>
            </button>
            <button
              className={`sub-tab-btn ${accountsSubTab === 'pending' ? 'active' : ''}`}
              onClick={() => setAccountsSubTab('pending')}
            >
              <Clock size={16} />
              <span>Pending</span>
              <span className="tab-badge">{getAccountsByStatus().pending.length}</span>
            </button>
            <button
              className={`sub-tab-btn ${accountsSubTab === 'approved' ? 'active' : ''}`}
              onClick={() => setAccountsSubTab('approved')}
            >
              <CheckCircle size={16} />
              <span>Approved</span>
              <span className="tab-badge">{getAccountsByStatus().approved.length}</span>
            </button>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <>
            {getAccountsForCurrentTab().length === 0 ? (
              <div className="no-data">
                <Users size={48} className="no-data-icon" />
                <p>No {accountsSubTab} accounts found</p>
              </div>
            ) : (
              <>
                <div className="accounts-scrollable-wrapper">
                  <div className="accounts-table-container">
                    <div className="accounts-table-header">
                      <div className="header-name">Name</div>
                      <div className="header-status">Status</div>
                      <div className="header-actions">Actions</div>
                    </div>
                    <div className="accounts-table-body">
                      {getPaginatedAccounts().map((account) => (
                      <div key={account.id} className="account-row">
                        <div className="account-name">
                          <div className="account-name-inner">
                            <User size={16} className="mr-2" />
                            <div>
                              <div className="account-position">
                                {account.role || 'New User'}
                              </div>
                              <div className="account-full-name">
                                {account.full_name}
                              </div>
                              <div className="account-email">
                                {account.email}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="account-status">
                          <span className={`status-badge ${account.status?.toLowerCase()}`}>
                            {account.status === 'pending' ? 'Pending' : 
                             account.status === 'approved' ? 'Verified' :
                             account.status === 'rejected' ? 'Rejected' :
                             account.status === 'revoked' ? 'Revoked' : account.status}
                          </span>
                        </div>
                        <div className="account-actions">
                          {account.status === 'pending' && (
                            <>
                              <button
                                className="approve-btn"
                                onClick={() => handleAccountAction(account.id, 'approve')}
                              >
                                <CheckCircle size={14} />
                                <span>Approve</span>
                              </button>
                              <button
                                className="reject-btn"
                                onClick={() => handleAccountAction(account.id, 'reject')}
                              >
                                <XCircle size={14} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          {account.status === 'approved' && (
                            <>
                              {canUndo(account.reviewed_at) && (
                                <button
                                  className="undo-btn"
                                  onClick={() => handleAccountAction(account.id, 'undo')}
                                >
                                  <Clock size={14} />
                                  <span>Undo</span>
                                </button>
                              )}
                              <button
                                className="revoke-btn"
                                onClick={() => handleAccountAction(account.id, 'revoke')}
                              >
                                <XCircle size={14} />
                                <span>Revoke Verification</span>
                              </button>
                            </>
                          )}
                          {account.status === 'rejected' && (
                            <>
                              {canUndo(account.reviewed_at) ? (
                                <button
                                  className="undo-btn"
                                  onClick={() => handleAccountAction(account.id, 'undo')}
                                >
                                  <Clock size={14} />
                                  <span>Undo</span>
                                </button>
                              ) : null}
                              <button
                                className="delete-btn"
                                onClick={() => handleAccountAction(account.id, 'delete')}
                              >
                                <XCircle size={14} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                          {account.status === 'revoked' && (
                            <>
                              {canUndo(account.reviewed_at) ? (
                                <button
                                  className="undo-btn"
                                  onClick={() => handleAccountAction(account.id, 'undo')}
                                >
                                  <Clock size={14} />
                                  <span>Undo</span>
                                </button>
                              ) : null}
                              <button
                                className="delete-btn"
                                onClick={() => handleAccountAction(account.id, 'delete')}
                              >
                                <XCircle size={14} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Accounts Pagination and Count */}
                <div className="pagination-wrapper">
                  <div className="record-count">
                    Showing {accountsDisplayStart}-{accountsDisplayEnd} of {getAccountsForCurrentTab().length} accounts
                  </div>
                  
                  {accountsTotalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setAccountsCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={accountsCurrentPage === 1}
                        className="pagination-btn"
                      >
                        ⬅ Prev
                      </button>
                      
                      {Array.from({ length: accountsTotalPages }, (_, i) => i + 1)
                        .slice(
                          Math.max(0, accountsCurrentPage - 3),
                          Math.min(accountsTotalPages, accountsCurrentPage + 2)
                        )
                        .map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setAccountsCurrentPage(pageNum)}
                            className={`pagination-number ${
                              accountsCurrentPage === pageNum ? "active" : ""
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      
                      <button
                        onClick={() => setAccountsCurrentPage(prev => Math.min(prev + 1, accountsTotalPages))}
                        disabled={accountsCurrentPage === accountsTotalPages}
                        className="pagination-btn"
                      >
                        Next ➡
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <>
            {logsLoading ? (
              <div className="loading-center compact" role="status" aria-live="polite">
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
                  <svg 
                    className="loading-spinner" 
                    viewBox="-13 -13 45 45" 
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle className="box5631" cx="13" cy="1" r="5"/>
                    <circle className="box5631" cx="25" cy="1" r="5"/>
                    <circle className="box5631" cx="1" cy="13" r="5"/>
                    <circle className="box5631" cx="13" cy="13" r="5"/>
                    <circle className="box5631" cx="25" cy="13" r="5"/>
                    <circle className="box5631" cx="1" cy="25" r="5"/>
                    <circle className="box5631" cx="13" cy="25" r="5"/>
                    <circle className="box5631" cx="25" cy="25" r="5"/>
                    <circle className="box5631" cx="1" cy="1" r="5"/>
                  </svg>
                  <div className="loading-text">Loading user activity logs...</div>
                </div>
              </div>
            ) : userLogs.length === 0 ? (
              <div className="no-data">
                <Activity size={48} className="no-data-icon" />
                <p>No user activity logs found</p>
              </div>
            ) : (
              <>
                <div className="logs-scrollable-wrapper">
                  <div className="logs-list">
                    {getPaginatedLogs().map((log) => (
                    <div key={log.id} className="log-card">
                    <div className="log-info">
                      <div className="log-header">
                        <div className="log-user">
                          <User size={18} />
                          <h4>{log.police?.full_name || 'Unknown User'}</h4>
                        </div>
                        <div className="log-time">
                          <Clock size={14} />
                          <span>{new Date(log.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>
                      <div className="log-email">
                        <Mail size={14} />
                        <span>{log.police?.email || 'No email'}</span>
                      </div>
                      <div className="log-activity">
                        <Activity size={14} />
                        <span>{log.activity || 'No activity description'}</span>
                      </div>
                      {log.details && (
                        <div className="log-details">
                          <span>{log.details}</span>
                        </div>
                      )}
                      {log.ip_address && (
                        <div className="log-ip">
                          <span>IP: {log.ip_address}</span>
                        </div>
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
                </div>
                
                {/* Logs Pagination and Count */}
                <div className="pagination-wrapper">
                  <div className="record-count">
                    Showing {logsDisplayStart}-{logsDisplayEnd} of {userLogs.length} logs
                  </div>
                  
                  {logsTotalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setLogsCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={logsCurrentPage === 1}
                        className="pagination-btn"
                      >
                        ⬅ Prev
                      </button>
                      
                      {Array.from({ length: logsTotalPages }, (_, i) => i + 1)
                        .slice(
                          Math.max(0, logsCurrentPage - 3),
                          Math.min(logsTotalPages, logsCurrentPage + 2)
                        )
                        .map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setLogsCurrentPage(pageNum)}
                            className={`pagination-number ${
                              logsCurrentPage === pageNum ? "active" : ""
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      
                      <button
                        onClick={() => setLogsCurrentPage(prev => Math.min(prev + 1, logsTotalPages))}
                        disabled={logsCurrentPage === logsTotalPages}
                        className="pagination-btn"
                      >
                        Next ➡
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Role Assignment Tab */}
        {activeTab === 'roles' && (
          <div className="role-assignment-section">
            <div className="role-assignment-container">
              <div className="users-list-scrollable">
                {getPaginatedRoles().map((account) => (
                  <div key={account.id} className="role-user-card">
                    <div className="role-user-info">
                      <User size={18} className="user-icon" />
                      <div>
                        <div className="role-user-name">{account.full_name}</div>
                        <div className="role-user-email">{account.email}</div>
                        <div className="role-user-current">Current Role: <span className="current-role-badge">{account.role || 'Not assigned'}</span></div>
                      </div>
                    </div>
                    <div className="role-assignment-actions">
                      <SingleSelectDropdown
                        options={["Officer", "Supervisor", "Analyst"]}
                        selectedValue={selectedUser === account.id ? newRole : account.role || ''}
                        onChange={(value) => {
                          setSelectedUser(account.id);
                          setNewRole(value);
                        }}
                        placeholder="Select Role"
                        allLabel="Select Role"
                        allValue=""
                      />
                      {selectedUser === account.id && newRole && newRole !== account.role && (
                        <button
                          className="assign-role-btn"
                          onClick={() => handleRoleAssignment(account.id, newRole)}
                        >
                          <CheckCircle size={14} />
                          <span>Assign Role</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Roles Pagination and Count */}
            <div className="pagination-wrapper">
              <div className="record-count">
                Showing {rolesDisplayStart}-{rolesDisplayEnd} of {approvedAccountsForRoles.length} users
              </div>
              
              {rolesTotalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setRolesCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={rolesCurrentPage === 1}
                    className="pagination-btn"
                  >
                    ⬅ Prev
                  </button>
                  
                  {Array.from({ length: rolesTotalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, rolesCurrentPage - 3),
                      Math.min(rolesTotalPages, rolesCurrentPage + 2)
                    )
                    .map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setRolesCurrentPage(pageNum)}
                        className={`pagination-number ${
                          rolesCurrentPage === pageNum ? "active" : ""
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  
                  <button
                    onClick={() => setRolesCurrentPage(prev => Math.min(prev + 1, rolesTotalPages))}
                    disabled={rolesCurrentPage === rolesTotalPages}
                    className="pagination-btn"
                  >
                    Next ➡
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Account Tab */}
        {activeTab === 'create' && (
          <div className="create-account-section">
            <form className="admin-create-form" onSubmit={handleCreateAccount}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={createAccountForm.fullName}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, fullName: e.target.value })}
                    placeholder="Enter full name"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={createAccountForm.email}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, email: e.target.value })}
                    placeholder="Enter email"
                    maxLength={254}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={createAccountForm.password}
                      onChange={(e) => setCreateAccountForm({ ...createAccountForm, password: e.target.value })}
                      placeholder="Enter password"
                      maxLength={128}
                      required
                    />
                    <span
                      className="eye-icon"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 4.5C7.5 4.5 3.6 7.3 2 12c1.6 4.7 5.5 7.5 10 7.5s8.4-2.8 10-7.5c-1.6-4.7-5.5-7.5-10-7.5zM12 17c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 7c2.8 0 5 2.2 5 5 0 .6-.1 1.2-.3 1.7l1.4 1.4c1.2-1.2 2.1-2.7 2.7-4.4-1.6-4.7-5.5-7.5-10-7.5-1.4 0-2.8.3-4.1.8L8 5.3C9.3 6.1 10.6 7 12 7zm-5-2L5.6 3.6 4.2 5l1.9 1.9C4.6 8.2 3.1 10 2 12c1.6 4.7 5.5 7.5 10 7.5 1.9 0 3.7-.5 5.3-1.3L19 19.7l1.4-1.4L7 5zm5.3 8.3c-.2.4-.3.8-.3 1.2 0 1.7 1.3 3 3 3 .4 0 .8-.1 1.2-.3l-3.9-3.9z"/>
                        </svg>
                      )}
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Station</label>
                  <input
                    type="text"
                    value={createAccountForm.station}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, station: e.target.value })}
                    placeholder="Enter station"
                    maxLength={50}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <SingleSelectDropdown
                    options={["Officer", "Supervisor", "Analyst"]}
                    selectedValue={createAccountForm.role}
                    onChange={(value) => setCreateAccountForm({ ...createAccountForm, role: value })}
                    placeholder="Select Role"
                    allLabel="Select Role"
                    allValue=""
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setCreateAccountForm({
                    fullName: '',
                    email: '',
                    password: '',
                    role: '',
                    station: '',
                    status: 'approved'
                  })}
                  disabled={isLoading}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;