import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';
import { Loader } from '../components/Feedback.jsx';
import { NotificationProvider } from '../context/NotificationContext.jsx';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // On small screens the button opens an overlay menu; on large screens it collapses to icons.
  const toggle = () => (window.innerWidth < 992 ? setMobileOpen((o) => !o) : setCollapsed((c) => !c));

  return (
    <NotificationProvider>
      <div className="app-shell">
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        <div className={`sidebar-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />
        <div className="app-main">
          <Navbar onToggleSidebar={toggle} />
          <main className="app-content" id="main">
            <Suspense fallback={<Loader />}><Outlet /></Suspense>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
