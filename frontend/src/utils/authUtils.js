// Authentication utility functions with security improvements

// Session duration: 15 minutes
const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export const getUserRole = () => {
  if (!isAuthenticated()) return 'User';
  return localStorage.getItem('userRole') || 'User';
};

export const isAdministrator = () => {
  return getUserRole() === 'Administrator';
};

export const hasRole = (role) => {
  return getUserRole() === role;
};

export const hasAnyRole = (roles) => {
  const userRole = getUserRole();
  return roles.includes(userRole);
};

export const clearUserData = () => {
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('userRole');
  localStorage.removeItem('adminData');
  localStorage.removeItem('authExpiresAt');
  
  // SECURITY: Clear upload data to prevent cross-user data leakage
  localStorage.removeItem('activeUploads');
  localStorage.removeItem('lastCompletedUpload');
};

export const setUserData = (userData) => {
  const expiresAt = Date.now() + SESSION_DURATION;
  
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('adminData', JSON.stringify(userData));
  localStorage.setItem('userRole', userData.role || 'User');
  localStorage.setItem('authExpiresAt', expiresAt.toString());
};

export const isAuthenticated = () => {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  const expiresAt = localStorage.getItem('authExpiresAt');
  
  // Check if session has expired
  if (isAuth && expiresAt) {
    const expirationTime = parseInt(expiresAt);
    if (Date.now() > expirationTime) {
      // Session expired, clear data
      clearUserData();
      return false;
    }
  }
  
  return isAuth;
};

export const extendSession = () => {
  if (isAuthenticated()) {
    const newExpiresAt = Date.now() + SESSION_DURATION;
    localStorage.setItem('authExpiresAt', newExpiresAt.toString());
  }
};

export const getTimeUntilExpiration = () => {
  const expiresAt = localStorage.getItem('authExpiresAt');
  if (!expiresAt) return 0;
  
  const expirationTime = parseInt(expiresAt);
  const timeLeft = expirationTime - Date.now();
  return Math.max(0, timeLeft);
};