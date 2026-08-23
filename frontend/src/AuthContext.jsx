import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('medisync_auth');
    return saved ? JSON.parse(saved) : null;
  });

  function login(token, user) {
    const data = { token, user };
    localStorage.setItem('medisync_auth', JSON.stringify(data));
    setAuth(data);
  }

  function logout() {
    localStorage.removeItem('medisync_auth');
    setAuth(null);
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}