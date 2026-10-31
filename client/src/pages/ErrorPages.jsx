import { Link } from 'react-router-dom';

function Page({ code, title, message }) {
  return (
    <div className="auth-page text-center">
      <div>
        <div className="display-1 fw-bold text-brand">{code}</div>
        <h1 className="h3">{title}</h1>
        <p className="text-muted">{message}</p>
        <Link to="/app/dashboard" className="btn btn-primary">Go to dashboard</Link>
      </div>
    </div>
  );
}

export const Unauthorized = () => <Page code="403" title="Access denied" message="You do not have permission to view this page." />;
export const NotFound = () => <Page code="404" title="Page not found" message="The page you are looking for does not exist." />;
