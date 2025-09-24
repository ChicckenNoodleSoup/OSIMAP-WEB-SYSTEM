import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Load from localStorage on initialization
    const savedUser = localStorage.getItem('userProfile');
    return savedUser ? JSON.parse(savedUser) : {
      fullName: 'PMSgt. Dela Cruz',
      email: 'pmsgt.delacruz@pnp.gov.ph',
      role: 'Administrator',
      station: 'CSFP Police Station',
      lastLogin: new Date().toLocaleString(),
      joinDate: 'March 15, 2023'
    };
  });

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('userProfile', JSON.stringify(updatedUser));
  };

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};