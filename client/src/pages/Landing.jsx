import { Link } from 'react-router-dom';
import { FiUsers, FiClock, FiCalendar, FiBarChart2, FiShield, FiBookOpen } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  { icon: FiUsers, title: 'Employee records', text: 'Departments, managers and profiles in one secure place.' },
  { icon: FiClock, title: 'Attendance', text: 'One-click check-in and check-out with clear, enforced rules.' },
  { icon: FiCalendar, title: 'Leave management', text: 'Apply, approve and track balances without spreadsheets.' },
  { icon: FiBookOpen, title: 'Training', text: 'Publish programs and let employees enroll in seconds.' },
  { icon: FiBarChart2, title: 'Reports', text: 'Live analytics calculated from your real data.' },
  { icon: FiShield, title: 'Role-based security', text: 'HR, managers and employees only see what they should.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div>
      <section className="hero py-5">
        <div className="container py-5">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <span className="fs-4 fw-bold"><FiUsers className="me-2" />StaffSync</span>
            <Link to={user ? '/app/dashboard' : '/login'} className="btn btn-light">{user ? 'Open dashboard' : 'Log in'}</Link>
          </div>
          <div className="row align-items-center">
            <div className="col-lg-7">
              <h1 className="display-4 fw-bold">Human resources, without the spreadsheets.</h1>
              <p className="lead opacity-75 my-4">StaffSync brings attendance, leave, announcements, training and reports into one modern workspace for HR, managers and employees.</p>
              <Link to={user ? '/app/dashboard' : '/login'} className="btn btn-light btn-lg me-2">Get started</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="container py-5">
        <h2 className="text-center mb-4">Everything your team needs</h2>
        <div className="row g-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div className="col-md-6 col-lg-4" key={title}>
              <div className="card h-100"><div className="card-body">
                <div className="feature-icon mb-3"><Icon aria-hidden="true" /></div>
                <h3 className="h5">{title}</h3><p className="text-muted mb-0">{text}</p>
              </div></div>
            </div>
          ))}
        </div>
      </section>
         <footer className="text-center text-muted small py-4">StaffSync · Built by Jiya Agrawal</footer>
    </div>
  );
}
