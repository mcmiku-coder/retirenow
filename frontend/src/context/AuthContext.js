import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [masterKey, setMasterKey] = useState(null); // Stored in memory only for encryption
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('email');

    if (storedToken && storedEmail) {
      setToken(storedToken);
      setUser({ email: storedEmail });
      // Note: masterKey is NOT stored in localStorage for security
      // User must login again to get masterKey from server
    }
    setLoading(false);
  }, []);

  const login = (email, token, masterKeyFromServer) => {
    setUser({ email });
    setToken(token);
    setMasterKey(masterKeyFromServer); // Store master key in memory
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setMasterKey(null); // Clear master key from memory
    localStorage.removeItem('token');
    localStorage.removeItem('email');
  };

  return (
    <AuthContext.Provider value={{ user, token, masterKey, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
