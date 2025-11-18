import React from 'react';
import SingleSelectDropdown from '../../SingleSelectDropdown';

const CreateAccountTab = ({
  createAccountForm,
  onFormChange,
  showPassword,
  onTogglePassword,
  onClearForm,
  onSubmit,
  isSubmitting
}) => (
  <div className="create-account-section">
    <form className="admin-create-form" onSubmit={onSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={createAccountForm.fullName}
            onChange={(e) => onFormChange('fullName', e.target.value)}
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
            onChange={(e) => onFormChange('email', e.target.value)}
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
              onChange={(e) => onFormChange('password', e.target.value)}
              placeholder="Enter password"
              maxLength={128}
              required
            />
            <span
              className="eye-icon"
              onClick={onTogglePassword}
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
            onChange={(e) => onFormChange('station', e.target.value)}
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
            onChange={(value) => onFormChange('role', value)}
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
          onClick={onClearForm}
          disabled={isSubmitting}
        >
          Clear Form
        </button>
        <button
          type="submit"
          className="btn-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </form>
  </div>
);

export default CreateAccountTab;

