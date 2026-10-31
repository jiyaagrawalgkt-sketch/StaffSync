import { useAuth } from '../context/AuthContext.jsx';
import { dashboardApi } from '../services/endpoints.js';
import useFetch from '../hooks/useFetch.js';
import PageHeader from '../components/PageHeader.jsx';
import { Loader, ErrorState } from '../components/Feedback.jsx';
import HRDashboard from '../features/dashboard/HRDashboard.jsx';
import ManagerDashboard from '../features/dashboard/ManagerDashboard.jsx';
import EmployeeDashboard from '../features/dashboard/EmployeeDashboard.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => dashboardApi.get(), []);
  const subtitle = { hr: 'Organisation overview', manager: 'Your team at a glance', employee: 'Your day at a glance' }[user.role];

  return (
    <>
      <PageHeader title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle={subtitle} />
      {loading && !data && <Loader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (data.data.role === 'hr' ? <HRDashboard data={data.data} /> : data.data.role === 'manager' ? <ManagerDashboard data={data.data} /> : <EmployeeDashboard data={data.data} />)}
    </>
  );
}
