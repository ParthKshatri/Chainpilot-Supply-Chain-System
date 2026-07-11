import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', background:'var(--bg-page)',
    }}>
      {/* Left panel */}
      <div style={{
        flex:1, background:'var(--bg-sidebar)', display:'flex',
        flexDirection:'column', justifyContent:'center', padding:'60px 56px',
        position:'relative', overflow:'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', border:'0.5px solid rgba(124,106,247,0.12)', top:-80, right:-80, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:'0.5px solid rgba(124,106,247,0.08)', bottom:40, left:40, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:8, height:8, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 20px rgba(124,106,247,0.8)', top:120, left:56, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:5, height:5, borderRadius:'50%', background:'#10A37F', boxShadow:'0 0 14px rgba(16,163,127,0.8)', bottom:160, right:80, pointerEvents:'none' }}/>

        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:48 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 10px rgba(124,106,247,0.7)' }}/>
            <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'#E6EEFF' }}>ChainPilot</span>
          </div>

          <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:800, color:'#E6EEFF', lineHeight:1.15, marginBottom:16 }}>
            Your supply chain,<br/>under control.
          </h1>
          <p style={{ fontSize:14, color:'#8892A4', lineHeight:1.7, maxWidth:320 }}>
            Predict stockouts before they happen. Track materials, log usage, and let ML tell you exactly when to reorder.
          </p>

          <div style={{ marginTop:40, display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { icon:'ti-sparkles',       text:'ML-powered demand forecasting' },
              { icon:'ti-calendar-event', text:'Auto-scheduled resupply calendar' },
              { icon:'ti-stack-2',        text:'Real-time multi-material inventory' },
            ].map(f => (
              <div key={f.text} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:32, height:32, borderRadius:8, flexShrink:0,
                  background:'rgba(124,106,247,0.12)', border:'0.5px solid rgba(124,106,247,0.2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <i className={`ti ${f.icon}`} style={{ fontSize:16, color:'var(--accent)' }} aria-hidden="true"/>
                </div>
                <span style={{ fontSize:13, color:'#8892A4' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        width:460, display:'flex', alignItems:'center', justifyContent:'center',
        padding:40, background:'var(--bg-page)',
      }}>
        <div style={{ width:'100%', maxWidth:360 }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>
            Sign in
          </h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:28 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>Create one</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@company.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width:'100%', justifyContent:'center', padding:'11px 0', marginTop:6, fontSize:14 }}
              disabled={loading}>
              {loading
                ? <><span className="loading-spinner" style={{ width:15, height:15 }}/> Signing in…</>
                : <>Sign in <i className="ti ti-arrow-right" aria-hidden="true"/></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
