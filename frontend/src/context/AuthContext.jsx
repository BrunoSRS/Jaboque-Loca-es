import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('jaboque_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('jaboque_token'));

  useEffect(() => {
    const token = localStorage.getItem('jaboque_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((r) => {
        setUser(r.data);
        localStorage.setItem('jaboque_user', JSON.stringify(r.data));
      })
      .catch(() => {
        localStorage.removeItem('jaboque_token');
        localStorage.removeItem('jaboque_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (loginVal, senha) => {
    const { data } = await authApi.login({ login: loginVal, senha });
    localStorage.setItem('jaboque_token', data.token);
    localStorage.setItem('jaboque_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('jaboque_token');
    localStorage.removeItem('jaboque_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.perfil === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
