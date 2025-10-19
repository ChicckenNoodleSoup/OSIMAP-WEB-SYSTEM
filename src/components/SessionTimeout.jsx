import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTimeUntilExpiration, extendSession, clearUserData, isAuthenticated } from '../utils/authUtils';

function SessionTimeout() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      const timeUntilExpiration = getTimeUntilExpiration();
      setTimeLeft(timeUntilExpiration);

      console.log('Session check - Time left:', timeUntilExpiration, 'ms');

      // Show warning when 2 minutes left (for 15-minute sessions)
      if (timeUntilExpiration <= 2 * 60 * 1000 && timeUntilExpiration > 0) {
        console.log('Showing session timeout modal');
        setShowModal(true);
      } else {
        setShowModal(false);
      }
      
      // Auto-logout when session expires
      if (timeUntilExpiration <= 0) {
        clearUserData();
        navigate('/signin', { replace: true });
      }
    };

    // Check immediately
    checkSession();

    // Check every second for real-time updates
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-extend session on user activity
  useEffect(() => {
    const handleUserActivity = () => {
      if (showModal && isAuthenticated()) {
        extendSession();
        setShowModal(false);
      }
    };

    // Add event listeners for user activity
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);

    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
    };
  }, [showModal]);

  const handleExtendSession = () => {
    extendSession();
    setShowModal(false);
  };

  const handleLogout = () => {
    clearUserData();
    navigate('/signin', { replace: true });
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showModal) return null;

  return (
    <div className="session-timeout-overlay" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="session-timeout-modal" style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        color: '#333'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            color: '#333', 
            fontSize: '18px', 
            fontWeight: '600' 
          }}>
            Session Expiring Soon
          </h3>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <p style={{ 
            margin: '0 0 12px 0', 
            color: '#666', 
            lineHeight: '1.5' 
          }}>
            Your session will expire in {formatTime(timeLeft)} due to inactivity.
          </p>
          <p style={{ 
            margin: '0 0 0 0', 
            color: '#666', 
            lineHeight: '1.5' 
          }}>
            Any activity will automatically extend your session.
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          <button 
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#6c757d',
              color: 'white',
              transition: 'all 0.2s ease'
            }}
            onClick={handleLogout}
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionTimeout;