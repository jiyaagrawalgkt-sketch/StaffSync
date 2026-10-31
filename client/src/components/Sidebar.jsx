import { NavLink } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { NAV_ITEMS } from '../utils/navigation.js';

export default function Sidebar({ collapsed, mobileOpen, onNavigate }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand"><FiUsers size={24} /><span className="brand-text">StaffSync</span></div>
      <nav>
        <ul className="nav flex-column">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={label} className="nav-item">
              <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onNavigate} title={label}>
                <Icon className="nav-icon" aria-hidden="true" /><span className="nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
