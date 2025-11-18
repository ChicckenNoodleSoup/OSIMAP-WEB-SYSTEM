import React from 'react';
import Pagination from '../Pagination';
import { User, CheckCircle } from 'lucide-react';
import SingleSelectDropdown from '../../SingleSelectDropdown';

const RolesTab = ({
  approvedAccountsForRoles,
  getPaginatedRoles,
  rolesDisplayStart,
  rolesDisplayEnd,
  rolesCurrentPage,
  rolesTotalPages,
  onPageChange,
  selectedUser,
  newRole,
  onRoleSelection,
  onAssignRole
}) => {
  const paginatedRoles = getPaginatedRoles?.() || [];

  return (
    <div className="role-assignment-section">
      <div className="role-assignment-container">
        <div className="users-list-scrollable">
          {paginatedRoles.map((account) => (
            <div key={account.id} className="role-user-card">
              <div className="role-user-info">
                <User size={18} className="user-icon" />
                <div>
                  <div className="role-user-name">{account.full_name}</div>
                  <div className="role-user-email">{account.email}</div>
                  <div className="role-user-current">
                    Current Role: <span className="current-role-badge">{account.role || 'Not assigned'}</span>
                  </div>
                </div>
              </div>
              <div className="role-assignment-actions">
                <SingleSelectDropdown
                  options={["Officer", "Supervisor", "Analyst"]}
                  selectedValue={selectedUser === account.id ? newRole : account.role || ''}
                  onChange={(value) => onRoleSelection(account.id, value)}
                  placeholder="Select Role"
                  allLabel="Select Role"
                  allValue=""
                />
                {selectedUser === account.id && newRole && newRole !== account.role && (
                  <button
                    className="assign-role-btn"
                    onClick={() => onAssignRole(account.id, newRole)}
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

      <Pagination
        currentPage={rolesCurrentPage}
        totalPages={rolesTotalPages}
        onPageChange={onPageChange}
        totalItems={approvedAccountsForRoles.length}
        itemsPerPage={20}
        itemName="users"
      />
    </div>
  );
};

export default RolesTab;

