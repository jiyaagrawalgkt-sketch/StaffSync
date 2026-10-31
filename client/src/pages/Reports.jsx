import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportsApi, departmentsApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import useFetch from '../hooks/useFetch.js';
import PageHeader from '../components/PageHeader.jsx';
import ChartCard from '../components/ChartCard.jsx';
import StatCard from '../components/StatCard.jsx';
import { Loader, ErrorState } from '../components/Feedback.jsx';
import { FiAlertCircle } from 'react-icons/fi';

const STATUS_COLORS = { pending: '#f59e0b', approved: '#16a34a', rejected: '#dc2626', cancelled: '#6b7280' };

export default function Reports() {
  const { hasRole } = useAuth();
  const isHr = hasRole('hr');
  const [filters, setFilters] = useState({ from: '', to: '', department: '' });
  const { data, loading, error, reload } = useFetch(() => reportsApi.summary(filters), [filters.from, filters.to, filters.department]);
  const { data: depts } = useFetch(() => departmentsApi.list(), []);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const r = data?.data;
  const dist = r && [{ name: 'On time', value: r.attendanceDistribution.present, color: '#16a34a' }, { name: 'Late', value: r.attendanceDistribution.late, color: '#f59e0b' }];

  return (
    <>
      <PageHeader title="Reports & analytics" subtitle={isHr ? 'Organisation-wide metrics' : 'Metrics for your team'} />
      <div className="card mb-3"><div className="card-body">
        <div className="row g-2 align-items-end">
          <div className="col-md-3"><label className="form-label small" htmlFor="rf">From</label><input id="rf" type="date" className="form-control" value={filters.from} onChange={set('from')} /></div>
          <div className="col-md-3"><label className="form-label small" htmlFor="rt">To</label><input id="rt" type="date" className="form-control" value={filters.to} onChange={set('to')} /></div>
          <div className="col-md-3"><label className="form-label small" htmlFor="rd">Department</label>
            <select id="rd" className="form-select" value={filters.department} onChange={set('department')}><option value="">All departments</option>{(depts?.data || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
          <div className="col-md-3"><button className="btn btn-light w-100" onClick={() => setFilters({ from: '', to: '', department: '' })}>Reset (last 30 days)</button></div>
        </div>
        {r && <p className="small text-muted mb-0 mt-2">Showing {r.range.from} to {r.range.to}. Dates are organisation-local workdays.</p>}
      </div></div>

      {loading && !r && <Loader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {r && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-4"><StatCard label="Check-ins in period" value={r.attendanceDistribution.present + r.attendanceDistribution.late} icon={FiAlertCircle} /></div>
            <div className="col-md-4"><StatCard label="Late check-ins" value={r.attendanceDistribution.late} icon={FiAlertCircle} tone="warning" hint="After start time + grace period" /></div>
            <div className="col-md-4"><StatCard label="Missed check-outs" value={r.attendanceDistribution.missedCheckout} icon={FiAlertCircle} tone="danger" hint="Past days with no check-out" /></div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-lg-6">
              <ChartCard title="Employees by department" description="Count of active employees in each department (not date filtered)." empty={!r.employeesByDepartment.length}>
                <ResponsiveContainer><BarChart data={r.employeesByDepartment}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Employees" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="col-lg-6">
              <ChartCard title="Attendance trend" description="Check-ins per day, split by on-time and late." empty={!r.attendanceTrend.length}>
                <ResponsiveContainer><LineChart data={r.attendanceTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="present" name="On time" stroke="#16a34a" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-lg-4">
              <ChartCard title="Attendance status" description="Share of check-ins that were on time vs late." empty={!dist[0].value && !dist[1].value}>
                <ResponsiveContainer><PieChart><Pie data={dist} dataKey="value" nameKey="name" outerRadius={85} label>{dist.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="col-lg-4">
              <ChartCard title="Leave requests by status" description="Requests whose start date falls in the period." empty={!r.leavesByStatus.length}>
                <ResponsiveContainer><PieChart><Pie data={r.leavesByStatus} dataKey="count" nameKey="status" outerRadius={85} label={(e) => e.status}>{r.leavesByStatus.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="col-lg-4">
              <ChartCard title="Training enrollment" description="Latest published programs: seats taken vs capacity (0 = unlimited)." empty={!r.trainingSummary.length}>
                <ResponsiveContainer><BarChart data={r.trainingSummary} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="title" width={110} tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                  <Bar dataKey="enrolledCount" name="Enrolled" fill="#4f46e5" /><Bar dataKey="capacity" name="Capacity" fill="#c7d2fe" /></BarChart></ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
          <div className="card"><div className="card-body">
            <h2 className="h6">Department attendance summary</h2>
            <p className="small text-muted">Number of attendance records per department in the period, and the average hours between check-in and check-out (only for records that have a check-out).</p>
            {!r.departmentAttendance.length ? <p className="text-muted mb-0">No attendance data for this period.</p> : (
              <div className="table-responsive"><table className="table mb-0"><thead><tr><th>Department</th><th>Records</th><th>On time</th><th>Late</th><th>Avg hours</th></tr></thead>
                <tbody>{r.departmentAttendance.map((d) => <tr key={d.department}><td>{d.department}</td><td>{d.records}</td><td>{d.present}</td><td>{d.late}</td><td>{d.avgWorkHours}</td></tr>)}</tbody></table></div>
            )}
          </div></div>
        </>
      )}
    </>
  );
}
