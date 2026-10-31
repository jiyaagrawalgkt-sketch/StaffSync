import { useState } from 'react';
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import { attendanceApi, usersApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../hooks/useFetch.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Loader } from '../components/Feedback.jsx';
import { fmtDate, fmtTime, fmtHours } from '../utils/format.js';
import { getErrorMessage } from '../utils/errors.js';

function CheckCard() {
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => attendanceApi.today(), []);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loader />;
  const t = data?.data;
  if (!t) return null;
  const rec = t.record;

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); await reload(); } catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };

  let note = '';
  if (!t.isWorkday) note = 'Today is a weekend or holiday. Attendance is not recorded.';
  else if (t.onLeave) note = 'You are on approved leave today.';

  return (
    <div className="card mb-4"><div className="card-body">
      <div className="row align-items-center g-3">
        <div className="col-md-5">
          <div className="text-muted small">{fmtDate(t.date)}</div>
          <div className="fs-4 fw-semibold">{rec ? (rec.checkOut ? 'Checked out' : 'Checked in') : 'Not checked in'} {rec && <StatusBadge value={rec.status} />}</div>
          {note && <div className="text-muted small">{note}</div>}
          <div className="text-muted small mt-1">Work starts {t.rules.workStart}; check-ins after a {t.rules.lateGraceMinutes}-minute grace period are marked late ({t.rules.timezone}).</div>
        </div>
        <div className="col-md-4">
          <div className="d-flex gap-4"><div><div className="text-muted small">Check-in</div><div className="fs-5">{fmtTime(rec?.checkIn)}</div></div>
            <div><div className="text-muted small">Check-out</div><div className="fs-5">{fmtTime(rec?.checkOut)}</div></div></div>
        </div>
        <div className="col-md-3 d-flex gap-2 justify-content-md-end">
          <button className="btn btn-success" disabled={busy || !!rec || !t.isWorkday || t.onLeave} onClick={() => act(attendanceApi.checkIn, 'Checked in')}><FiLogIn className="me-1" />Check in</button>
          <button className="btn btn-danger" disabled={busy || !rec || !!rec?.checkOut} onClick={() => act(attendanceApi.checkOut, 'Checked out')}><FiLogOut className="me-1" />Check out</button>
        </div>
      </div>
    </div></div>
  );
}

function Filters({ filters, setFilters, employees }) {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  return (
    <div className="row g-2 mb-3">
      {employees && (
        <div className="col-md-4"><select className="form-select" aria-label="Employee" value={filters.user} onChange={set('user')}>
          <option value="">All employees</option>{employees.map((u) => <option key={u._id} value={u._id}>{u.fullName} ({u.employeeId})</option>)}</select></div>
      )}
      <div className="col-md-3"><input type="date" className="form-control" aria-label="From date" value={filters.from} onChange={set('from')} /></div>
      <div className="col-md-3"><input type="date" className="form-control" aria-label="To date" value={filters.to} onChange={set('to')} /></div>
      <div className="col-md-2"><button className="btn btn-light w-100" onClick={() => setFilters({ user: '', from: '', to: '', page: 1 })}>Clear</button></div>
    </div>
  );
}

const baseCols = [
  { key: 'date', header: 'Date', render: (r) => fmtDate(r.workDate) },
  { key: 'in', header: 'Check-in', render: (r) => fmtTime(r.checkIn) },
  { key: 'out', header: 'Check-out', render: (r) => (r.checkOut ? fmtTime(r.checkOut) : r.missedCheckout ? <span className="text-danger">Missed</span> : '—') },
  { key: 'hours', header: 'Hours', render: (r) => fmtHours(r.workMinutes) },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
];

function History({ team }) {
  const [filters, setFilters] = useState({ user: '', from: '', to: '', page: 1 });
  const { data: emps } = useFetch(() => (team ? usersApi.list({ limit: 100, status: 'active' }) : Promise.resolve({ data: [] })), [team]);
  const { data, loading, error, reload } = useFetch(
    () => (team ? attendanceApi.list({ ...filters, limit: 10 }) : attendanceApi.mine({ ...filters, user: undefined, limit: 10 })),
    [team, filters.user, filters.from, filters.to, filters.page]
  );
  const cols = team ? [{ key: 'emp', header: 'Employee', render: (r) => (<>{r.user?.fullName}<div className="small text-muted">{r.user?.employeeId}</div></>) }, ...baseCols] : baseCols;
  return (
    <div className="card"><div className="card-body">
      <Filters filters={filters} setFilters={setFilters} employees={team ? emps?.data : null} />
      <DataTable columns={cols} rows={data?.data} loading={loading} error={error} onRetry={reload} emptyTitle="No attendance records" emptyMessage="Records appear after check-in." />
      <Pagination meta={data?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div></div>
  );
}

export default function Attendance() {
  const { hasRole } = useAuth();
  const canSeeTeam = hasRole('hr', 'manager');
  const [tab, setTab] = useState('mine');
  return (
    <>
      <PageHeader title="Attendance" subtitle="Check in, check out and review records" />
      <CheckCard />
      {canSeeTeam && (
        <ul className="nav nav-tabs mb-3" role="tablist">
          <li className="nav-item"><button className={`nav-link ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My attendance</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'team' ? 'active' : ''}`} onClick={() => setTab('team')}>{hasRole('hr') ? 'All employees' : 'My team'}</button></li>
        </ul>
      )}
      <History key={tab} team={canSeeTeam && tab === 'team'} />
      <p className="small text-muted mt-3">Rules: one check-in per workday; check-out requires a check-in; weekends and listed holidays are not recorded; a day with a check-in but no check-out is shown as "Missed". All times are shown in the organisation timezone.</p>
    </>
  );
}
