// Password hashing utilities using Web Crypto API
// This is more secure than crypto-js and doesn't require additional dependencies

export const hashPassword = async (password) => {
    try {
      // Convert password to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      // Hash the password using SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  };
  
  export const verifyPassword = async (password, hashedPassword) => {
    try {
      const hashedInput = await hashPassword(password);
      return hashedInput === hashedPassword;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  };
  
  // Alternative implementation using a simple hash function
  // This is less secure but works without Web Crypto API
  export const simpleHash = (password) => {
    let hash = 0;
    if (password.length === 0) return hash.toString();
    
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  };
  
  // More secure alternative using a combination of methods
  export const secureHash = async (password, salt = null) => {
    try {
      // Generate a random salt if none provided
      if (!salt) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        salt = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }
      
      // Combine password and salt
      const combined = password + salt;
      
      // Hash the combined string
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Return salt + hash for storage
      return salt + ':' + hashHex;
    } catch (error) {
      console.error('Error creating secure hash:', error);
      throw new Error('Failed to create secure hash');
    }
  };
  
  export const verifySecureHash = async (password, storedHash) => {
    try {
      const [salt, hash] = storedHash.split(':');
      const newHash = await secureHash(password, salt);
      return newHash === storedHash;
    } catch (error) {
      console.error('Error verifying secure hash:', error);
      return false;
    }
  };