export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Email is required';
  }
  if (email.length > 254) {
    return 'Email must be no more than 254 characters long';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return '';
};

export const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 128) {
    return 'Password must be no more than 128 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return '';
};

// Helper function to check individual password requirements
export const getPasswordRequirements = (password) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (confirmPassword.length > 128) {
    return 'Confirm password must be no more than 128 characters long';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
};

export const validateFullName = (fullName) => {
  if (!fullName) {
    return 'Full name is required';
  }
  if (fullName.trim().length < 2) {
    return 'Full name must be at least 2 characters long';
  }
  if (fullName.length > 100) {
    return 'Full name must be no more than 100 characters long';
  }
  if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
    return 'Full name can only contain letters and spaces';
  }
  return '';
};

export const validateStation = (station) => {
  if (!station) {
    return 'Station is required';
  }
  if (station.trim().length < 2) {
    return 'Station must be at least 2 characters long';
  }
  if (station.length > 50) {
    return 'Station must be no more than 50 characters long';
  }
  if (!/^[a-zA-Z0-9\s\-\.]+$/.test(station.trim())) {
    return 'Station can only contain letters, numbers, spaces, hyphens, and periods';
  }
  return '';
};