import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/endpoints.js';
import { Input, SubmitButton } from '../components/Form.jsx';
import useForm from '../hooks/useForm.js';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { values, bind, setErrors } = useForm({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => { authApi.setupStatus().then((r) => setNeedsSetup(r.data.needsSetup)).catch(() => {}); }, []);

  if (!loading && user) return <Navigate to="/app/dashboard" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!values.email.trim() || !values.password) { setError('Please enter your email and password.'); return; }
    setBusy(true);
    try {
      await login(values.email.trim(), values.password);
      navigate(location.state?.from?.pathname || '/app/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setErrors(fieldErrors(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none fs-3 fw-bold text-brand"><FiUsers className="me-2" />StaffSync</Link>
        </div>
        <div className="card"><div className="card-body p-4">
          <h1 className="h4 mb-3">Log in</h1>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          <form onSubmit={onSubmit} noValidate>
            <Input label="Work email" type="email" autoComplete="username" required {...bind('email')} />
            <Input label="Password" type="password" autoComplete="current-password" required {...bind('password')} />
            <SubmitButton busy={busy} className="btn btn-primary w-100">Log in</SubmitButton>
          </form>
        </div></div>
        <p className="text-center text-muted small mt-3 mb-0">
          Accounts are created by HR. Received an invitation? Open the link HR shared with you.
          {needsSetup && <><br /><Link to="/setup">First time here? Set up the HR administrator</Link></>}
        </p>
      </div>
    </div>
  );
}
