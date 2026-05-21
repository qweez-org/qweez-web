import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import api from '../api/client';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const savedUser = localStorage.getItem('qweez_user');
    const bootstrap = async () => {
      try {
        // If we have a user cached, set it optimistically
        if (savedUser) setUser(JSON.parse(savedUser));

        // Ensure session is still valid. If access token is expired, api client will refresh via cookie.
        const { data } = await api.get('/auth/me');
        if (data.user?.role !== 'teacher') {
          throw new Error('Teacher web only');
        }
        setUser(data.user);
        localStorage.setItem('qweez_user', JSON.stringify(data.user));
      } catch {
        localStorage.removeItem('qweez_access_token');
        localStorage.removeItem('qweez_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password, role: 'teacher' });
    localStorage.setItem('qweez_access_token', data.accessToken);
    localStorage.setItem('qweez_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password, role: 'teacher' });
    localStorage.setItem('qweez_access_token', data.accessToken);
    localStorage.setItem('qweez_user', JSON.stringify(data.user));
    setUser(data.user);
  };


  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const logout = () => {
    api.post('/auth/logout', {}).catch(() => undefined);
    localStorage.removeItem('qweez_access_token');
    localStorage.removeItem('qweez_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
