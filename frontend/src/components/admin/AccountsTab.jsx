import React from 'react';
import { Users, User, CheckCircle, XCircle, Clock } from 'lucide-react';
import Pagination from '../Pagination';

const AccountsTab = ({
  accountsSubTab,
  onSubTabChange,
  getAccountsByStatus,
  getAccountsForCurrentTab,
  getPaginatedAccounts,
  accountsDisplayStart,
  accountsDisplayEnd,
  accountsCurrentPage,
  accountsTotalPages,
  onPageChange,
  handleAccountAction,
  canUndo
}) => {
  const accountsByStatus = getAccountsByStatus?.() || {
    rejectedRevoked: [],
    pending: [],
    approved: []
  };

  const accountsForCurrentTab = getAccountsForCurrentTab?.() || [];
  const paginatedAccounts = getPaginatedAccounts?.() || [];

  return (
    <>
      <div className="sub-tab-navigation">
        <button
          className={`sub-tab-btn ${accountsSubTab === 'rejected' ? 'active' : ''}`}
          onClick={() => onSubTabChange('rejected')}
        >
          <XCircle size={16} />
          <span>Rejected/Revoked</span>
          <span className="tab-badge">{accountsByStatus.rejectedRevoked.length}</span>
        </button>
        <button
          className={`sub-tab-btn ${accountsSubTab === 'pending' ? 'active' : ''}`}
          onClick={() => onSubTabChange('pending')}
        >
          <Clock size={16} />
          <span>Pending</span>
          <span className="tab-badge">{accountsByStatus.pending.length}</span>
        </button>
        <button
          className={`sub-tab-btn ${accountsSubTab === 'approved' ? 'active' : ''}`}
          onClick={() => onSubTabChange('approved')}
        >
          <CheckCircle size={16} />
          <span>Approved</span>
          <span className="tab-badge">{accountsByStatus.approved.length}</span>
        </button>
      </div>

      {accountsForCurrentTab.length === 0 ? (
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
                {paginatedAccounts.map((account) => (
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

          <Pagination
            currentPage={accountsCurrentPage}
            totalPages={accountsTotalPages}
            onPageChange={onPageChange}
            totalItems={accountsForCurrentTab.length}
            itemsPerPage={20}
            itemName="accounts"
          />
        </>
      )}
    </>
  );
};

export default AccountsTab;

