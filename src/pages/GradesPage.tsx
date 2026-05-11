import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, ClipboardList, Download } from 'lucide-react';

interface GradeAttempt {
  _id: string;
  userId: { _id: string; name: string; email: string };
  quizId: { _id: string; title: string; topicId: string };
  score: number;
  totalPoints: number;
  submittedAt: string;
}

export default function GradesPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [grades, setGrades] = useState<GradeAttempt[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toErrorMessage = (e: any) => {
    return e?.response?.data?.message || e?.message || 'Terjadi kesalahan';
  };

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const { data } = await api.get(`/grades/classes/${classId}`);
        setGrades(data.grades || []);
        setQuizzes(data.quizzes || []);
        setMembers(data.members || []);
      } catch (e: any) {
        setError(toErrorMessage(e));
      }
      setLoading(false);
    };
    load();
  }, [classId]);

  const getScore = (studentId: string, quizId: string) => {
    const attempt = grades.find(
      (g) => (g.userId as any)?._id === studentId && (g.quizId as any)?._id === quizId
    );
    if (!attempt) return null;
    return { score: attempt.score ?? 0, total: attempt.totalPoints ?? 0 };
  };

  const getPercentage = (score: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  };

  const getScoreClass = (pct: number) => {
    if (pct >= 80) return 'score-high';
    if (pct >= 60) return 'score-mid';
    return 'score-low';
  };

  const handleExport = async () => {
    try {
      setError(null);
      const response = await api.get(`/export/classes/${classId}/export/grades`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `gradebook-${classId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(toErrorMessage(e));
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const students = members.map((m: any) => m.userId).filter(Boolean);

  return (
    <div>
      {error && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid var(--red-200)', background: 'var(--red-50)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Tutup</button>
          </div>
        </div>
      )}

      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(`/classes/${classId}`)}>
        <ArrowLeft size={16} /> Kembali ke Kelas
      </button>

      <div className="page-header">
        <h1><ClipboardList size={28} /> Buku Nilai</h1>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {students.length === 0 || quizzes.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon"><ClipboardList size={36} /></div>
            <h3>Belum ada data nilai</h3>
            <p>Nilai akan muncul setelah siswa mengerjakan kuis.</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="gradebook-scroll">
            <table className="gradebook-table">
              <thead>
                <tr>
                  <th className="gradebook-sticky-col">Nama Siswa</th>
                  {quizzes.map((q) => (
                    <th key={q._id} title={q.title}>
                      {q.title.length > 20 ? q.title.slice(0, 20) + '…' : q.title}
                    </th>
                  ))}
                  <th>Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student: any) => {
                  const scores = quizzes.map((q) => getScore(student._id, q._id));
                  const validPcts = scores.filter((s) => s !== null).map((s) => getPercentage(s!.score, s!.total));
                  const avg = validPcts.length > 0 ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length) : null;

                  return (
                    <tr key={student._id}>
                      <td className="gradebook-sticky-col">
                        <div style={{ fontWeight: 600 }}>{student.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{student.email}</div>
                      </td>
                      {scores.map((s, i) => {
                        if (!s) return <td key={i} className="score-cell score-empty">–</td>;
                        const pct = getPercentage(s.score, s.total);
                        return (
                          <td key={i} className={`score-cell ${getScoreClass(pct)}`}>
                            <span className="score-value">{pct}</span>
                            <span className="score-detail">{s.score}/{s.total}</span>
                          </td>
                        );
                      })}
                      <td className={`score-cell score-avg ${avg !== null ? getScoreClass(avg) : ''}`}>
                        {avg !== null ? `${avg}%` : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
