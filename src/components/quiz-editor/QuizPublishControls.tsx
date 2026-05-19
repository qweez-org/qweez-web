import { ArrowLeft, Check, Trash2, Radio } from 'lucide-react';

interface Props {
  quiz: any;
  onNavigateBack: () => void;
  onNavigateLive: () => void;
  onToggleOpenClosed: () => void;
  onPublish: () => void;
  onDeleteQuiz: () => void;
}

export default function QuizPublishControls({
  quiz, onNavigateBack, onNavigateLive, onToggleOpenClosed, onPublish, onDeleteQuiz,
}: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <button className="btn btn-ghost btn-sm" onClick={onNavigateBack}>
        <ArrowLeft size={16} /> Kembali
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        {quiz.status !== 'draft' && quiz.mode === 'live' && (
          <button
            className="btn btn-sm"
            style={{ background: 'var(--red-50)', color: 'var(--red-500)', border: '1px solid var(--red-100)' }}
            onClick={onNavigateLive}
            title="Buka kontrol Live Quiz"
          >
            <Radio size={14} /> Live Control
          </button>
        )}

        {quiz.status !== 'draft' && (quiz.status === 'open' || quiz.status === 'closed') && quiz.mode === 'manual' && (
          <button className={`btn btn-sm ${quiz.status === 'open' ? 'btn-danger' : 'btn-primary'}`} onClick={onToggleOpenClosed}>
            {quiz.status === 'open' ? 'Tutup Kuis' : 'Buka Kuis'}
          </button>
        )}

        {quiz.status === 'draft' && (
          <>
            <button className="btn btn-danger btn-sm" onClick={onDeleteQuiz}>
              <Trash2 size={16} /> Hapus
            </button>
            <button className="btn btn-primary btn-sm" onClick={onPublish}>
              <Check size={16} /> {quiz.mode === 'live' ? 'Siapkan Live Quiz' : 'Terbitkan Kuis'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
