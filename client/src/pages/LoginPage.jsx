// client/src/pages/LoginPage.jsx
// ── Trang đăng nhập / đăng ký ────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getErrorMessage } from '../api/index.js';

export default function LoginPage() {
  const { login, register, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tab,  setTab]  = useState('login');   // 'login' | 'register'
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const [suc,  setSuc]  = useState('');
  const [showPass, setShowPass] = useState(false);

  // Login form state
  const [ident, setIdent] = useState('');
  const [pass,  setPass]  = useState('');

  // Register form state
  const [reg, setReg] = useState({ name:'', username:'', email:'', password:'', role:'student' });

  // ── Đăng nhập ─────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setErr(''); setSuc('');
    if (!ident || !pass) { setErr('⚠️ Vui lòng nhập tên đăng nhập/email và mật khẩu.'); return; }
    setBusy(true);
    try {
      const user = await login(ident.trim(), pass);
      navigate(user.role === 'admin' || user.role === 'teacher' ? '/admin' : '/dashboard', { replace: true });
    } catch (ex) {
      setErr('❌ ' + getErrorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  // ── Đăng ký ───────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    setErr(''); setSuc('');
    if (!reg.name || !reg.username || !reg.email || !reg.password) {
      setErr('⚠️ Vui lòng điền đầy đủ thông tin.'); return;
    }
    if (reg.password.length < 6) { setErr('⚠️ Mật khẩu phải ≥ 6 ký tự.'); return; }
    setBusy(true);
    try {
      await register(reg);
      setSuc('✅ Đăng ký thành công! Đang chuyển về đăng nhập...');
      setIdent(reg.username);
      setTimeout(() => { setTab('login'); setSuc(''); }, 1200);
    } catch (ex) {
      setErr('❌ ' + getErrorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  // ── Đăng nhập nhanh (demo) ────────────────────────────────
  function quickLogin(role) {
    const map = {
      admin  : { ident: 'admin',   pass: 'TuanTu3008@ExamHub' },
      teacher: { ident: 'teacher', pass: 'teacher1' },
      student: { ident: 'student', pass: '123456' },
    };
    const c = map[role];
    setIdent(c.ident); setPass(c.pass);
    // submit sau 1 tick để state kịp cập nhật
    setTimeout(() => document.getElementById('login-submit-btn')?.click(), 50);
  }

  return (
    <div id="view-login" className="view active"
      style={{ flexDirection:'column', minHeight:'100vh', alignItems:'center',
               justifyContent:'center', background:'var(--bg)' }}>

      <div style={{ width:'100%', maxWidth:390, padding:20 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:48, height:48, background:'linear-gradient(135deg,var(--acc),#7c3aed)',
                        borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:22, margin:'0 auto 10px' }}>📚</div>
          <h1 style={{ fontSize:21, fontWeight:800, letterSpacing:'-.4px' }}>
            Exam<span style={{ color:'var(--acc)' }}>Hub</span>
          </h1>
          <p style={{ fontSize:12, color:'var(--txt3)', marginTop:3 }}>Hệ thống luyện thi trực tuyến</p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--bdr)',
                      borderRadius:'var(--r)', padding:3, marginBottom:16 }}>
          {['login','register'].map(t => (
            <div key={t}
              className={`login-tab${tab === t ? ' on' : ''}`}
              onClick={() => { setTab(t); setErr(''); setSuc(''); }}>
              {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </div>
          ))}
        </div>

        {/* Messages */}
        {err && <div className="err-msg" style={{ display:'block', marginBottom:10 }}>{err}</div>}
        {suc && <div className="suc-msg" style={{ display:'block', marginBottom:10 }}>{suc}</div>}

        {/* ── LOGIN FORM ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="fg">
              <label className="flabel">Tên đăng nhập / Email</label>
              <input className="finp" type="text" value={ident}
                onChange={e => setIdent(e.target.value)}
                placeholder="admin hoặc email@example.com"
                autoComplete="username" disabled={busy} />
            </div>
            <div className="fg" style={{ position:'relative' }}>
              <label className="flabel">Mật khẩu</label>
              <input className="finp" type={showPass ? 'text' : 'password'}
                value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                disabled={busy} style={{ paddingRight:44 }} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position:'absolute', right:10, bottom:10, background:'none',
                         border:'none', cursor:'pointer', fontSize:16, color:'var(--txt3)', padding:0 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            <button id="login-submit-btn" type="submit"
              className="btn btn-p btn-full btn-lg" disabled={busy}
              style={{ marginTop:2 }}>
              {busy ? '⏳ Đang đăng nhập...' : 'Đăng nhập →'}
            </button>

            {/* Quick login demo */}
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, color:'var(--txt3)', textAlign:'center', marginBottom:8 }}>
                — Đăng nhập nhanh (demo) —
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {[['student','👤','Học sinh'],['teacher','👨‍🏫','Giáo viên'],['admin','🔑','Admin']].map(
                  ([r, ic, lb]) => (
                    <button key={r} type="button" className="btn btn-g btn-sm"
                      onClick={() => quickLogin(r)}
                      style={{ fontSize:11, padding:'7px 4px' }}>
                      {ic}<br/><span style={{ fontSize:10 }}>{lb}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="fg">
              <label className="flabel">Họ và tên *</label>
              <input className="finp" value={reg.name}
                onChange={e => setReg(r => ({ ...r, name: e.target.value }))}
                placeholder="Nguyễn Văn A" disabled={busy} />
            </div>
            <div className="fg">
              <label className="flabel">Tên đăng nhập *</label>
              <input className="finp" value={reg.username}
                onChange={e => setReg(r => ({ ...r, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                placeholder="nguyenvana" autoComplete="username" disabled={busy} />
            </div>
            <div className="fg">
              <label className="flabel">Email</label>
              <input className="finp" type="email" value={reg.email}
                onChange={e => setReg(r => ({ ...r, email: e.target.value }))}
                placeholder="email@example.com" autoComplete="email" disabled={busy} />
            </div>
            <div className="fg" style={{ marginBottom:14 }}>
              <label className="flabel">
                Mật khẩu * <span style={{ color:'var(--txt3)', fontWeight:400 }}>(≥ 6 ký tự)</span>
              </label>
              <input className="finp" type="password" value={reg.password}
                onChange={e => setReg(r => ({ ...r, password: e.target.value }))}
                placeholder="••••••••" autoComplete="new-password" disabled={busy} />
            </div>
            {/* Chọn vai trò */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
              {[['student','👤','Học sinh','Tham gia phòng thi'],
                ['teacher','👨‍🏫','Giáo viên','Quản lý đề thi']].map(([r, ic, lb, desc]) => (
                <div key={r}
                  className={`role-card${reg.role === r ? ' on' : ''}`}
                  onClick={() => setReg(rv => ({ ...rv, role: r }))}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{ic}</div>
                  <div className="rc-name">{lb}</div>
                  <div className="rc-desc">{desc}</div>
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-p btn-full btn-lg" disabled={busy}>
              {busy ? '⏳ Đang đăng ký...' : 'Đăng ký →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
