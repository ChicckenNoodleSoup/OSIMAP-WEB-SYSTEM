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
import { UserProvider } from './UserContext';
import './App.css';

function ProtectedRoute({ isAuthenticated, children }) {
  return isAuthenticated ? children : <Navigate to="/signin" />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
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
            element={<SignIn setIsAuthenticated={setIsAuthenticated} />}
          />
          <Route
            path="/create-account"
            element={<CreateAccount />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <>
                  <img src="/background-image.png" alt="Background" className="bg-image" />
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
            }
          />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;