import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationsApi } from '../services/endpoints.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext({ unread: 0, refresh: () => {} });
export const useNotifications = () => useContext(NotificationContext);

// Polls the unread count every minute while someone is logged in (simple and reliable; no websockets needed).
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try { setUnread((await notificationsApi.unreadCount()).data.count); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) { setUnread(0); return undefined; }
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [user, refresh]);

  const value = useMemo(() => ({ unread, refresh }), [unread, refresh]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
