import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

function decodePayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function decodeExpiry(token) {
  const payload = decodePayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}

function decodeRole(token) {
  return decodePayload(token)?.role ?? null;
}

function decodeCustomerId(token) {
  return decodePayload(token)?.customerId ?? null;
}

function decodeUsername(token) {
  return decodePayload(token)?.sub ?? null;
}

export function AuthProvider({ children }) {
  // Access token lives only in memory (never localStorage) to limit XSS blast radius.
  // Session continuity across reloads comes from the httpOnly refresh cookie via silent refresh below.
  const [token, setToken] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const refreshTimer = useRef(null);
  const hadSession = useRef(false);

  const clearRefreshTimer = () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  const logout = useCallback(() => {
    clearRefreshTimer();
    hadSession.current = false;
    setSessionExpired(false);
    setToken(null);
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const data = await api.refresh();
      hadSession.current = true;
      setToken(data.accessToken);
      return data.accessToken;
    } catch {
      const expired = hadSession.current;
      clearRefreshTimer();
      hadSession.current = false;
      setToken(null);
      if (expired) setSessionExpired(true);
      return null;
    }
  }, []);

  useEffect(() => {
    silentRefresh().finally(() => setInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearRefreshTimer();
    if (!token) return;

    const expiryMs = decodeExpiry(token);
    if (!expiryMs) return;

    // Refresh a bit before expiry so the session renews silently while the tab is open.
    const msUntilRefresh = Math.max(expiryMs - Date.now() - 60_000, 0);
    refreshTimer.current = setTimeout(silentRefresh, msUntilRefresh);

    return clearRefreshTimer;
  }, [token, silentRefresh]);

  const login = useCallback((newToken) => {
    hadSession.current = true;
    setSessionExpired(false);
    setToken(newToken);
  }, []);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <AuthContext.Provider
      value={{
        token,
        role: token ? decodeRole(token) : null,
        username: token ? decodeUsername(token) : null,
        customerId: token ? decodeCustomerId(token) : null,
        isAuthenticated: Boolean(token),
        initializing,
        login,
        logout,
        sessionExpired,
        dismissSessionExpired,
      }}
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
