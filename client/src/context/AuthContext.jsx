import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, configApi } from '../services/endpoints.js';
import { setTimezone } from '../utils/format.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await configApi.get();
        if (active) { setConfig(cfg.data); setTimezone(cfg.data.timezone); }
      } catch { /* the login page will show a connection error if the API is down */ }
      try {
        const res = await authApi.me();
        if (active) setUser(res.data);
      } catch { if (active) setUser(null); }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // The axios interceptor fires this when the server says our session is no longer valid.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { setUser(null); }
  }, []);

  const refreshUser = useCallback(async () => { setUser((await authApi.me()).data); }, []);

  const value = useMemo(
    () => ({ user, setUser, config, loading, login, logout, refreshUser, hasRole: (...roles) => !!user && roles.includes(user.role) }),
    [user, config, loading, login, logout, refreshUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
