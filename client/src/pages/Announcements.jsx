import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { announcementsApi, departmentsApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../hooks/useFetch.js';
import useForm from '../hooks/useForm.js';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Loader, ErrorState, EmptyState } from '../components/Feedback.jsx';
import { Input, Textarea, SubmitButton } from '../components/Form.jsx';
import { fmtDateTime } from '../utils/format.js';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

export default function Announcements() {
  const { hasRole } = useAuth();
  const isHr = hasRole('hr');
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [key, setKey] = useState(0);
  const { data, loading, error, reload } = useFetch(() => announcementsApi.list({ status: isHr ? status : undefined, page, limit: 6 }), [status, page, key, isHr]);
  const { data: depts } = useFetch(() => (isHr ? departmentsApi.list() : Promise.resolve({ data: [] })), [isHr]);

  const [editing, setEditing] = useState(undefined);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const { values, setValues, bind, errors, setErrors } = useForm({ title: '', body: '', targetDepartments: [] });

  const open = (a) => {
    setErrors({});
    setValues(a ? { title: a.title, body: a.body, targetDepartments: a.targetDepartments.map((d) => d._id) } : { title: '', body: '', targetDepartments: [] });
    setEditing(a);
  };
  const toggleDept = (id) => setValues((v) => ({ ...v, targetDepartments: v.targetDepartments.includes(id) ? v.targetDepartments.filter((x) => x !== id) : [...v.targetDepartments, id] }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await announcementsApi.update(editing._id, values); else await announcementsApi.create(values);
      toast.success(editing ? 'Announcement updated' : 'Draft created. Publish it when ready.');
      setEditing(undefined); setKey((k) => k + 1);
    } catch (err) { setErrors(fieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusy(false); }
  };
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); setKey((k) => k + 1); } catch (e) { toast.error(getErrorMessage(e)); } };

  return (
    <>
      <PageHeader title="Announcements" subtitle={isHr ? 'Create, publish and archive announcements' : 'News and updates for you'}>
        {isHr && <button className="btn btn-primary" onClick={() => open(null)}><FiPlus className="me-1" />New announcement</button>}
      </PageHeader>
      {isHr && (
        <div className="mb-3"><select className="form-select w-auto" aria-label="Status filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
      )}
      {loading && !data && <Loader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.data.length && <div className="card"><div className="card-body"><EmptyState title="No announcements" /></div></div>}
      <div className="row g-3">
        {(data?.data || []).map((a) => (
          <div className="col-lg-6" key={a._id}>
            <div className="card h-100"><div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <h2 className="h5">{a.title}</h2>{isHr && <StatusBadge value={a.status} />}
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <div className="small text-muted mb-2">
                {a.publishedAt ? `Published ${fmtDateTime(a.publishedAt)}` : `Created ${fmtDateTime(a.createdAt)}`} ·{' '}
                {a.targetDepartments?.length ? `For: ${a.targetDepartments.map((d) => d.name).join(', ')}` : 'Whole organisation'}
              </div>
              {isHr && (
                <div className="d-flex gap-2 flex-wrap">
                  {a.status !== 'archived' && <button className="btn btn-sm btn-outline-primary" onClick={() => open(a)}>Edit</button>}
                  {a.status === 'draft' && <button className="btn btn-sm btn-success" onClick={() => act(() => announcementsApi.publish(a._id), 'Announcement published')}>Publish</button>}
                  {a.status !== 'archived' && <button className="btn btn-sm btn-outline-danger" onClick={() => setArchiveTarget(a)}>Archive</button>}
                </div>
              )}
            </div></div>
          </div>
        ))}
      </div>
      <Pagination meta={data?.meta} onChange={setPage} />

      <Modal show={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit announcement' : 'New announcement'} size="modal-lg">
        <form onSubmit={save} noValidate>
          <Input label="Title" required {...bind('title')} />
          <Textarea label="Message" rows={5} required {...bind('body')} />
          <fieldset className="mb-3">
            <legend className="form-label fs-6">Audience</legend>
            <p className="small text-muted mb-1">Select departments, or leave all unchecked to send to the whole organisation.</p>
            <div className="d-flex flex-wrap gap-3">
              {(depts?.data || []).map((d) => (
                <div className="form-check" key={d._id}>
                  <input className="form-check-input" type="checkbox" id={`dept-${d._id}`} checked={values.targetDepartments.includes(d._id)} onChange={() => toggleDept(d._id)} />
                  <label className="form-check-label" htmlFor={`dept-${d._id}`}>{d.name}</label>
                </div>
              ))}
            </div>
            {errors.targetDepartments && <div className="text-danger small">{errors.targetDepartments}</div>}
          </fieldset>
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-light" onClick={() => setEditing(undefined)}>Cancel</button><SubmitButton busy={busy}>{editing ? 'Save changes' : 'Save as draft'}</SubmitButton></div>
        </form>
      </Modal>
      <ConfirmDialog show={!!archiveTarget} title="Archive announcement?" message="Archived announcements disappear for employees and cannot be edited." confirmLabel="Archive"
        onConfirm={() => { act(() => announcementsApi.archive(archiveTarget._id), 'Announcement archived'); setArchiveTarget(null); }} onCancel={() => setArchiveTarget(null)} />
    </>
  );
}
