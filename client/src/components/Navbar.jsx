import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { initials, titleCase } from '../utils/format.js';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <header className="topbar d-flex align-items-center justify-content-between px-3 py-2">
      <button className="btn btn-light" onClick={onToggleSidebar} aria-label="Toggle sidebar"><FiMenu /></button>
      <div className="d-flex align-items-center gap-2">
        <NotificationBell />
        <div className="position-relative" ref={ref}>
          <button className="btn btn-light d-flex align-items-center gap-2" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Profile menu">
            <span className="avatar">{initials(user.fullName)}</span>
            <span className="d-none d-md-block text-start lh-1">
              <span className="d-block small fw-semibold">{user.fullName}</span>
              <span className="small text-muted">{titleCase(user.role)}</span>
            </span>
          </button>
          {open && (
            <div className="dropdown-panel py-2">
              <Link to="/app/profile" className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={() => setOpen(false)}><FiUser /> My profile</Link>
              <button className="dropdown-item d-flex align-items-center gap-2 py-2" onClick={handleLogout}><FiLogOut /> Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
