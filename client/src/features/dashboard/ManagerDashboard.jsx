import { Link } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiCalendar, FiClock } from 'react-icons/fi';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { EmptyState } from '../../components/Feedback.jsx';
import { Panel, AnnouncementsWidget, TrainingWidget, ActivityList, PendingLeavesList } from './widgets.jsx';
import { fmtTime } from '../../utils/format.js';

export default function ManagerDashboard({ data }) {
  const t = data.today;
  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard label="Team members" value={t.totalActive} icon={FiUsers} /></div>
        <div className="col-6 col-lg-3"><StatCard label="Checked in today" value={t.checkedIn} icon={FiCheckCircle} tone="success" hint={t.isWorkday ? `${t.late} late` : 'Non-working day'} /></div>
        <div className="col-6 col-lg-3"><StatCard label="On leave today" value={t.onLeave} icon={FiCalendar} tone="info" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Awaiting your approval" value={data.pendingLeaves.count} icon={FiClock} tone="warning" /></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-7">
          <Panel title="My team today" action={<Link to="/app/employees" className="small">Manage team</Link>}>
            {!data.team.length ? <EmptyState title="No team members assigned" message="HR assigns employees to managers." /> : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Name</th><th>Status</th><th>In</th><th>Out</th></tr></thead>
                  <tbody>
                    {data.team.map((m) => (
                      <tr key={m._id}>
                        <td><Link to={`/app/employees/${m._id}`}>{m.fullName}</Link><div className="small text-muted">{m.jobTitle}</div></td>
                        <td><StatusBadge value={m.todayStatus} /></td><td>{fmtTime(m.checkIn)}</td><td>{fmtTime(m.checkOut)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        <div className="col-lg-5"><PendingLeavesList data={data.pendingLeaves} /></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4"><ActivityList items={data.recentActivity} title="Recent team activity" /></div>
        <div className="col-lg-4"><TrainingWidget items={data.upcomingTrainings} /></div>
        <div className="col-lg-4"><AnnouncementsWidget items={data.announcements} /></div>
      </div>
      <p className="small text-muted mt-3">The team leave calendar is available under <Link to="/app/leaves">Leave → Calendar</Link>.</p>
    </>
  );
}
