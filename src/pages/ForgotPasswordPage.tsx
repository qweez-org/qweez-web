import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Mail, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengirim permintaan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon"><BookOpen size={28} /></div>
          <h1>Qweez</h1>
          <p>Atur Ulang Password</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--green-500)', marginBottom: 16 }} />
            <h3 style={{ marginBottom: 8, fontSize: '1.125rem', fontWeight: 600 }}>Permintaan terkirim</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
              Permintaan sudah diterima, tetapi reset password otomatis masih belum aktif penuh di deployment ini. Untuk sementara, hubungi admin atau pengelola sistem.
            </p>
            <Link to="/login" className="btn btn-primary">Kembali ke Login</Link>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem', color: '#9a3412' }}>
              Fitur reset password masih belum aktif penuh di deployment saat ini. Jika lupa password, sementara hubungi admin atau pembuat akun.
            </div>
            {error && (
              <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--red-500)' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type="email" className="form-input" style={{ paddingLeft: 40 }}
                    placeholder="guru@sekolah.sch.id"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Kirim Tautan Reset'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--primary-600)' }}>
            <ArrowLeft size={16} /> Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
