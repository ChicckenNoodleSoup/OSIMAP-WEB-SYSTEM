import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { sendAccountStatusEmail } from './utils/emailService';
import { isAdministrator } from './utils/authUtils';
import { logAccountEvent } from './utils/loggingUtils';
import { secureHash } from './utils/passwordUtils';
import { validateFullName, validateEmail, validatePassword, validateStation } from './utils/validation';
import { DateTime } from './DateTime';
import { Shield, Users, Activity, CheckCircle, XCircle, UserCog, UserPlus } from 'lucide-react';
import { LoadingSpinner } from './components/LoadingSpinner';
import AccountsTab from './components/admin/AccountsTab';
import LogsTab from './components/admin/LogsTab';
import RolesTab from './components/admin/RolesTab';
import CreateAccountTab from './components/admin/CreateAccountTab';
import './AdminDashboard.css';
import './Spinner.css';
import './PageHeader.css';

const createInitialFormState = () => ({
  fullName: '',
  email: '',
  password: '',
  role: '',
  station: '',
  status: 'approved'
});

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
  const [createAccountForm, setCreateAccountForm] = useState(createInitialFormState);
  const [showPassword, setShowPassword] = useState(false);

  const handleCreateAccountFormChange = (field, value) => {
    setCreateAccountForm(prev => ({ ...prev, [field]: value }));
  };

  const resetCreateAccountForm = () => {
    setCreateAccountForm(createInitialFormState());
    setShowPassword(false);
  };

  const handleRoleSelection = (userId, role) => {
    setSelectedUser(userId);
    setNewRole(role);
  };

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
      // Use pagination for faster initial load
      const pageSize = 100;
      let allAccounts = [];
      let from = 0;
      let to = pageSize - 1;
      
      // Fetch first page immediately
      const { data: firstBatch, error: firstError, count } = await supabase
        .from('police')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (firstError) {
        console.error('Error fetching accounts:', firstError);
        setMessage('Error loading accounts');
        setIsLoading(false);
        return;
      }

      // Show first batch immediately (filtered)
      const filteredFirstBatch = (firstBatch || []).filter(account => 
        account.role !== 'Administrator'
      );
      setAllAccounts(filteredFirstBatch);
      setIsLoading(false);

      // Continue fetching remaining accounts in background if there are more
      if (count && count > pageSize) {
        from = pageSize;
        to = count - 1;
        
        const { data: remainingData, error: remainingError } = await supabase
          .from('police')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (remainingError) {
          console.error('Error fetching remaining accounts:', remainingError);
          return;
        }

        const filteredRemaining = (remainingData || []).filter(account => 
          account.role !== 'Administrator'
        );
        
        setAllAccounts([...filteredFirstBatch, ...filteredRemaining]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading accounts');
      setIsLoading(false);
    }
  };

  const fetchUserLogs = async () => {
    setLogsLoading(true);
    try {
      // Fetch first 100 logs immediately for faster display
      const pageSize = 100;
      const { data: firstBatch, error: firstError, count } = await supabase
        .from('logs')
        .select(`
          *,
          police:user_id (
            full_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1);

      if (firstError) {
        console.error('Error fetching user logs:', firstError);
        setMessage('Error loading user logs');
        setLogsLoading(false);
        return;
      }

      // Show first batch immediately
      setUserLogs(firstBatch || []);
      setLogsLoading(false);

      // Continue fetching remaining logs in background if there are more
      if (count && count > pageSize) {
        const { data: remainingData, error: remainingError } = await supabase
          .from('logs')
          .select(`
            *,
            police:user_id (
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false })
          .range(pageSize, count - 1);

        if (remainingError) {
          console.error('Error fetching remaining logs:', remainingError);
          return;
        }

        setUserLogs([...(firstBatch || []), ...(remainingData || [])]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading user logs');
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
      resetCreateAccountForm();

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
          <LoadingSpinner text="Loading accounts..." variant="full-height" />
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

        {activeTab === 'accounts' && (
          <AccountsTab
            accountsSubTab={accountsSubTab}
            onSubTabChange={setAccountsSubTab}
            getAccountsByStatus={getAccountsByStatus}
            getAccountsForCurrentTab={getAccountsForCurrentTab}
            getPaginatedAccounts={getPaginatedAccounts}
            accountsDisplayStart={accountsDisplayStart}
            accountsDisplayEnd={accountsDisplayEnd}
            accountsCurrentPage={accountsCurrentPage}
            accountsTotalPages={accountsTotalPages}
            onPageChange={setAccountsCurrentPage}
            handleAccountAction={handleAccountAction}
            canUndo={canUndo}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            logsLoading={logsLoading}
            userLogs={userLogs}
            getPaginatedLogs={getPaginatedLogs}
            logsDisplayStart={logsDisplayStart}
            logsDisplayEnd={logsDisplayEnd}
            logsCurrentPage={logsCurrentPage}
            logsTotalPages={logsTotalPages}
            onPageChange={setLogsCurrentPage}
          />
        )}

        {activeTab === 'roles' && (
          <RolesTab
            approvedAccountsForRoles={approvedAccountsForRoles}
            getPaginatedRoles={getPaginatedRoles}
            rolesDisplayStart={rolesDisplayStart}
            rolesDisplayEnd={rolesDisplayEnd}
            rolesCurrentPage={rolesCurrentPage}
            rolesTotalPages={rolesTotalPages}
            onPageChange={setRolesCurrentPage}
            selectedUser={selectedUser}
            newRole={newRole}
            onRoleSelection={handleRoleSelection}
            onAssignRole={handleRoleAssignment}
          />
        )}

        {activeTab === 'create' && (
          <CreateAccountTab
            createAccountForm={createAccountForm}
            onFormChange={handleCreateAccountFormChange}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(prev => !prev)}
            onClearForm={resetCreateAccountForm}
            onSubmit={handleCreateAccount}
            isSubmitting={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;