import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import { authApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Input, SubmitButton } from '../components/Form.jsx';
import useForm from '../hooks/useForm.js';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { values, bind, errors, setErrors } = useForm({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (values.password !== values.confirm) { setErrors({ confirm: 'Passwords do not match' }); return; }
    setBusy(true);
    try {
      const res = await authApi.acceptInvite({ token, password: values.password });
      setUser(res.data);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err)); setErrors(fieldErrors(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-4"><span className="fs-3 fw-bold text-brand"><FiUsers className="me-2" />StaffSync</span></div>
        <div className="card"><div className="card-body p-4">
          <h1 className="h4">Activate your account</h1>
          {!token ? <div className="alert alert-warning">This invitation link is incomplete. Ask HR to send it again.</div> : (
            <>
              <p className="text-muted small">Choose a password to finish setting up your account.</p>
              {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
              <form onSubmit={onSubmit} noValidate>
                <Input label="New password" type="password" autoComplete="new-password" help="At least 8 characters, with a letter and a number." required {...bind('password')} error={errors.password} />
                <Input label="Confirm password" type="password" autoComplete="new-password" required {...bind('confirm')} />
                <SubmitButton busy={busy} className="btn btn-primary w-100">Activate account</SubmitButton>
              </form>
            </>
          )}
        </div></div>
        <p className="text-center small mt-3"><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
