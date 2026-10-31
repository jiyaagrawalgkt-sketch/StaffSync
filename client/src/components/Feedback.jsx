import { FiInbox, FiAlertTriangle } from 'react-icons/fi';

export function Loader({ label = 'Loading...', fullPage = false }) {
  return (
    <div className={`d-flex flex-column align-items-center justify-content-center text-muted ${fullPage ? 'vh-100' : 'py-5'}`} role="status">
      <div className="spinner-border text-primary mb-2" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
      <span><FiAlertTriangle className="me-2" />{message}</span>
      {onRetry && <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, children }) {
  return (
    <div className="text-center text-muted py-5">
      <FiInbox size={36} className="mb-2" />
      <h6 className="mb-1">{title}</h6>
      {message && <p className="small mb-2">{message}</p>}
      {children}
    </div>
  );
}
