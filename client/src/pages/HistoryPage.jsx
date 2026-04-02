// client/src/pages/HistoryPage.jsx
// ── Lịch sử bài thi ──────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionsAPI, getErrorMessage } from '../api/index.js';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    submissionsAPI.myHistory()
      .then(res => setSubmissions(res.data.submissions))
      .catch(err => console.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const getScoreColor = (score) => {
    if (score >= 8) return 'var(--grn)';
    if (score >= 5) return 'var(--gold)';
    return 'var(--red)';
  };

  if (loading) return <div className="loading-overlay show"><div className="loading-spin">⚙️</div></div>;

  return (
    <div id="view-history" className="view active">
      <div className="shell">
        <div className="main" style={{ marginLeft: 0 }}>
          <div className="topbar">
            <div className="tbc">
              <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', marginRight: 12 }}>←</button>
              📋 Lịch sử thi
            </div>
          </div>
          <div className="cm">
            <div className="ph fi">
              <div className="ph-title">Lịch sử làm bài</div>
              <div className="ph-sub">Tổng số bài đã làm: {submissions.length}</div>
            </div>

            {submissions.length === 0 ? (
              <div className="empty"><div className="empty-ico">📋</div><div className="empty-txt">Bạn chưa làm bài thi nào.</div></div>
            ) : (
              <div className="el">
                {submissions.map(s => (
                  <div key={s.id} className="ei">
                    <div className="enum" style={{
                      background: s.score >= 5 ? 'var(--grn-s)' : 'var(--red-s)',
                      borderColor: s.score >= 5 ? 'var(--grn)' : 'var(--red)',
                      color: s.score >= 5 ? 'var(--grn)' : 'var(--red)'
                    }}>
                      {s.score >= 5 ? '✓' : '✗'}
                    </div>
                    <div className="einfo">
                      <div className="etitle">{s.exam_name || 'Đề thi'}</div>
                      <div className="emr">
                        <span>Điểm: <strong>{s.score}</strong></span>
                        <span>{s.correct_count}/{s.total_questions} câu đúng</span>
                        <span>⏱️ {s.time_taken}</span>
                        <span>{new Date(s.submitted_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                    <div className="esa" style={{ color: getScoreColor(s.score), fontWeight: 700, fontSize: 18 }}>
                      {s.score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}