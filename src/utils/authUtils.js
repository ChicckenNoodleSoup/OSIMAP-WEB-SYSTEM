// Authentication utility functions

export const getUserRole = () => {
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
  };
  
  export const setUserData = (userData) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('adminData', JSON.stringify(userData));
    localStorage.setItem('userRole', userData.role || 'User');
  };