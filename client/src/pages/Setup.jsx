import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import { authApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Input, SubmitButton } from '../components/Form.jsx';
import { Loader } from '../components/Feedback.jsx';
import useForm from '../hooks/useForm.js';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

export default function Setup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { values, bind, setErrors } = useForm({ fullName: '', email: '', password: '', setupKey: '' });
  const [state, setState] = useState({ loading: true, needsSetup: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.setupStatus().then((r) => setState({ loading: false, needsSetup: r.data.needsSetup })).catch(() => setState({ loading: false, needsSetup: false }));
  }, []);

  if (user) return <Navigate to="/app/dashboard" replace />;
  if (state.loading) return <Loader fullPage />;
  if (!state.needsSetup) return <Navigate to="/login" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await authApi.setup(values);
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
          <h1 className="h4">Create the HR administrator</h1>
          <p className="text-muted small">This page only works once, while the system has no users. You need the <code>SETUP_KEY</code> from <code>server/.env</code>.</p>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          <form onSubmit={onSubmit} noValidate>
            <Input label="Full name" required {...bind('fullName')} />
            <Input label="Work email" type="email" required {...bind('email')} />
            <Input label="Password" type="password" autoComplete="new-password" help="At least 8 characters, with a letter and a number." required {...bind('password')} />
            <Input label="Setup key" type="password" required {...bind('setupKey')} />
            <SubmitButton busy={busy} className="btn btn-primary w-100">Create administrator</SubmitButton>
          </form>
        </div></div>
        <p className="text-center small mt-3"><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
