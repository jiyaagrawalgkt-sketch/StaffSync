import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/Feedback.jsx';
import { fmtDate, fmtDateTime } from '../../utils/format.js';

export function Panel({ title, action, children }) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h6 mb-0">{title}</h2>{action}
        </div>
        {children}
      </div>
    </div>
  );
}

export function AnnouncementsWidget({ items }) {
  return (
    <Panel title="Announcements" action={<Link to="/app/announcements" className="small">View all</Link>}>
      {!items?.length ? <EmptyState title="No announcements" /> : (
        <ul className="list-unstyled mb-0">
          {items.map((a) => (
            <li key={a._id} className="mb-3">
              <div className="fw-semibold">{a.title}</div>
              <div className="small text-muted text-truncate">{a.body}</div>
              <div className="small text-muted">{fmtDateTime(a.publishedAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function TrainingWidget({ items, title = 'Upcoming training' }) {
  return (
    <Panel title={title} action={<Link to="/app/trainings" className="small">View all</Link>}>
      {!items?.length ? <EmptyState title="No upcoming programs" /> : (
        <ul className="list-unstyled mb-0">
          {items.map((t) => (
            <li key={t._id} className="mb-3">
              <div className="fw-semibold">{t.title}</div>
              <div className="small text-muted">{fmtDateTime(t.startDate)}{t.location ? ` · ${t.location}` : ''}</div>
              <div className="small text-muted">
                {t.capacity > 0 ? `${t.enrolledCount}/${t.capacity} seats taken` : `${t.enrolledCount} enrolled`}
                {t.isEnrolled && <span className="badge text-bg-success ms-2">Enrolled</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ActivityList({ items, title = 'Recent activity' }) {
  return (
    <Panel title={title}>
      {!items?.length ? <EmptyState title="No activity yet" /> : (
        <ul className="list-group list-group-flush">
          {items.map((a, i) => (
            <li key={i} className="list-group-item px-0">
              <div className="small">{a.text}</div>
              <div className="small text-muted">{fmtDateTime(a.at)}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function PendingLeavesList({ data }) {
  return (
    <Panel title={`Pending leave requests${data?.count ? ` (${data.count})` : ''}`} action={<Link to="/app/leaves" className="small">Review</Link>}>
      {!data?.latest?.length ? <EmptyState title="No pending requests" /> : (
        <ul className="list-group list-group-flush">
          {data.latest.map((l) => (
            <li key={l._id} className="list-group-item px-0">
              <div className="fw-semibold small">{l.user?.fullName}</div>
              <div className="small text-muted">{l.type} · {fmtDate(l.startDate)} to {fmtDate(l.endDate)} · {l.days} day(s)</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
