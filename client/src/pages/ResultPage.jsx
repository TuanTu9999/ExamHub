// client/src/pages/ResultPage.jsx
// ── Kết quả sau khi làm bài ──────────────────────────────────

import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { score, correct, total, examName } = location.state || { score: 0, correct: 0, total: 0, examName: 'Bài thi' };

  const percentage = (correct / total) * 100;
  const grade = percentage >= 80 ? 'Xuất sắc' : percentage >= 60 ? 'Khá' : percentage >= 40 ? 'Trung bình' : 'Cần cải thiện';
  const gradeColor = percentage >= 80 ? 'var(--grn)' : percentage >= 60 ? 'var(--acc)' : percentage >= 40 ? 'var(--gold)' : 'var(--red)';

  return (
    <div id="view-result" className="view active">
      <div className="shell">
        <div className="main" style={{ marginLeft: 0 }}>
          <div className="topbar">
            <div className="tbc">
              <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', marginRight: 12 }}>←</button>
              📊 Kết quả bài thi
            </div>
          </div>
          <div className="cm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
            <div className="card" style={{ maxWidth: 500, textAlign: 'center' }}>
              <div className="card-hd">
                <div className="card-title">🎉 Hoàn thành!</div>
              </div>
              
              <div style={{ fontSize: 48, fontWeight: 800, color: gradeColor, margin: '20px 0' }}>
                {score}/10
              </div>
              
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
                {examName}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 12, background: 'var(--bg3)', borderRadius: 'var(--rs)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--acc)' }}>{correct}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)' }}>Số câu đúng</div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg3)', borderRadius: 'var(--rs)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--pur)' }}>{total}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)' }}>Tổng câu hỏi</div>
                </div>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <div className="badge" style={{ background: gradeColor + '20', color: gradeColor, fontSize: 14, padding: '6px 16px' }}>
                  🎯 {grade}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-g" onClick={() => navigate('/dashboard')} style={{ flex: 1 }}>
                  🏠 Về trang chủ
                </button>
                <button className="btn btn-p" onClick={() => navigate(-2)} style={{ flex: 1 }}>
                  📝 Thi lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}