// client/src/pages/DashboardPage.jsx
// ── Trang chính học sinh / giáo viên ─────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../contexts/AuthContext.jsx';
import { roomsAPI, submissionsAPI, aiAPI, getErrorMessage } from '../api/index.js';

export default function DashboardPage() {
  const { user, logout, isTeacher }     = useAuth();
  const navigate                        = useNavigate();

  const [rooms,       setRooms]         = useState([]);
  const [submissions, setSubmissions]   = useState([]);
  const [tokenBal,    setTokenBal]      = useState(null);
  const [activeFilter,setFilter]        = useState('all');
  const [loading,     setLoading]       = useState(true);

  // ── Load dữ liệu ban đầu ────────────────────────────────
  useEffect(() => {
    Promise.all([
      roomsAPI.list(),
      submissionsAPI.myHistory(),
      aiAPI.tokenBalance(),
    ]).then(([rR, sR, tR]) => {
      setRooms(rR.data.rooms);
      setSubmissions(sR.data.submissions);
      setTokenBal(tR.data.unlimited ? '∞' : tR.data.tokens);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  // ── Tính thống kê ────────────────────────────────────────
  const totalDone  = submissions.length;
  const avgScore   = totalDone
    ? (submissions.reduce((s, r) => s + r.score, 0) / totalDone).toFixed(1)
    : '—';
  const accuracy   = totalDone
    ? Math.round(submissions.reduce((s,r) => s + (r.correct_count / Math.max(1, r.total_questions)), 0) / totalDone * 100) + '%'
    : '—';

  // ── Lọc phòng thi ────────────────────────────────────────
  const filtered = rooms.filter(r => {
    if (activeFilter === 'all')     return true;
    if (activeFilter === 'premium') return r.premium;
    return r.status === activeFilter;
  });

  const statusLabel = { open:'Đang mở', upcoming:'Sắp mở', closed:'Đã đóng' };
  const statusClass = { open:'b-grn',   upcoming:'b-gld',  closed:'b-red' };

  if (loading) return (
    <div className="loading-overlay show">
      <div className="loading-spin">⚙️</div>
      <div className="loading-txt">Đang tải...</div>
    </div>
  );

  return (
    <div id="view-dashboard" className="view active">
      <div className="shell">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="s-logo">
            <div className="logo-ico">📚</div>
            <div className="logo-txt">Exam<span>Hub</span></div>
          </div>
          <div className="s-sec">
            <div className="nav on"><span className="ni">🏠</span>Trang chủ</div>
            <div className="nav" onClick={() => navigate('/history')}><span className="ni">📋</span>Lịch sử thi</div>
            {isTeacher && (
              <div className="nav" onClick={() => navigate('/admin')}><span className="ni">⚙️</span>Quản trị</div>
            )}
          </div>
          <div className="s-sec">
            <div className="s-lbl">Phòng thi</div>
            {rooms.slice(0, 5).map(r => (
              <div key={r.id} className="nav" onClick={() => navigate(`/room/${r.id}`)}>
                <span className="ni">{r.icon}</span>{r.name}
              </div>
            ))}
          </div>
          <div className="s-foot">
            {/* Token widget */}
            <div className="token-widget" style={{ display:'flex', alignItems:'center',
              gap:7, padding:'8px 12px', background:'var(--bg3)',
              borderRadius:'var(--rs)', marginBottom:8, border:'1px solid var(--bdr)' }}>
              <span style={{ fontSize:13 }}>🔋</span>
              <span style={{ fontSize:12, color:'var(--txt2)' }}>Token:</span>
              <span className={`token-bal ${tokenBal === '∞' ? 'c-acc' : tokenBal < 10 ? 'c-red' : 'c-grn'}`}
                style={{ fontWeight:700, fontSize:13, fontFamily:'var(--fm)' }}>
                {tokenBal ?? '—'}
              </span>
            </div>
            <div className="umini">
              <div className="ava-s blue">{user?.initials}</div>
              <div className="umini-info">
                <div className="umini-name">{user?.name?.split(' ').at(-1)}</div>
                <div className="umini-role">{user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</div>
              </div>
              <span style={{ fontSize:11, color:'var(--txt3)', cursor:'pointer' }}
                onClick={logout} title="Đăng xuất">⏏</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="main">
          <div className="topbar">
            <div className="tbc">ExamHub</div>
            <div className="tbr"></div>
          </div>
          <div className="ca">
            <div className="cm">
              {/* Header greeting */}
              <div className="ph fi">
                <div className="ph-title" id="dash-greeting">
                  {(() => {
                    const h = new Date().getHours();
                    const g = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
                    return `${g} ${user?.name?.split(' ').at(-1)} 👋`;
                  })()}
                </div>
                <div className="ph-sub">Hôm nay bạn muốn ôn luyện gì?</div>
              </div>

              {/* Stats */}
              <div className="admin-grid fi" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:24 }}>
                {[
                  { label:'Đề đã làm',  val: totalDone,  color:'var(--acc)' },
                  { label:'Điểm TB',    val: avgScore,   color:'var(--gold)' },
                  { label:'Tỷ lệ đúng',val: accuracy,   color:'var(--grn)' },
                  { label:'Token',      val: tokenBal ?? '—', color: tokenBal === '∞' ? 'var(--acc)' : tokenBal < 10 ? 'var(--red)' : 'var(--grn)' },
                ].map(s => (
                  <div key={s.label} className="admin-stat-card">
                    <div className="asc-val" style={{ color: s.color, fontSize:26 }}>{s.val}</div>
                    <div className="asc-lbl">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Room filters */}
              <div className="chips" style={{ marginBottom:16 }}>
                {[['all','Tất cả'],['open','Đang mở'],['upcoming','Sắp mở'],['closed','Đã đóng'],['premium','Premium']].map(
                  ([f, lb]) => (
                    <div key={f} className={`chip${activeFilter === f ? ' on' : ''}`}
                      onClick={() => setFilter(f)}>{lb}</div>
                  )
                )}
              </div>

              <div className="sec-title">🚪 Phòng thi</div>
              {filtered.length === 0 ? (
                <div className="empty"><div className="empty-ico">🚪</div><div className="empty-txt">Không có phòng thi nào.</div></div>
              ) : (
                <div className="rg">
                  {filtered.map(room => (
                    <div key={room.id} className="room-card"
                      style={{ background: room.color || 'var(--acc-s)' }}
                      onClick={() => navigate(`/room/${room.id}`)}>
                      <div className="rico">{room.icon}</div>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <strong style={{ fontSize:14 }}>{room.name}</strong>
                          <span className={`badge ${statusClass[room.status] || 'b-grn'}`}>
                            {statusLabel[room.status] || room.status}
                          </span>
                          {room.premium && <span className="badge b-gld">⭐</span>}
                        </div>
                        <div style={{ fontSize:12, color:'var(--txt2)' }}>{room.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Lịch sử thi gần đây */}
              {submissions.length > 0 && (
                <>
                  <div className="sec-title" style={{ marginTop:32 }}>📋 Bài thi gần đây</div>
                  <div className="el">
                    {submissions.slice(0, 5).map(s => {
                      const good = s.score >= 7;
                      return (
                        <div key={s.id} className="ei">
                          <div className="enum"
                            style={{ background: good ? 'var(--grn-s)' : 'var(--red-s)',
                                     borderColor: good ? 'var(--grn)' : 'var(--red)',
                                     color: good ? 'var(--grn)' : 'var(--red)' }}>
                            {good ? '✓' : '✗'}
                          </div>
                          <div className="einfo">
                            <div className="etitle">{s.exam_name}</div>
                            <div className="emr">
                              <span>Điểm: <strong>{s.score}</strong></span>
                              <span>{s.correct_count}/{s.total_questions} câu đúng</span>
                              <span>{new Date(s.submitted_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                          <div className="esa" style={{ color: good ? 'var(--grn)' : 'var(--red)',
                            fontWeight:700, fontSize:18, fontFamily:'var(--fm)' }}>
                            {s.score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right panel */}
            <div className="rp">
              <div className="pc">
                <div className="uct">
                  <div className="av-lg" style={{ background:'linear-gradient(135deg,#4f8ef7,#7c3aed)' }}>
                    {user?.initials}
                  </div>
                  <div className="un-lg">{user?.name}</div>
                  <div className="ue-lg">{user?.email}</div>
                  <div className={`prem${user?.premium ? '' : ' free'}`}>
                    {user?.premium ? '⭐ Premium' : '🆓 Free'}
                  </div>
                </div>
                <div className="usg">
                  {[
                    { val: totalDone,  label:'Đề đã làm',  cls:'c-acc' },
                    { val: avgScore,   label:'Điểm TB',     cls:'c-gld' },
                    { val: accuracy,   label:'Tỷ lệ đúng',  cls:'c-grn' },
                    { val: tokenBal ?? '—', label:'Token',   cls:'c-acc' },
                  ].map(s => (
                    <div key={s.label} className="us">
                      <div className={`us-v ${s.cls}`}>{s.val}</div>
                      <div className="us-l">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
