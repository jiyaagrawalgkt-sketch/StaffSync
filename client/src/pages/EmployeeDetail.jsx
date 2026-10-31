import { Link, useParams } from 'react-router-dom';
import { usersApi, leavesApi, attendanceApi } from '../services/endpoints.js';
import useFetch from '../hooks/useFetch.js';
import PageHeader from '../components/PageHeader.jsx';
import { Loader, ErrorState } from '../components/Feedback.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { fmtDate, fmtTime, fmtHours, initials } from '../utils/format.js';

export default function EmployeeDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(() => usersApi.get(id), [id]);
  const { data: bal } = useFetch(() => leavesApi.balances({ user: id }), [id]);
  const { data: att, loading: attLoading } = useFetch(() => attendanceApi.list({ user: id, limit: 10 }), [id]);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const u = data.data;

  const attCols = [
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.workDate) },
    { key: 'in', header: 'Check-in', render: (r) => fmtTime(r.checkIn) },
    { key: 'out', header: 'Check-out', render: (r) => fmtTime(r.checkOut) },
    { key: 'h', header: 'Hours', render: (r) => fmtHours(r.workMinutes) },
    { key: 's', header: 'Status', render: (r) => (<><StatusBadge value={r.status} />{r.missedCheckout && <span className="badge text-bg-danger ms-1">Missed check-out</span>}</>) },
  ];

  return (
    <>
      <PageHeader title={u.fullName} subtitle={`${u.employeeId} · ${u.jobTitle || 'No title'}`}>
        <Link to="/app/employees" className="btn btn-light">Back to list</Link>
      </PageHeader>
      <div className="row g-3 mb-3">
        <div className="col-lg-5">
          <div className="card h-100"><div className="card-body">
            <div className="d-flex align-items-center gap-3 mb-3"><span className="avatar" style={{ width: 56, height: 56 }}>{initials(u.fullName)}</span>
              <div><StatusBadge value={u.role} /> <StatusBadge value={!u.isActive ? 'inactive' : u.activated ? 'active' : 'invited'} /></div></div>
            <dl className="row mb-0">
              <dt className="col-5 text-muted">Email</dt><dd className="col-7 text-break">{u.email}</dd>
              <dt className="col-5 text-muted">Phone</dt><dd className="col-7">{u.phone || '—'}</dd>
              <dt className="col-5 text-muted">Department</dt><dd className="col-7">{u.department?.name || '—'}</dd>
              <dt className="col-5 text-muted">Manager</dt><dd className="col-7">{u.manager?.fullName || '—'}</dd>
              <dt className="col-5 text-muted">Joined</dt><dd className="col-7">{fmtDate(u.joiningDate)}</dd>
              <dt className="col-5 text-muted">Employment</dt><dd className="col-7 text-capitalize">{u.employmentStatus}</dd>
            </dl>
          </div></div>
        </div>
        <div className="col-lg-7">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 mb-3">Leave balance ({new Date().getFullYear()})</h2>
            <div className="row g-3">
              {(bal?.data || []).map((b) => (
                <div className="col-4" key={b.type}><div className="border rounded p-3 text-center">
                  <div className="text-muted small text-capitalize">{b.type}</div><div className="fs-3 fw-bold">{b.remaining}</div><div className="small text-muted">of {b.allocated} · used {b.used}</div>
                </div></div>
              ))}
            </div>
          </div></div>
        </div>
      </div>
      <div className="card"><div className="card-body">
        <h2 className="h6 mb-3">Recent attendance</h2>
        <DataTable columns={attCols} rows={att?.data} loading={attLoading} emptyTitle="No attendance records" />
      </div></div>
    </>
  );
}
