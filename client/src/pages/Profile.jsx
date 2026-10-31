import { useState } from 'react';
import { authApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useForm from '../hooks/useForm.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Input, SubmitButton } from '../components/Form.jsx';
import { fmtDate, initials } from '../utils/format.js';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const profile = useForm({ fullName: user.fullName, phone: user.phone || '' });
  const pwd = useForm({ currentPassword: '', newPassword: '', confirm: '' });
  const [busyP, setBusyP] = useState(false);
  const [busyW, setBusyW] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setBusyP(true);
    try { await authApi.updateMe(profile.values); await refreshUser(); toast.success('Profile updated'); }
    catch (err) { profile.setErrors(fieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusyP(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.values.newPassword !== pwd.values.confirm) { pwd.setErrors({ confirm: 'Passwords do not match' }); return; }
    setBusyW(true);
    try {
      await authApi.changePassword({ currentPassword: pwd.values.currentPassword, newPassword: pwd.values.newPassword });
      toast.success('Password changed. Other devices were signed out.'); pwd.reset();
    } catch (err) { pwd.setErrors(fieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusyW(false); }
  };

  return (
    <>
      <PageHeader title="My profile" subtitle="View your details and manage your account" />
      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100"><div className="card-body">
            <div className="d-flex align-items-center gap-3 mb-3"><span className="avatar" style={{ width: 60, height: 60, fontSize: '1.3rem' }}>{initials(user.fullName)}</span>
              <div><h2 className="h5 mb-1">{user.fullName}</h2><StatusBadge value={user.role} /></div></div>
            <dl className="row mb-0">
              <dt className="col-5 text-muted">Employee ID</dt><dd className="col-7">{user.employeeId}</dd>
              <dt className="col-5 text-muted">Email</dt><dd className="col-7 text-break">{user.email}</dd>
              <dt className="col-5 text-muted">Department</dt><dd className="col-7">{user.department?.name || '—'}</dd>
              <dt className="col-5 text-muted">Job title</dt><dd className="col-7">{user.jobTitle || '—'}</dd>
              <dt className="col-5 text-muted">Manager</dt><dd className="col-7">{user.manager?.fullName || '—'}</dd>
              <dt className="col-5 text-muted">Joined</dt><dd className="col-7">{fmtDate(user.joiningDate)}</dd>
            </dl>
            <p className="small text-muted mt-3 mb-0">Role, department, manager and employee ID are controlled by HR.</p>
          </div></div>
        </div>
        <div className="col-lg-7">
          <div className="card mb-3"><div className="card-body">
            <h2 className="h6 mb-3">Edit contact details</h2>
            <form onSubmit={saveProfile} noValidate>
              <Input label="Full name" required {...profile.bind('fullName')} />
              <Input label="Phone" {...profile.bind('phone')} />
              <SubmitButton busy={busyP}>Save changes</SubmitButton>
            </form>
          </div></div>
          <div className="card"><div className="card-body">
            <h2 className="h6 mb-3">Change password</h2>
            <form onSubmit={changePassword} noValidate>
              <Input label="Current password" type="password" autoComplete="current-password" required {...pwd.bind('currentPassword')} />
              <Input label="New password" type="password" autoComplete="new-password" help="At least 8 characters, with a letter and a number." required {...pwd.bind('newPassword')} />
              <Input label="Confirm new password" type="password" autoComplete="new-password" required {...pwd.bind('confirm')} />
              <SubmitButton busy={busyW}>Change password</SubmitButton>
            </form>
          </div></div>
        </div>
      </div>
    </>
  );
}
