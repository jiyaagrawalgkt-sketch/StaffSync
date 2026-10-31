import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { usersApi, departmentsApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../hooks/useFetch.js';
import useDebounce from '../hooks/useDebounce.js';
import useForm from '../hooks/useForm.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Input, Select, SubmitButton } from '../components/Form.jsx';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';
import { fmtDate } from '../utils/format.js';

const EMPTY = { fullName: '', email: '', employeeId: '', role: 'employee', department: '', jobTitle: '', manager: '', joiningDate: '', employmentStatus: 'full-time', phone: '' };

function EmployeeForm({ show, editing, departments, managers, onClose, onSaved }) {
  const toast = useToast();
  const { values, setValues, bind, errors, setErrors } = useForm(EMPTY);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState(null);

  // Load the record into the form when the modal opens
  if (show && (editing?._id || 'new') !== lastId) {
    setLastId(editing?._id || 'new');
    setErrors({});
    setValues(editing ? {
      fullName: editing.fullName, email: editing.email, employeeId: editing.employeeId, role: editing.role,
      department: editing.department?._id || '', jobTitle: editing.jobTitle || '', manager: editing.manager?._id || '',
      joiningDate: editing.joiningDate, employmentStatus: editing.employmentStatus, phone: editing.phone || '',
    } : EMPTY);
  }
  if (!show && lastId !== null) setLastId(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...values };
      if (!body.joiningDate) delete body.joiningDate;
      if (!editing && !body.employeeId) delete body.employeeId;
      const res = editing ? await usersApi.update(editing._id, body) : await usersApi.create(body);
      toast.success(editing ? 'Employee updated' : 'Employee created');
      onSaved(res.data);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal show={show} onClose={onClose} title={editing ? 'Edit employee' : 'Add employee'} size="modal-lg">
      <form onSubmit={submit} noValidate>
        <div className="row">
          <div className="col-md-6"><Input label="Full name" required {...bind('fullName')} /></div>
          <div className="col-md-6"><Input label="Work email" type="email" required {...bind('email')} /></div>
          <div className="col-md-6"><Input label="Employee ID" help={editing ? undefined : 'Leave blank to auto-generate'} {...bind('employeeId')} /></div>
          <div className="col-md-6"><Input label="Job title" {...bind('jobTitle')} /></div>
          <div className="col-md-4">
            <Select label="Role" {...bind('role')}><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr">HR</option></Select>
          </div>
          <div className="col-md-4">
            <Select label="Department" {...bind('department')}><option value="">— None —</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select>
          </div>
          <div className="col-md-4">
            <Select label="Manager" {...bind('manager')}><option value="">— None —</option>{managers.filter((m) => m._id !== editing?._id).map((m) => <option key={m._id} value={m._id}>{m.fullName} ({m.employeeId})</option>)}</Select>
          </div>
          <div className="col-md-4"><Input label="Joining date" type="date" {...bind('joiningDate')} /></div>
          <div className="col-md-4">
            <Select label="Employment type" {...bind('employmentStatus')}>
              <option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="intern">Intern</option>
            </Select>
          </div>
          <div className="col-md-4"><Input label="Phone" {...bind('phone')} /></div>
        </div>
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <SubmitButton busy={busy}>{editing ? 'Save changes' : 'Create employee'}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

export default function Employees() {
  const { hasRole } = useAuth();
  const isHr = hasRole('hr');
  const toast = useToast();
  const [filters, setFilters] = useState({ search: '', department: '', role: '', status: '', sort: 'name', page: 1 });
  const search = useDebounce(filters.search);
  const { data, loading, error, reload } = useFetch(
    () => usersApi.list({ ...filters, search, limit: 10 }),
    [search, filters.department, filters.role, filters.status, filters.sort, filters.page]
  );
  const { data: deptData } = useFetch(() => departmentsApi.list(), []);
  const { data: mgrData } = useFetch(() => (isHr ? usersApi.managers() : Promise.resolve({ data: [] })), [isHr]);

  const [formState, setFormState] = useState({ show: false, editing: null });
  const [confirm, setConfirm] = useState(null);
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);

  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value, page: 1 }));
  const inviteLink = (token) => `${window.location.origin}/accept-invite?token=${token}`;

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await usersApi.setStatus(confirm._id, !confirm.isActive);
      toast.success(confirm.isActive ? 'Account deactivated' : 'Account activated');
      setConfirm(null); reload();
    } catch (err) { toast.error(getErrorMessage(err)); setConfirm(null); } finally { setBusy(false); }
  };

  const reinvite = async (u) => {
    try { const res = await usersApi.reinvite(u._id); setInvite({ name: u.fullName, token: res.data.inviteToken }); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const columns = [
    { key: 'name', header: 'Employee', render: (u) => (<><Link to={`/app/employees/${u._id}`} className="fw-semibold">{u.fullName}</Link><div className="small text-muted">{u.email}</div></>) },
    { key: 'employeeId', header: 'ID' },
    { key: 'department', header: 'Department', render: (u) => u.department?.name || '—' },
    { key: 'jobTitle', header: 'Title', render: (u) => u.jobTitle || '—' },
    { key: 'manager', header: 'Manager', render: (u) => u.manager?.fullName || '—' },
    { key: 'role', header: 'Role', render: (u) => <StatusBadge value={u.role} /> },
    { key: 'joined', header: 'Joined', render: (u) => fmtDate(u.joiningDate) },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge value={!u.isActive ? 'inactive' : u.activated ? 'active' : 'invited'} /> },
    ...(isHr ? [{ key: 'actions', header: '', render: (u) => (
      <div className="d-flex gap-1 flex-nowrap">
        <button className="btn btn-sm btn-outline-primary" onClick={() => setFormState({ show: true, editing: u })}>Edit</button>
        {!u.activated && <button className="btn btn-sm btn-outline-secondary" onClick={() => reinvite(u)}>Invite link</button>}
        <button className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => setConfirm(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
      </div>) }] : []),
  ];

  return (
    <>
      <PageHeader title={isHr ? 'Employees' : 'My team'} subtitle={isHr ? 'Manage employee records and accounts' : 'Employees who report to you'}>
        {isHr && <button className="btn btn-primary" onClick={() => setFormState({ show: true, editing: null })}><FiPlus className="me-1" />Add employee</button>}
      </PageHeader>

      <div className="card mb-3"><div className="card-body">
        <div className="row g-2">
          <div className="col-md-4">
            <div className="input-group"><span className="input-group-text"><FiSearch /></span>
              <input className="form-control" placeholder="Search name, email or ID" aria-label="Search employees" value={filters.search} onChange={setFilter('search')} /></div>
          </div>
          <div className="col-md-2"><select className="form-select" aria-label="Department" value={filters.department} onChange={setFilter('department')}><option value="">All departments</option>{(deptData?.data || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
          <div className="col-md-2"><select className="form-select" aria-label="Role" value={filters.role} onChange={setFilter('role')}><option value="">All roles</option><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr">HR</option></select></div>
          <div className="col-md-2"><select className="form-select" aria-label="Status" value={filters.status} onChange={setFilter('status')}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div className="col-md-2"><select className="form-select" aria-label="Sort" value={filters.sort} onChange={setFilter('sort')}><option value="name">Name A-Z</option><option value="-name">Name Z-A</option><option value="-joiningDate">Newest joiners</option><option value="joiningDate">Oldest joiners</option><option value="employeeId">Employee ID</option></select></div>
        </div>
      </div></div>

      <div className="card"><div className="card-body">
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} emptyTitle="No employees found" emptyMessage="Try changing the filters." />
        <Pagination meta={data?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </div></div>

      <EmployeeForm show={formState.show} editing={formState.editing} departments={deptData?.data || []} managers={mgrData?.data || []}
        onClose={() => setFormState({ show: false, editing: null })}
        onSaved={(res) => {
          setFormState({ show: false, editing: null });
          if (res?.inviteToken) setInvite({ name: res.user.fullName, token: res.inviteToken });
          reload();
        }} />

      <ConfirmDialog show={!!confirm} busy={busy} variant={confirm?.isActive ? 'danger' : 'success'}
        title={confirm?.isActive ? 'Deactivate account?' : 'Activate account?'}
        message={confirm?.isActive ? `${confirm?.fullName} will no longer be able to log in.` : `${confirm?.fullName} will be able to log in again.`}
        confirmLabel={confirm?.isActive ? 'Deactivate' : 'Activate'} onConfirm={toggleStatus} onCancel={() => setConfirm(null)} />

      <Modal show={!!invite} title="Invitation link" onClose={() => setInvite(null)} footer={<button className="btn btn-primary" onClick={() => setInvite(null)}>Done</button>}>
        <p>Share this one-time link with <strong>{invite?.name}</strong>. It is valid for 7 days. StaffSync does not send emails, so you must send it yourself.</p>
        <div className="input-group">
          <input readOnly className="form-control" aria-label="Invitation link" value={invite ? inviteLink(invite.token) : ''} onFocus={(e) => e.target.select()} />
          <button className="btn btn-outline-primary" onClick={() => { navigator.clipboard?.writeText(inviteLink(invite.token)); toast.info('Link copied'); }}>Copy</button>
        </div>
        <p className="small text-danger mt-2 mb-0">This link is shown only now. You can generate a new one later if it is lost.</p>
      </Modal>
    </>
  );
}
