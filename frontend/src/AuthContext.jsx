import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const AuthContext = createContext(null);

function decodeExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

const STORAGE_KEY = 'login_demo_token';

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [sessionExpired, setSessionExpired] = useState(false);
  const expiryTimer = useRef(null);

  const clearExpiryTimer = () => {
    if (expiryTimer.current) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  };

  const setToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem(STORAGE_KEY, newToken);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    clearExpiryTimer();
    setToken(null);
  }, [setToken]);

  useEffect(() => {
    clearExpiryTimer();
    if (!token) return;

    const expiryMs = decodeExpiry(token);
    if (!expiryMs) return;

    const msRemaining = expiryMs - Date.now();
    if (msRemaining <= 0) {
      setSessionExpired(true);
      logout();
      return;
    }

    expiryTimer.current = setTimeout(() => {
      setSessionExpired(true);
      logout();
    }, msRemaining);

    return clearExpiryTimer;
  }, [token, logout]);

  const login = useCallback((newToken) => {
    setSessionExpired(false);
    setToken(newToken);
  }, [setToken]);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: Boolean(token), login, logout, sessionExpired, dismissSessionExpired }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
