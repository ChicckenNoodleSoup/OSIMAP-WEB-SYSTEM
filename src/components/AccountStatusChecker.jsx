import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUserData, isAuthenticated } from '../utils/authUtils';

function AccountStatusChecker() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only run if user is authenticated
    if (!isAuthenticated()) return;

    const checkStatus = () => {
      try {
        // Double check authentication before proceeding
        if (!isAuthenticated()) return;

        const adminData = localStorage.getItem('adminData');
        if (!adminData) return;
        
        const userData = JSON.parse(adminData);
        
        // Skip check for administrators
        if (userData.role === 'Administrator') return;
        
        // Check if user is rejected/revoked
        if (userData.status === 'rejected' || userData.status === 'revoked') {
          console.log('User account has been rejected/revoked, logging out...');
          // Clear user data and navigate to login
          clearUserData();
          navigate('/signin', { replace: true });
        }
      } catch (error) {
        console.error('Error checking account status:', error);
      }
    };

    // Check periodically (every 60 seconds) - less frequent to avoid conflicts
    const interval = setInterval(checkStatus, 60000);

    return () => clearInterval(interval);
  }, [navigate]);

  return null; // This component doesn't render anything
}

export default AccountStatusChecker;