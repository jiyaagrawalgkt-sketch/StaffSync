import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../services/endpoints.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../hooks/useFetch.js';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import { Loader, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { fmtDateTime } from '../utils/format.js';
import { getErrorMessage } from '../utils/errors.js';

export default function Notifications() {
  const { refresh } = useNotifications();
  const toast = useToast();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [key, setKey] = useState(0);
  const { data, loading, error, reload } = useFetch(() => notificationsApi.list({ page, limit: 10, unread: unreadOnly ? 'true' : undefined }), [page, unreadOnly, key]);

  const open = async (n) => {
    if (!n.isRead) { await notificationsApi.markRead(n._id).catch(() => {}); refresh(); setKey((k) => k + 1); }
    if (n.link) navigate(n.link);
  };
  const markAll = async () => {
    try { await notificationsApi.markAllRead(); toast.success('All notifications marked as read'); refresh(); setKey((k) => k + 1); }
    catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="In-app alerts for leave, announcements and training">
        <div className="form-check form-switch align-self-center me-2">
          <input className="form-check-input" type="checkbox" id="unreadOnly" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
          <label className="form-check-label" htmlFor="unreadOnly">Unread only</label>
        </div>
        <button className="btn btn-outline-primary" onClick={markAll}>Mark all as read</button>
      </PageHeader>
      <div className="card"><div className="card-body p-0">
        {loading && !data && <Loader />}
        {error && <div className="p-3"><ErrorState message={error} onRetry={reload} /></div>}
        {data && !data.data.length && <EmptyState title="You're all caught up" message="No notifications to show." />}
        <div className="list-group list-group-flush">
          {(data?.data || []).map((n) => (
            <button key={n._id} className={`list-group-item list-group-item-action notif-item ${n.isRead ? '' : 'unread'}`} onClick={() => open(n)}>
              <div className="d-flex justify-content-between"><strong>{n.title}</strong><span className="small text-muted">{fmtDateTime(n.createdAt)}</span></div>
              <div className="small text-muted">{n.message}</div>
              {!n.isRead && <span className="badge text-bg-primary mt-1">New</span>}
            </button>
          ))}
        </div>
      </div></div>
      <div className="px-1"><Pagination meta={data?.meta} onChange={setPage} /></div>
    </>
  );
}
