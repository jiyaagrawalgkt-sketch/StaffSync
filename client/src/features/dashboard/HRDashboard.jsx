import { FiUsers, FiCheckCircle, FiClock, FiCalendar, FiUserX } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../../components/StatCard.jsx';
import ChartCard from '../../components/ChartCard.jsx';
import { AnnouncementsWidget, TrainingWidget, ActivityList, PendingLeavesList } from './widgets.jsx';

const COLORS = { pending: '#f59e0b', approved: '#16a34a', rejected: '#dc2626', cancelled: '#6b7280' };

export default function HRDashboard({ data }) {
  const t = data.today;
  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard label="Active employees" value={data.totalActiveEmployees} icon={FiUsers} /></div>
        <div className="col-6 col-lg-3"><StatCard label="Checked in today" value={t.checkedIn} icon={FiCheckCircle} tone="success" hint={t.isWorkday ? `${t.late} late` : 'Non-working day'} /></div>
        <div className="col-6 col-lg-3"><StatCard label="On leave / Absent" value={`${t.onLeave} / ${t.absent}`} icon={FiUserX} tone="warning" hint="Absent = not checked in, not on leave" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Pending leave requests" value={data.pendingLeaves.count} icon={FiCalendar} tone="danger" /></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <ChartCard title="Employees by department" description="Active employees grouped by department." empty={!data.employeesByDepartment.length}>
            <ResponsiveContainer>
              <BarChart data={data.employeesByDepartment}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" name="Employees" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="col-lg-6">
          <ChartCard title="Attendance, last 14 days" description="Number of check-ins per day, split into on-time and late." empty={!data.attendanceTrend.length}>
            <ResponsiveContainer>
              <BarChart data={data.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                <Bar dataKey="present" name="On time" stackId="a" fill="#16a34a" />
                <Bar dataKey="late" name="Late" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <ChartCard title="Leave requests by status" description="Requests starting in the last 30 days." empty={!data.leavesByStatus.length}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.leavesByStatus} dataKey="count" nameKey="status" outerRadius={85} label={(e) => e.status}>
                  {data.leavesByStatus.map((s) => <Cell key={s.status} fill={COLORS[s.status]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="col-lg-4"><PendingLeavesList data={data.pendingLeaves} /></div>
        <div className="col-lg-4"><ActivityList items={data.recentActivity} /></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6"><AnnouncementsWidget items={data.announcements} /></div>
        <div className="col-lg-6"><TrainingWidget items={data.upcomingTrainings} /></div>
      </div>
    </>
  );
}
