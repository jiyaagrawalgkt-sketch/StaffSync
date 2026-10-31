import { Link } from 'react-router-dom';
import { FiClock } from 'react-icons/fi';
import StatusBadge from '../../components/StatusBadge.jsx';
import { EmptyState } from '../../components/Feedback.jsx';
import { Panel, AnnouncementsWidget, TrainingWidget } from './widgets.jsx';
import { fmtDate, fmtTime, fmtHours, initials } from '../../utils/format.js';

export default function EmployeeDashboard({ data }) {
  const { profile, today, balances, leaves, history } = data;
  const rec = today.record;
  const statusLabel = !today.isWorkday ? 'Non-working day' : rec ? (rec.checkOut ? 'Checked out' : 'Checked in') : 'Not checked in';
  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <div className="card h-100"><div className="card-body">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="avatar" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>{initials(profile.fullName)}</span>
              <div><h2 className="h5 mb-0">{profile.fullName}</h2><div className="text-muted small">{profile.jobTitle || 'Employee'}</div></div>
            </div>
            <dl className="row small mb-0">
              <dt className="col-5 text-muted">Employee ID</dt><dd className="col-7">{profile.employeeId}</dd>
              <dt className="col-5 text-muted">Department</dt><dd className="col-7">{profile.department?.name || '—'}</dd>
              <dt className="col-5 text-muted">Manager</dt><dd className="col-7">{profile.manager?.fullName || '—'}</dd>
              <dt className="col-5 text-muted">Joined</dt><dd className="col-7">{fmtDate(profile.joiningDate)}</dd>
            </dl>
          </div></div>
        </div>
        <div className="col-lg-4">
          <Panel title="Today's attendance" action={<Link to="/app/attendance" className="small">Open</Link>}>
            <div className="d-flex align-items-center gap-2 mb-3"><FiClock className="text-brand" /><strong>{statusLabel}</strong>{rec && <StatusBadge value={rec.status} />}</div>
            <div className="row text-center">
              <div className="col"><div className="text-muted small">Check-in</div><div className="fs-5">{fmtTime(rec?.checkIn)}</div></div>
              <div className="col"><div className="text-muted small">Check-out</div><div className="fs-5">{fmtTime(rec?.checkOut)}</div></div>
            </div>
          </Panel>
        </div>
        <div className="col-lg-4">
          <Panel title="Leave balance" action={<Link to="/app/leaves" className="small">Apply</Link>}>
            {balances.map((b) => (
              <div key={b.type} className="mb-2">
                <div className="d-flex justify-content-between small"><span className="text-capitalize">{b.type}</span><span>{b.remaining} of {b.allocated} left</span></div>
                <div className="progress" style={{ height: 6 }}><div className="progress-bar" style={{ width: `${b.allocated ? (b.remaining / b.allocated) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <Panel title="Recent attendance">
            {!history.length ? <EmptyState title="No attendance yet" /> : (
              <table className="table table-sm mb-0">
                <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th></tr></thead>
                <tbody>{history.map((h) => (
                  <tr key={h._id}><td>{fmtDate(h.workDate)}</td><td>{fmtTime(h.checkIn)}</td><td>{fmtTime(h.checkOut)}</td><td>{fmtHours(h.workMinutes)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </Panel>
        </div>
        <div className="col-lg-6">
          <Panel title="My leave requests" action={<Link to="/app/leaves" className="small">All requests</Link>}>
            {!leaves.length ? <EmptyState title="No leave requests" /> : (
              <ul className="list-group list-group-flush">{leaves.map((l) => (
                <li key={l._id} className="list-group-item px-0 d-flex justify-content-between">
                  <span className="small"><span className="text-capitalize">{l.type}</span> · {fmtDate(l.startDate)} to {fmtDate(l.endDate)}</span>
                  <StatusBadge value={l.status} />
                </li>
              ))}</ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6"><AnnouncementsWidget items={data.announcements} /></div>
        <div className="col-lg-6"><TrainingWidget items={data.availableTrainings} title="Available training" /></div>
      </div>
    </>
  );
}
