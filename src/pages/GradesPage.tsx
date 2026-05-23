import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, ClipboardList, Download, Filter, ArrowUpDown } from 'lucide-react';
import { toErrorMessage } from '../utils/errors';
import ErrorBanner from '../components/ErrorBanner';

interface GradeAttempt {
  _id: string;
  userId: { _id: string; name: string; email: string };
  quizId: { _id: string; title: string; topicId: string };
  score: number;
  totalPoints: number;
  submittedAt: string;
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function GradesPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [grades, setGrades] = useState<GradeAttempt[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('name'); // 'name', 'avg', or quizId
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [zeroUnattended, setZeroUnattended] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const width = useWindowWidth();
  const isMobile = width < 768;
  const isNarrow = width < 640;

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const { data } = await api.get(`/grades/classes/${classId}`);
        setGrades(data.grades || []);
        setQuizzes(data.quizzes || []);
        setMembers(data.members || []);
        setTopics(data.topics || []);
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
    if (!attempt) {
      if (zeroUnattended) {
        return { score: 0, total: 100 }; // Represents 0%
      }
      return null;
    }
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

  if (loading) {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" style={{ width: 200, marginBottom: 24 }} />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  const filteredQuizzes = quizzes.filter(q => selectedTopic === 'all' || String(q.topicId) === String(selectedTopic));

  const calculateAvg = (studentId: string) => {
    const scores = filteredQuizzes.map((q) => getScore(studentId, q._id));
    const validPcts = scores.filter((s) => s !== null).map((s) => getPercentage(s!.score, s!.total));
    if (validPcts.length === 0) return null;
    return Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length);
  };

  const students = members.map((m: any) => m.userId).filter(Boolean).sort((a: any, b: any) => {
    if (sortKey === 'name') {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? cmp : -cmp;
    } else if (sortKey === 'avg') {
      const avgA = calculateAvg(a._id);
      const avgB = calculateAvg(b._id);
      const valA = avgA !== null ? avgA : -1;
      const valB = avgB !== null ? avgB : -1;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    } else {
      const scoreA = getScore(a._id, sortKey);
      const scoreB = getScore(b._id, sortKey);
      const pctA = scoreA ? getPercentage(scoreA.score, scoreA.total) : -1;
      const pctB = scoreB ? getPercentage(scoreB.score, scoreB.total) : -1;
      return sortOrder === 'asc' ? pctA - pctB : pctB - pctA;
    }
  });

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc'); // default to desc for scores
    }
  };

  return (
    <div>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(`/classes/${classId}`)}>
        <ArrowLeft size={16} /> Kembali ke Kelas
      </button>

      <div className="page-header" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16 }}>
        <h1><ClipboardList size={28} /> Buku Nilai</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={zeroUnattended} onChange={(e) => setZeroUnattended(e.target.checked)} />
            Nolkan Kuis Tidak Diikuti
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="var(--text-tertiary)" />
            <select className="form-select" style={{ minWidth: 140 }} value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
              <option value="all">Semua Topik</option>
              {topics.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Export CSV">
            <Download size={16} />
            {!isNarrow && <span style={{ marginLeft: 6 }}>Export CSV</span>}
          </button>
        </div>
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
        <>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="gradebook-scroll-container">
              <div className="gradebook-scroll">
                <table className="gradebook-table">
                  <thead>
                    <tr>
                      <th className="gradebook-sticky-col" onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          Nama Siswa
                          {sortKey === 'name' && <ArrowUpDown size={14} color={sortOrder === 'asc' ? 'var(--primary-600)' : 'var(--text-tertiary)'} />}
                        </div>
                      </th>
                      {filteredQuizzes.map((q) => (
                        <th key={q._id} className="quiz-col" title={q.title} onClick={() => toggleSort(q._id)} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            {q.title.length > 20 ? q.title.slice(0, 20) + '…' : q.title}
                            {sortKey === q._id && <ArrowUpDown size={14} color={sortOrder === 'asc' ? 'var(--text-tertiary)' : 'var(--primary-600)'} />}
                          </div>
                        </th>
                      ))}
                      <th onClick={() => toggleSort('avg')} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          Rata-rata
                          {sortKey === 'avg' && <ArrowUpDown size={14} color={sortOrder === 'asc' ? 'var(--text-tertiary)' : 'var(--primary-600)'} />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any, i: number) => {
                      const avg = calculateAvg(student._id);
                      const scores = filteredQuizzes.map((q) => getScore(student._id, q._id));
                      const isExpanded = expandedStudentId === student._id;

                      return (
                        <React.Fragment key={student._id}>
                          <tr 
                            className="stagger-item" 
                            style={{ animationDelay: `${0.05 * i}s`, cursor: isNarrow ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (isNarrow) {
                                setExpandedStudentId(isExpanded ? null : student._id);
                              }
                            }}
                          >
                            <td className="gradebook-sticky-col">
                              <div style={{ fontWeight: 600 }}>{student.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{student.email}</div>
                              {isNarrow && (
                                <span className="mobile-expand-hint" style={{ fontSize: '0.6875rem', color: 'var(--primary-600)', display: 'block', marginTop: 4 }}>
                                  {isExpanded ? '▲ Sembunyikan' : '▼ Ketuk untuk detail'}
                                </span>
                              )}
                            </td>
                            {scores.map((s, idx) => {
                              const q = filteredQuizzes[idx];
                              if (!s) return <td key={q._id} className="score-cell score-empty quiz-col">–</td>;
                              const pct = getPercentage(s.score, s.total);
                              return (
                                <td key={q._id} className={`score-cell quiz-col ${getScoreClass(pct)}`}>
                                  <span className="score-value">{pct}%</span>
                                  <span className="score-detail">{s.score}/{s.total}</span>
                                </td>
                              );
                            })}
                            <td className={`score-cell score-avg ${avg !== null ? getScoreClass(avg) : ''}`}>
                              {avg !== null ? `${avg}%` : '–'}
                            </td>
                          </tr>
                          {isExpanded && isNarrow && (
                            <tr className="gradebook-expanded-row" style={{ background: 'var(--primary-50)' }}>
                              <td colSpan={2} style={{ padding: '16px 20px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  <h5 style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Detail Nilai Kuis:
                                  </h5>
                                  {filteredQuizzes.map((q) => {
                                    const s = getScore(student._id, q._id);
                                    const scoreStr = s ? `${s.score}/${s.total}` : '–';
                                    const pct = s ? getPercentage(s.score, s.total) : null;
                                    return (
                                      <div 
                                        key={q._id} 
                                        style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center', 
                                          fontSize: '0.8125rem',
                                          padding: '6px 0',
                                          borderBottom: '1px solid var(--border)'
                                        }}
                                      >
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{q.title}</span>
                                        <span className={`badge ${pct !== null ? getScoreClass(pct) : 'badge-gray'}`}>
                                          {pct !== null ? `${pct}% (${scoreStr})` : '–'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Scroll hint for small screens */}
          <div className="gradebook-scroll-hint">
            ← Geser untuk melihat semua kuis →
          </div>
        </>
      )}
    </div>
  );
}
