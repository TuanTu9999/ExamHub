// client/src/pages/RoomPage.jsx
// ── Chi tiết phòng thi ────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { roomsAPI, examsAPI, getErrorMessage } from '../api/index.js';

export default function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    roomsAPI.get(id)
      .then(res => {
        setRoom(res.data.room);
        setExams(res.data.exams);
      })
      .catch(err => {
        alert(getErrorMessage(err));
        navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const startExam = (exam) => {
    if (exam.is_premium && !user.premium) {
      alert('Đề thi này yêu cầu tài khoản Premium!');
      return;
    }
    navigate(`/exam/${exam.id}`);
  };

  if (loading) return <div className="loading-overlay show"><div className="loading-spin">⚙️</div></div>;
  if (!room) return null;

  return (
    <div id="view-room" className="view active">
      <div className="shell">
        <div className="main" style={{ marginLeft: 0 }}>
          <div className="topbar">
            <div className="tbc">
              <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', marginRight: 12 }}>←</button>
              {room.icon} {room.name}
            </div>
          </div>
          <div className="cm">
            <div className="card fi" style={{ marginBottom: 24 }}>
              <div className="card-hd">
                <div className="card-title">📋 Thông tin phòng thi</div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <p>{room.description}</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--txt2)' }}>
                  <span>📚 Môn: {room.subject}</span>
                  <span>📅 Tạo: {new Date(room.created_at).toLocaleDateString('vi-VN')}</span>
                  {room.premium && <span className="badge b-gld">⭐ Premium Room</span>}
                </div>
              </div>
            </div>

            <div className="sec-title">📄 Danh sách đề thi</div>
            {exams.length === 0 ? (
              <div className="empty"><div className="empty-ico">📄</div><div className="empty-txt">Chưa có đề thi nào trong phòng này.</div></div>
            ) : (
              <div className="rg">
                {exams.map(exam => (
                  <div key={exam.id} className="exam-card" onClick={() => startExam(exam)}>
                    <div className="exam-card-header">
                      <strong style={{ fontSize: 15 }}>{exam.name}</strong>
                      {exam.is_premium && <span className="badge b-gld" style={{ marginLeft: 8 }}>⭐ Premium</span>}
                      {exam.exam_type === 'trial' && <span className="badge b-pur" style={{ marginLeft: 8 }}>📝 Thi thử</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 6 }}>
                      ⏱️ {exam.duration_min} phút | ❓ {exam.question_count || 0} câu hỏi
                    </div>
                    {exam.description && <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 6 }}>{exam.description}</div>}
                    <div style={{ marginTop: 10 }}>
                      <button className="btn btn-p btn-sm" style={{ width: '100%' }}>Bắt đầu làm bài →</button>
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