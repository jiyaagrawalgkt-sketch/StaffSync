import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// A small accessible modal: closes with Esc or a click on the backdrop, and locks page scrolling.
export default function Modal({ show, title, onClose, children, footer, size = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!show) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [show, onClose]);

  if (!show) return null;
  return createPortal(
    <>
      <div className="modal d-block" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ overflowY: 'auto', outline: 'none' }}>
        <div className={`modal-dialog modal-dialog-centered ${size}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5">{title}</h2>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>,
    document.body
  );
}
