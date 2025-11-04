import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './SignIn';
import CreateAccount from './CreateAccount';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import MapView from './MapView';
import CurrentRecords from './CurrentRecords';
import AddRecord from './AddRecord';
import HelpSupport from './HelpSupport';
import Print from './Print';
import Profile from './Profile';
import ForgotPassword from './ForgotPassword';
import AdminDashboard from './AdminDashboard';
import SessionTimeout from './components/SessionTimeout';
import AccountStatusChecker from './components/AccountStatusChecker';
import { UserProvider } from './UserContext';
import { isAuthenticated, clearUserData, extendSession } from './utils/authUtils';
import { logAuthEvent } from './utils/loggingUtils';
import './App.css';
import ResetPassword from './ResetPassword';
import DownloadPage from './DownloadPage';

function ProtectedRoute({ isAuthenticated, children }) {
  return isAuthenticated ? children : <Navigate to="/signin" />;
}

function App() {
  const [authState, setAuthState] = useState(isAuthenticated());
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      const authStatus = isAuthenticated();
      console.log('Auth check - status:', authStatus);
      setAuthState(authStatus);
      setAuthReady(true);
    };
    
    checkAuth();
    
    // Extend session on user activity
    const handleUserActivity = () => {
      if (isAuthenticated()) {
        extendSession();
      }
    };
    
    // Add event listeners for user activity
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    
    return () => {
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
    };
  }, []);

  const handleLogout = async () => {
    await logAuthEvent.logout();
    clearUserData();
    setAuthState(false);
  };

  if (!authReady) {
    return null;
  }

  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/signin"
            element={<SignIn setIsAuthenticated={setAuthState} />}
          />
          <Route
            path="/create-account"
            element={<CreateAccount />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          <Route
            path="/download"
            element={<DownloadPage />}
          />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <>
                <ProtectedRoute isAuthenticated={authState}>
                  <>
                    <img src="/background-image.png" alt="Background" className="bg-image" />
                    <SessionTimeout />
                    <AccountStatusChecker />
                    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
                      <Sidebar onLogout={handleLogout} />
                      <div className="main-content">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/map" element={<MapView />} />
                        <Route path="/currentrecords" element={<CurrentRecords />} />
                        <Route path="/add-record" element={<AddRecord />} />
                        <Route path="/helpsupport" element={<HelpSupport />} />
                        <Route path="/print" element={<Print />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/admin-dashboard" element={<AdminDashboard />} />
                        <Route path="*" element={<div>Page Not Found</div>} />
                      </Routes>
                    </div>
                  </div>
                </>
              </ProtectedRoute>
              <SessionTimeout />
            </>
          }
        />
      </Routes>
    </UserProvider>
  </BrowserRouter>
  );
}

export default App;