import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { leavesApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../hooks/useFetch.js';
import useForm from '../hooks/useForm.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Input, Select, Textarea, SubmitButton } from '../components/Form.jsx';
import { fmtDate } from '../utils/format.js';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

function Balances({ reloadKey }) {
  const { data } = useFetch(() => leavesApi.balances(), [reloadKey]);
  return (
    <div className="row g-3 mb-4">
      {(data?.data || []).map((b) => (
        <div className="col-md-4" key={b.type}>
          <div className="card"><div className="card-body">
            <div className="d-flex justify-content-between"><span className="text-capitalize fw-semibold">{b.type} leave</span><span className="text-muted small">{b.year}</span></div>
            <div className="display-6 fw-bold">{b.remaining}<span className="fs-6 text-muted"> / {b.allocated} days left</span></div>
            <div className="progress mt-2" style={{ height: 6 }}><div className="progress-bar" style={{ width: `${b.allocated ? (b.remaining / b.allocated) * 100 : 0}%` }} /></div>
          </div></div>
        </div>
      ))}
    </div>
  );
}

function ApplyModal({ show, onClose, onDone }) {
  const toast = useToast();
  const { values, bind, errors, setErrors, reset } = useForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (values.startDate && values.endDate && values.endDate < values.startDate) { setErrors({ endDate: 'End date cannot be before start date' }); return; }
    setBusy(true);
    try { await leavesApi.apply(values); toast.success('Leave request submitted'); reset(); onDone(); }
    catch (err) { setErrors({ ...fieldErrors(err), _form: getErrorMessage(err) }); } finally { setBusy(false); }
  };
  return (
    <Modal show={show} onClose={onClose} title="Apply for leave">
      <form onSubmit={submit} noValidate>
        {errors._form && !Object.keys(errors).some((k) => k !== '_form' && errors[k]) && <div className="alert alert-danger py-2">{errors._form}</div>}
        <Select label="Leave type" {...bind('type')}><option value="casual">Casual</option><option value="sick">Sick</option><option value="earned">Earned</option></Select>
        <div className="row">
          <div className="col-6"><Input label="Start date" type="date" required {...bind('startDate')} /></div>
          <div className="col-6"><Input label="End date" type="date" required min={values.startDate || undefined} {...bind('endDate')} /></div>
        </div>
        <p className="small text-muted">Only working days count; weekends and holidays are excluded automatically.</p>
        <Textarea label="Reason" required {...bind('reason')} />
        <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={onClose}>Cancel</button><SubmitButton busy={busy}>Submit request</SubmitButton></div>
      </form>
    </Modal>
  );
}

function MyLeaves() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [key, setKey] = useState(0);
  const [showApply, setShowApply] = useState(false);
  const [toCancel, setToCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(() => leavesApi.mine({ page, limit: 8 }), [page, key]);
  const refresh = () => { setKey((k) => k + 1); };

  const cancel = async () => {
    setBusy(true);
    try { await leavesApi.cancel(toCancel._id); toast.success('Leave cancelled'); refresh(); }
    catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(false); setToCancel(null); }
  };

  const columns = [
    { key: 'type', header: 'Type', render: (l) => <span className="text-capitalize">{l.type}</span> },
    { key: 'dates', header: 'Dates', render: (l) => `${fmtDate(l.startDate)} to ${fmtDate(l.endDate)}` },
    { key: 'days', header: 'Days' },
    { key: 'reason', header: 'Reason', render: (l) => <span title={l.reason}>{l.reason.length > 40 ? `${l.reason.slice(0, 40)}…` : l.reason}</span> },
    { key: 'status', header: 'Status', render: (l) => (<><StatusBadge value={l.status} />{l.status === 'rejected' && l.rejectionReason && <div className="small text-danger">{l.rejectionReason}</div>}</>) },
    { key: 'actions', header: '', render: (l) => ['pending', 'approved'].includes(l.status) && (<button className="btn btn-sm btn-outline-danger" onClick={() => setToCancel(l)}>Cancel</button>) },
  ];

  return (
    <>
      <Balances reloadKey={key} />
      <div className="card"><div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h6 mb-0">My leave requests</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowApply(true)}><FiPlus className="me-1" />Apply for leave</button></div>
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} emptyTitle="No leave requests yet" emptyMessage="Use 'Apply for leave' to create one." />
        <Pagination meta={data?.meta} onChange={setPage} />
      </div></div>
      <ApplyModal show={showApply} onClose={() => setShowApply(false)} onDone={() => { setShowApply(false); setPage(1); refresh(); }} />
      <ConfirmDialog show={!!toCancel} busy={busy} title="Cancel this request?" message={toCancel?.status === 'approved' ? 'The approved days will be returned to your balance.' : 'The pending request will be withdrawn.'} confirmLabel="Cancel request" onConfirm={cancel} onCancel={() => setToCancel(null)} />
    </>
  );
}

