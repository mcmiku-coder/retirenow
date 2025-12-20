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
  const [password, setPassword] = useState(null); // Stored in memory only for encryption
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('email');
    
    if (storedToken && storedEmail) {
      setToken(storedToken);
      setUser({ email: storedEmail });
    }
    setLoading(false);
  }, []);

  const login = (email, token, pwd) => {
    setUser({ email });
    setToken(token);
    setPassword(pwd);
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPassword(null);
    localStorage.removeItem('token');
    localStorage.removeItem('email');
  };

  return (
    <AuthContext.Provider value={{ user, token, password, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
