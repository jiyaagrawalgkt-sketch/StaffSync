import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { notificationsApi } from '../services/endpoints.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import { fmtDateTime } from '../utils/format.js';

export default function NotificationBell() {
  const { unread, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    notificationsApi.list({ limit: 6 }).then((r) => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false));
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.isRead) { await notificationsApi.markRead(n._id).catch(() => {}); refresh(); }
    if (n.link) navigate(n.link);
  };

  return (
    <div className="position-relative" ref={ref}>
      <button className="btn btn-light position-relative" onClick={() => setOpen((o) => !o)} aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <FiBell />
        {unread > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown-panel notif-panel">
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
            <strong>Notifications</strong>
            <Link to="/app/notifications" onClick={() => setOpen(false)} className="small">View all</Link>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {loading && <div className="p-3 text-muted small">Loading...</div>}
            {!loading && !items.length && <div className="p-3 text-muted small">You have no notifications.</div>}
            {items.map((n) => (
              <button key={n._id} className={`btn text-start w-100 rounded-0 border-bottom notif-item ${n.isRead ? '' : 'unread'}`} onClick={() => openItem(n)}>
                <div className="fw-semibold small">{n.title}</div>
                <div className="small text-muted">{n.message}</div>
                <div className="small text-muted">{fmtDateTime(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