function Approvals() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [key, setKey] = useState(0);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { data, loading, error, reload } = useFetch(() => leavesApi.list({ status, page, limit: 8 }), [status, page, key]);

  const approve = async (l) => {
    setBusyId(l._id);
    try { await leavesApi.approve(l._id); toast.success('Leave approved'); } catch (e) { toast.error(getErrorMessage(e)); }
    setBusyId(null); setKey((k) => k + 1);
  };
  const reject = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 3) { setReasonErr('Please enter a reason (at least 3 characters)'); return; }
    setBusyId(rejecting._id);
    try { await leavesApi.reject(rejecting._id, reason.trim()); toast.success('Leave rejected'); setRejecting(null); setReason(''); }
    catch (err) { toast.error(getErrorMessage(err)); }
    setBusyId(null); setKey((k) => k + 1);
  };

  const columns = [
    { key: 'emp', header: 'Employee', render: (l) => (<>{l.user?.fullName}<div className="small text-muted">{l.user?.employeeId}</div></>) },
    { key: 'type', header: 'Type', render: (l) => <span className="text-capitalize">{l.type}</span> },
    { key: 'dates', header: 'Dates', render: (l) => `${fmtDate(l.startDate)} to ${fmtDate(l.endDate)}` },
    { key: 'days', header: 'Days' },
    { key: 'reason', header: 'Reason', render: (l) => <span title={l.reason}>{l.reason.length > 36 ? `${l.reason.slice(0, 36)}…` : l.reason}</span> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge value={l.status} /> },
    { key: 'actions', header: '', render: (l) => l.status === 'pending' && l.user?._id !== user._id && (
      <div className="d-flex gap-1">
        <button className="btn btn-sm btn-success" disabled={busyId === l._id} onClick={() => approve(l)}>Approve</button>
        <button className="btn btn-sm btn-outline-danger" disabled={busyId === l._id} onClick={() => { setRejecting(l); setReason(''); setReasonErr(''); }}>Reject</button>
      </div>) },
  ];

  return (
    <div className="card"><div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h6 mb-0">Leave requests</h2>
        <select className="form-select w-auto" aria-label="Status filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>
        </select>
      </div>
      <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} emptyTitle="No requests" emptyMessage="Nothing matches this filter." />
      <Pagination meta={data?.meta} onChange={setPage} />
      <Modal show={!!rejecting} title="Reject leave request" onClose={() => setRejecting(null)}>
        <form onSubmit={reject} noValidate>
          <p className="small text-muted">{rejecting?.user?.fullName} · {rejecting && `${fmtDate(rejecting.startDate)} to ${fmtDate(rejecting.endDate)}`}</p>
          <Textarea label="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} error={reasonErr} required />
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={() => setRejecting(null)}>Cancel</button><SubmitButton busy={busyId === rejecting?._id} className="btn btn-danger">Reject request</SubmitButton></div>
        </form>
      </Modal>
    </div></div>
  );
}

function LeaveCalendar() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { data, loading, error, reload } = useFetch(() => leavesApi.calendar(month), [month]);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = first.getUTCDay();
  const shift = (n) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)); };
  const todayStr = new Date().toISOString().slice(0, 10);
  const leaves = data?.data || [];
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="card"><div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h2 className="h6 mb-0">{first.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      {error && <div className="alert alert-danger">{error} <button className="btn btn-link p-0" onClick={reload}>Retry</button></div>}
      <div className="cal-grid mb-1 text-center small text-muted">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}</div>
      <div className="cal-grid" style={{ opacity: loading ? 0.5 : 1 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`b${i}`} className="cal-cell muted" />;
          const ds = `${month}-${String(day).padStart(2, '0')}`;
          const on = leaves.filter((l) => l.startDate <= ds && l.endDate >= ds);
          return (
            <div key={ds} className={`cal-cell ${ds === todayStr ? 'today' : ''}`}>
              <div className="fw-semibold">{day}</div>
              {on.slice(0, 3).map((l) => <span key={l._id} className="cal-tag" title={`${l.user?.fullName} (${l.type})`}>{l.user?.fullName?.split(' ')[0]}</span>)}
              {on.length > 3 && <span className="text-muted">+{on.length - 3} more</span>}
            </div>
          );
        })}
      </div>
      <p className="small text-muted mt-3 mb-0">Shows approved leave only.</p>
    </div></div>
  );
}

export default function Leaves() {
  const { hasRole } = useAuth();
  const canReview = hasRole('hr', 'manager');
  const [tab, setTab] = useState('mine');
  const tabs = [['mine', 'My leave'], ...(canReview ? [['approvals', 'Approvals']] : []), ['calendar', hasRole('employee') ? 'My calendar' : 'Team calendar']];
  return (
    <>
      <PageHeader title="Leave" subtitle="Apply for leave, track balances and review requests" />
      <ul className="nav nav-tabs mb-3">
        {tabs.map(([k, label]) => <li className="nav-item" key={k}><button className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button></li>)}
      </ul>
      {tab === 'mine' && <MyLeaves />}
      {tab === 'approvals' && <Approvals />}
      {tab === 'calendar' && <LeaveCalendar />}
    </>
  );
}
