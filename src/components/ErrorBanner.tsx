import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
  marginBottom?: number;
}

export default function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  if (!error) return null;
  
  return (
    <div className="toast-container">
      <div className="toast toast-error">
        <AlertCircle size={20} style={{ color: 'var(--red-500)', flexShrink: 0 }} />
        <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', margin: 0, fontWeight: 500, flex: 1 }}>{error}</p>
        <button className="btn btn-ghost btn-icon" onClick={onDismiss} style={{ width: 32, height: 32 }}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
