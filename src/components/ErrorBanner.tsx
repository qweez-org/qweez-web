import React from 'react';

interface ErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
  marginBottom?: number;
}

export default function ErrorBanner({ error, onDismiss, marginBottom = 16 }: ErrorBannerProps) {
  if (!error) return null;
  
  return (
    <div className="card" style={{ marginBottom, border: '1px solid var(--red-200)', background: 'var(--red-50)' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>{error}</p>
        <button className="btn btn-ghost btn-sm" onClick={onDismiss} style={{ color: 'var(--red-700)' }}>
          Tutup
        </button>
      </div>
    </div>
  );
}
