import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const iconColors = {
    danger: 'var(--red-500, #ef4444)',
    warning: 'var(--amber-500, #f59e0b)',
    info: 'var(--primary-500)',
  };

  const btnClass = variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {variant === 'info' ? (
              <Info size={22} style={{ color: iconColors[variant], flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={22} style={{ color: iconColors[variant], flexShrink: 0 }} />
            )}
            {title}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={btnClass} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
