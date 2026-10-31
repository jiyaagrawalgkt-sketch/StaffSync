import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { trainingsApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../hooks/useFetch.js';
import useForm from '../hooks/useForm.js';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataTable from '../components/DataTable.jsx';
import { Loader, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { Input, Textarea, SubmitButton } from '../components/Form.jsx';
import { fmtDateTime, toInputDateTime, fromInputDateTime } from '../utils/format.js';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

const EMPTY = { title: '', description: '', startDate: '', endDate: '', location: '', capacity: 0 };

function TrainingForm({ show, editing, onClose, onSaved }) {
  const toast = useToast();
  const { values, setValues, bind, errors, setErrors } = useForm(EMPTY);
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);

  if (show && (editing?._id || 'new') !== loadedFor) {
    setLoadedFor(editing?._id || 'new'); setErrors({});
    setValues(editing ? { title: editing.title, description: editing.description, startDate: toInputDateTime(editing.startDate), endDate: toInputDateTime(editing.endDate), location: editing.location || '', capacity: editing.capacity } : EMPTY);
  }
  if (!show && loadedFor !== null) setLoadedFor(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!values.startDate || !values.endDate) { setErrors({ startDate: !values.startDate ? 'Start is required' : undefined, endDate: !values.endDate ? 'End is required' : undefined }); return; }
    setBusy(true);
    try {
      const body = { ...values, startDate: fromInputDateTime(values.startDate), endDate: fromInputDateTime(values.endDate), capacity: Number(values.capacity) || 0 };
      if (editing) await trainingsApi.update(editing._id, body); else await trainingsApi.create(body);
      toast.success(editing ? 'Training updated' : 'Training saved as draft. Publish it when ready.');
      onSaved();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal show={show} onClose={onClose} title={editing ? 'Edit training' : 'New training program'} size="modal-lg">
      <form onSubmit={submit} noValidate>
        <Input label="Title" required {...bind('title')} />
        <Textarea label="Description" rows={4} required {...bind('description')} />
        <div className="row">
          <div className="col-md-6"><Input label="Starts" type="datetime-local" required {...bind('startDate')} /></div>
          <div className="col-md-6"><Input label="Ends" type="datetime-local" required {...bind('endDate')} /></div>
          <div className="col-md-8"><Input label="Location" {...bind('location')} /></div>
          <div className="col-md-4"><Input label="Capacity" type="number" min="0" help="0 means unlimited" {...bind('capacity')} /></div>
        </div>
        <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={onClose}>Cancel</button><SubmitButton busy={busy}>{editing ? 'Save changes' : 'Save as draft'}</SubmitButton></div>
      </form>
    </Modal>
  );
}

function Enrollees({ training, onClose }) {
  const { data, loading, error } = useFetch(() => (training ? trainingsApi.enrollees(training._id) : Promise.resolve({ data: [] })), [training?._id]);
  const cols = [
    { key: 'n', header: 'Employee', render: (e) => e.user?.fullName },
    { key: 'id', header: 'ID', render: (e) => e.user?.employeeId },
    { key: 'd', header: 'Department', render: (e) => e.user?.department?.name || '—' },
    { key: 'at', header: 'Enrolled', render: (e) => fmtDateTime(e.createdAt) },
  ];
  return (
    <Modal show={!!training} onClose={onClose} title={`Enrolled: ${training?.title || ''}`} size="modal-lg">
      <DataTable columns={cols} rows={data?.data} loading={loading} error={error} emptyTitle="No one has enrolled yet" />
    </Modal>
  );
}

function MyEnrollments() {
  const { data, loading, error, reload } = useFetch(() => trainingsApi.mine(), []);
  const cols = [
    { key: 't', header: 'Program', render: (e) => e.training?.title },
    { key: 's', header: 'Starts', render: (e) => fmtDateTime(e.training?.startDate) },
    { key: 'l', header: 'Location', render: (e) => e.training?.location || '—' },
    { key: 'e', header: 'Enrolled on', render: (e) => fmtDateTime(e.createdAt) },
  ];
  return <div className="card"><div className="card-body"><DataTable columns={cols} rows={data?.data} loading={loading} error={error} onRetry={reload} emptyTitle="No enrollments yet" emptyMessage="Enroll in a program from the Programs tab." /></div></div>;
}

function Programs() {
  const { hasRole } = useAuth();
  const canCreate = hasRole('hr', 'manager');
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [key, setKey] = useState(0);
  const { data, loading, error, reload } = useFetch(() => trainingsApi.list({ status: canCreate ? status : undefined, page, limit: 6 }), [status, page, key, canCreate]);
  const [form, setForm] = useState({ show: false, editing: null });
  const [viewing, setViewing] = useState(null);
  const [archive, setArchive] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const act = async (id, fn, msg) => {
    setBusyId(id);
    try { await fn(); toast.success(msg); } catch (e) { toast.error(getErrorMessage(e)); }
    setBusyId(null); setKey((k) => k + 1);
  };

  return (
    <>
      <div className="d-flex justify-content-between mb-3 flex-wrap gap-2">
        {canCreate ? (
          <select className="form-select w-auto" aria-label="Status filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
        ) : <span />}
        {canCreate && <button className="btn btn-primary" onClick={() => setForm({ show: true, editing: null })}><FiPlus className="me-1" />New program</button>}
      </div>
      {loading && !data && <Loader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.data.length && <div className="card"><div className="card-body"><EmptyState title="No training programs" /></div></div>}
      <div className="row g-3">
        {(data?.data || []).map((t) => (
          <div className="col-lg-6" key={t._id}>
            <div className="card h-100"><div className="card-body d-flex flex-column">
              <div className="d-flex justify-content-between gap-2"><h2 className="h5">{t.title}</h2>{canCreate && <StatusBadge value={t.status} />}</div>
              <p className="text-muted">{t.description}</p>
              <div className="small mb-3">
                <div>🗓 {fmtDateTime(t.startDate)} → {fmtDateTime(t.endDate)}</div>
                {t.location && <div>📍 {t.location}</div>}
                <div>👥 {t.capacity > 0 ? `${t.enrolledCount}/${t.capacity} seats` : `${t.enrolledCount} enrolled (no limit)`}{t.isFull && <span className="badge text-bg-warning ms-2">Full</span>}</div>
                <div className="text-muted">Created by {t.createdBy?.fullName}</div>
              </div>
              <div className="mt-auto d-flex gap-2 flex-wrap">
                {t.status === 'published' && (t.isEnrolled
                  ? <button className="btn btn-sm btn-outline-danger" disabled={busyId === t._id || t.hasStarted} onClick={() => act(t._id, () => trainingsApi.cancelEnrollment(t._id), 'Enrollment cancelled')}>Cancel enrollment</button>
                  : <button className="btn btn-sm btn-primary" disabled={busyId === t._id || t.isFull || new Date(t.endDate) < new Date()} onClick={() => act(t._id, () => trainingsApi.enroll(t._id), 'Enrolled successfully')}>Enroll</button>)}
                {t.isEnrolled && <span className="badge text-bg-success align-self-center">You are enrolled</span>}
                {t.canManage && (
                  <>
                    {t.status !== 'archived' && <button className="btn btn-sm btn-outline-primary" onClick={() => setForm({ show: true, editing: t })}>Edit</button>}
                    {t.status === 'draft' && <button className="btn btn-sm btn-success" disabled={busyId === t._id} onClick={() => act(t._id, () => trainingsApi.publish(t._id), 'Program published')}>Publish</button>}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setViewing(t)}>Enrollees</button>
                    {t.status !== 'archived' && <button className="btn btn-sm btn-outline-danger" onClick={() => setArchive(t)}>Archive</button>}
                  </>
                )}
              </div>
            </div></div>
          </div>
        ))}
      </div>
      <Pagination meta={data?.meta} onChange={setPage} />
      <TrainingForm show={form.show} editing={form.editing} onClose={() => setForm({ show: false, editing: null })} onSaved={() => { setForm({ show: false, editing: null }); setKey((k) => k + 1); }} />
      <Enrollees training={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog show={!!archive} title="Archive program?" message="Archived programs are hidden from employees and cannot be edited." confirmLabel="Archive"
        onConfirm={() => { act(archive._id, () => trainingsApi.archive(archive._id), 'Program archived'); setArchive(null); }} onCancel={() => setArchive(null)} />
    </>
  );
}

export default function Trainings() {
  const [tab, setTab] = useState('programs');
  return (
    <>
      <PageHeader title="Training & development" subtitle="Browse programs and manage your enrollments" />
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'programs' ? 'active' : ''}`} onClick={() => setTab('programs')}>Programs</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My enrollments</button></li>
      </ul>
      {tab === 'programs' ? <Programs /> : <MyEnrollments />}
    </>
  );
}
