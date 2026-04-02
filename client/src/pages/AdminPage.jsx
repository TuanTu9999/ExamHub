// client/src/pages/AdminPage.jsx
// ── Trang quản trị: Dashboard, Người dùng, Token, API ────────

import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { adminAPI, roomsAPI, examsAPI, questionsAPI, getErrorMessage } from '../api/index.js';

// ── Sidebar Admin ─────────────────────────────────────────────
function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navs = [
    { to: '/admin',            label: 'Dashboard',          icon: '📊', end: true },
    { to: '/admin/rooms',      label: 'Quản lý phòng thi',  icon: '🚪' },
    { to: '/admin/exams',      label: 'Quản lý đề thi',     icon: '📄' },
    { to: '/admin/questions',  label: 'Ngân hàng câu hỏi',  icon: '❓' },
    { to: '/admin/users',      label: 'Quản lý người dùng', icon: '👥' },
    { to: '/admin/token-costs',label: 'Cài đặt Token AI',   icon: '🔋' },
    { to: '/admin/api',        label: 'Quản lý API',        icon: '🔑' },
  ];

  return (
    <aside className="sidebar">
      <div className="s-logo">
        <div className="logo-ico" style={{ background:'linear-gradient(135deg,#f87171,#f43f5e)' }}>⚙️</div>
        <div className="logo-txt">Exam<span style={{ color:'var(--red)' }}>Admin</span></div>
      </div>
      <div className="s-sec">
        <div className="s-lbl">Quản trị</div>
        {navs.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `nav${isActive ? ' on' : ''}`}>
            <span className="ni">{n.icon}</span>{n.label}
          </NavLink>
        ))}
      </div>
      <div className="s-foot">
        <div className="umini">
          <div className="ava-s red">{user?.initials}</div>
          <div className="umini-info">
            <div className="umini-name">{user?.name}</div>
            <div className="umini-role">Quản trị viên</div>
          </div>
          <span style={{ fontSize:11, color:'var(--txt3)', cursor:'pointer' }}
            onClick={logout} title="Đăng xuất">⏏</span>
        </div>
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ════════════════════════════════════════════════════════════
function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    adminAPI.stats().then(r => setStats(r.data.stats)).catch(() => {});
  }, []);

  const cards = [
    { icon:'🚪', val: stats?.rooms,       label:'Phòng thi',    color:'var(--acc)', bg:'var(--acc-s)' },
    { icon:'📄', val: stats?.exams,       label:'Đề thi',       color:'var(--grn)', bg:'var(--grn-s)' },
    { icon:'❓', val: stats?.questions,   label:'Câu hỏi',      color:'var(--pur)', bg:'var(--pur-s)' },
    { icon:'👥', val: stats?.users,       label:'Học sinh',     color:'var(--gold)',bg:'var(--gold-s)' },
  ];

  return (
    <div className="cm">
      <div className="ph fi"><div className="ph-title">Admin Dashboard ⚙️</div><div className="ph-sub">Quản lý toàn bộ hệ thống ExamHub</div></div>
      <div className="admin-grid fi">
        {cards.map(c => (
          <div key={c.label} className="admin-stat-card">
            <div className="asc-ico" style={{ background: c.bg }}>{c.icon}</div>
            <div className="asc-val" style={{ color: c.color }}>{stats ? c.val : '—'}</div>
            <div className="asc-lbl">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  QUẢN LÝ NGƯỜI DÙNG
// ════════════════════════════════════════════════════════════
function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState({ text:'', ok: true });

  // Form tạo mới
  const [form, setForm] = useState({ name:'', username:'', email:'', password:'', role:'student', tokens:50, premium:false });
  // Form cấp quyền
  const [grantIdent,   setGrantIdent]   = useState('');
  const [grantAmount,  setGrantAmount]  = useState(100);
  const [grantDays,    setGrantDays]    = useState(30);

  const notice = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text:'', ok:true }), 3000); };

  const loadUsers = useCallback(() => {
    setLoading(true);
    adminAPI.users()
      .then(r => setUsers(r.data.users))
      .catch(e => notice('❌ ' + getErrorMessage(e), false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadUsers, [loadUsers]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) { notice('⚠️ Điền đủ Tên, Username, Mật khẩu.', false); return; }
    try {
      const r = await adminAPI.createUser(form);
      notice('✅ ' + r.data.message);
      setForm({ name:'', username:'', email:'', password:'', role:'student', tokens:50, premium:false });
      loadUsers();
    } catch (e) { notice('❌ ' + getErrorMessage(e), false); }
  }

  async function handleGrantTokens() {
    if (!grantIdent) { notice('⚠️ Nhập tên đăng nhập.', false); return; }
    try {
      const r = await adminAPI.grantTokens(grantIdent, Number(grantAmount));
      notice('✅ ' + r.data.message); loadUsers();
    } catch (e) { notice('❌ ' + getErrorMessage(e), false); }
  }

  async function handleGrantPremium(grant) {
    if (!grantIdent) { notice('⚠️ Nhập tên đăng nhập.', false); return; }
    try {
      const r = await adminAPI.grantPremium(grantIdent, grant, Number(grantDays));
      notice('✅ ' + r.data.message); loadUsers();
    } catch (e) { notice('❌ ' + getErrorMessage(e), false); }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Vô hiệu hóa tài khoản "${name}"?`)) return;
    try {
      await adminAPI.deleteUser(id);
      notice(`✅ Đã vô hiệu hóa ${name}.`); loadUsers();
    } catch (e) { notice('❌ ' + getErrorMessage(e), false); }
  }

  const roleClass = r => r === 'admin' ? 'b-red' : r === 'teacher' ? 'b-pur' : 'b-acc';
  const roleLabel = r => r === 'admin' ? 'Admin' : r === 'teacher' ? 'Giáo viên' : 'Học sinh';

  return (
    <div className="cm">
      <div className="ph fi"><div className="ph-title">Quản lý người dùng 👥</div></div>

      {msg.text && (
        <div className="fi" style={{ padding:'10px 14px', borderRadius:'var(--r)', marginBottom:14,
          background: msg.ok ? 'var(--grn-s)' : 'var(--red-s)',
          color: msg.ok ? 'var(--grn)' : 'var(--red)',
          border: `1px solid ${msg.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
          fontWeight:600, fontSize:13 }}>
          {msg.text}
        </div>
      )}

      {/* ── Tạo tài khoản mới ── */}
      <div className="card fi" style={{ marginBottom:18 }}>
        <div className="card-hd"><div className="card-title">➕ Tạo tài khoản mới</div></div>
        <form onSubmit={handleCreate}>
          <div className="fg-row">
            <div className="fg"><label>Họ tên *</label><input className="finp" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Nguyễn Văn A"/></div>
            <div className="fg"><label>Username *</label><input className="finp" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value.toLowerCase().replace(/\s/g,'')}))} placeholder="nguyenvana"/></div>
          </div>
          <div className="fg-row">
            <div className="fg"><label>Email</label><input className="finp" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@example.com"/></div>
            <div className="fg"><label>Mật khẩu *</label><input className="finp" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="≥ 6 ký tự"/></div>
          </div>
          <div className="fg-row">
            <div className="fg"><label>Vai trò</label>
              <select className="finp" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                <option value="student">👤 Học sinh</option>
                <option value="teacher">👨‍🏫 Giáo viên</option>
              </select>
            </div>
            <div className="fg"><label>Token khởi tạo</label><input className="finp" type="number" value={form.tokens} min={0} onChange={e => setForm(f=>({...f,tokens:e.target.value}))}/></div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <input type="checkbox" id="nu-premium" style={{ width:'auto' }} checked={form.premium} onChange={e => setForm(f=>({...f,premium:e.target.checked}))}/>
            <label htmlFor="nu-premium" style={{ marginBottom:0, cursor:'pointer' }}>⭐ Cấp Premium ngay (30 ngày)</label>
          </div>
          <button type="submit" className="btn btn-p">➕ Tạo tài khoản</button>
        </form>
      </div>

      {/* ── Cấp token / premium theo username ── */}
      <div className="card fi" style={{ marginBottom:18 }}>
        <div className="card-hd"><div className="card-title">🔋 Cấp Token / Premium theo tên đăng nhập</div></div>
        <div className="fg-row">
          <div className="fg"><label>Tên đăng nhập / Email</label><input className="finp" value={grantIdent} onChange={e => setGrantIdent(e.target.value)} placeholder="nguyenvana hoặc email@..."/></div>
          <div className="fg"><label>Số token cấp thêm</label><input className="finp" type="number" value={grantAmount} min={1} onChange={e => setGrantAmount(e.target.value)}/></div>
        </div>
        <div style={{ display:'flex', gap:9, flexWrap:'wrap', marginBottom:10 }}>
          <button className="btn btn-p btn-sm" onClick={handleGrantTokens}>🔋 Cấp Token</button>
          <button className="btn btn-g btn-sm" onClick={() => handleGrantPremium(true)}>⭐ Cấp Premium</button>
          <button className="btn btn-r btn-sm" onClick={() => handleGrantPremium(false)}>❌ Thu hồi Premium</button>
        </div>
        <div className="fg-row">
          <div className="fg"><label>Số ngày gia hạn Premium</label><input className="finp" type="number" value={grantDays} min={1} onChange={e => setGrantDays(e.target.value)}/></div>
          <div className="fg" style={{ display:'flex', alignItems:'flex-end' }}>
            <button className="btn btn-pur btn-sm" style={{ width:'100%' }} onClick={() => handleGrantPremium(true)}>📅 Gia hạn Premium</button>
          </div>
        </div>
      </div>

      {/* ── Danh sách người dùng ── */}
      <div className="tbl-wrap fi">
        <div className="tbl-hd">
          <div className="tbl-hd-title">Danh sách tài khoản ({users.length})</div>
          <button className="btn btn-g btn-sm" onClick={loadUsers}>🔄 Làm mới</button>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:24, color:'var(--txt3)' }}>⏳ Đang tải...</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>#</th><th>Tên</th><th>Username</th><th>Email</th><th>Vai trò</th><th>Premium</th><th>Token</th><th>Thao tác</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>#{u.id}</strong></td>
                  <td>{u.name}</td>
                  <td style={{ fontFamily:'var(--fm)', fontSize:12 }}>{u.username || '—'}</td>
                  <td style={{ fontSize:11, color:'var(--txt3)' }}>{u.email}</td>
                  <td><span className={`badge ${roleClass(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td>{u.premium ? <span className="badge b-gld">⭐ Premium</span> : <span className="badge">Free</span>}</td>
                  <td style={{ fontWeight:700 }}>{u.role === 'admin' ? '∞' : u.tokens}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <button className="btn btn-r btn-sm" onClick={() => handleDelete(u.id, u.name)}>🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  CÀI ĐẶT TOKEN COSTS
// ════════════════════════════════════════════════════════════
function AdminTokenCosts() {
  const [costs,     setCosts]     = useState({});
  const [genFactor, setGenFactor] = useState(8);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');

  const FEATURES = [
    { key:'hint',              label:'💡 Gợi ý bài thi' },
    { key:'explain_answer',    label:'🤖 Giải thích đáp án' },
    { key:'analyze_exam',      label:'📄 Phân tích đề' },
    { key:'explain_result',    label:'📊 Phân tích kết quả' },
    { key:'study_suggestion',  label:'💬 Gợi ý học tập' },
    { key:'format_check',      label:'🔍 Kiểm tra format' },
  ];

  useEffect(() => {
    adminAPI.getTokenCosts().then(r => {
      const data = r.data.costs;
      const flat = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.cost]));
      setCosts(flat);
      // Tính hệ số từ generate_questions (cost = factor × 5)
      if (data.generate_questions) setGenFactor(Math.round(data.generate_questions.cost / 5));
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await adminAPI.saveTokenCosts(costs, genFactor);
      setMsg('✅ Đã lưu cài đặt chi phí token!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('❌ ' + getErrorMessage(e));
    } finally { setSaving(false); }
  }

  return (
    <div className="cm">
      <div className="ph fi"><div className="ph-title">Cài đặt Token AI 🔋</div><div className="ph-sub">Điều chỉnh chi phí token cho từng tính năng AI</div></div>

      {msg && <div className="fi" style={{ padding:'10px 14px', borderRadius:'var(--r)', marginBottom:14,
        background: msg.startsWith('✅') ? 'var(--grn-s)' : 'var(--red-s)',
        color: msg.startsWith('✅') ? 'var(--grn)' : 'var(--red)',
        fontWeight:600, fontSize:13, border:`1px solid ${msg.startsWith('✅')?'rgba(34,197,94,.3)':'rgba(239,68,68,.3)'}` }}>
        {msg}
      </div>}

      <div className="card fi" style={{ marginBottom:18 }}>
        <div className="card-hd">
          <div className="card-title">⚙️ Chi phí token các tính năng</div>
          <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
          </button>
        </div>
        <div style={{ fontSize:12, color:'var(--txt2)', marginBottom:12 }}>
          Admin có token không giới hạn. Học sinh mặc định 50 token, Giáo viên 200 token.
        </div>
        <div className="fg-row" style={{ flexWrap:'wrap' }}>
          {FEATURES.map(f => (
            <div className="fg" key={f.key} style={{ minWidth:180 }}>
              <label>{f.label}</label>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input className="finp" type="number" min={0} value={costs[f.key] ?? 0}
                  onChange={e => setCosts(c => ({ ...c, [f.key]: Number(e.target.value) }))}
                  style={{ width:80 }}/>
                <span style={{ fontSize:12, color:'var(--txt3)' }}>token</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hệ số sinh câu hỏi */}
        <div style={{ marginTop:16, padding:'12px 14px', background:'var(--acc-s)', borderRadius:'var(--rs)',
                      border:'1px solid rgba(79,142,247,.2)' }}>
          <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>✨ Hệ số sinh câu hỏi AI</div>
          <div style={{ fontSize:12, color:'var(--txt2)', marginBottom:10 }}>
            Token tính tự động = số câu × hệ số. Ví dụ: 10 câu × {genFactor} = <strong style={{ color:'var(--acc)' }}>{10 * genFactor}</strong> token
          </div>
          <div className="fg-row">
            <div className="fg">
              <label>Hệ số mỗi câu</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input className="finp" type="number" min={1} max={50} value={genFactor}
                  onChange={e => setGenFactor(Number(e.target.value))} style={{ width:80 }}/>
                <span style={{ fontSize:12, color:'var(--txt3)' }}>token/câu</span>
              </div>
            </div>
            <div className="fg" style={{ display:'flex', alignItems:'flex-end' }}>
              <div style={{ padding:'10px 13px', background:'var(--bg3)', borderRadius:'var(--rs)',
                            fontSize:12, border:'1px solid var(--bdr)', width:'100%' }}>
                5 câu = <strong style={{ color:'var(--acc)' }}>{5 * genFactor}</strong> token
                &nbsp;|&nbsp; 10 câu = <strong style={{ color:'var(--acc)' }}>{10 * genFactor}</strong> token
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PLACEHOLDER views (Rooms, Exams, Questions, API)
//  → Mở rộng tương tự AdminUsers
// ════════════════════════════════════════════════════════════
function Placeholder({ title }) {
  return (
    <div className="cm">
      <div className="ph fi"><div className="ph-title">{title}</div><div className="ph-sub">Đang phát triển...</div></div>
      <div className="card fi" style={{ padding:32, textAlign:'center', color:'var(--txt3)' }}>
        🚧 Tính năng này sẽ được hoàn thiện trong phiên bản tiếp theo.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ADMIN PAGE LAYOUT (sidebar + nested routes)
// ════════════════════════════════════════════════════════════
export default function AdminPage() {
  return (
    <div id="view-admin" className="view active">
      <div className="shell">
        <AdminSidebar />
        <div className="main">
          <div className="topbar">
            <div className="tbc">ExamAdmin</div>
            <div className="tbr"></div>
          </div>
          <Routes>
            <Route index                    element={<AdminDashboard />} />
            <Route path="users"             element={<AdminUsers />} />
            <Route path="token-costs"       element={<AdminTokenCosts />} />
            <Route path="rooms"             element={<Placeholder title="Quản lý phòng thi 🚪"/>} />
            <Route path="exams"             element={<Placeholder title="Quản lý đề thi 📄"/>} />
            <Route path="questions"         element={<Placeholder title="Ngân hàng câu hỏi ❓"/>} />
            <Route path="api"               element={<Placeholder title="Quản lý API 🔑"/>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
