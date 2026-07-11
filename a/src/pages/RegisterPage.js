import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name:'', email:'', password:'', company:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg-page)' }}>
      {/* Left panel */}
      <div style={{
        flex:1, background:'var(--bg-sidebar)', display:'flex',
        flexDirection:'column', justifyContent:'center', padding:'60px 56px',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', border:'0.5px solid rgba(124,106,247,0.12)', top:-80, right:-80, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:8, height:8, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 20px rgba(124,106,247,0.8)', top:120, left:56, pointerEvents:'none' }}/>

        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:48 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 10px rgba(124,106,247,0.7)' }}/>
            <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'#E6EEFF' }}>ChainPilot</span>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:800, color:'#E6EEFF', lineHeight:1.2, marginBottom:16 }}>
            Start in minutes.<br/>Predict in seconds.
          </h1>
          <p style={{ fontSize:14, color:'#8892A4', lineHeight:1.7, maxWidth:320 }}>
            Set up your product catalog, add your materials, upload historical usage — and let the ML engine handle the rest.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:480, display:'flex', alignItems:'center', justifyContent:'center', padding:40, background:'var(--bg-page)' }}>
        <div style={{ width:'100%', maxWidth:380 }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>
            Create account
          </h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:28 }}>
            Already have one?{' '}
            <Link to="/login" style={{ color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>Sign in</Link>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="label">Full name</label>
                <input className="input" type="text" placeholder="Parth K." value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="label">Company</label>
                <input className="input" type="text" placeholder="Acme Corp" value={form.company} onChange={set('company')} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width:'100%', justifyContent:'center', padding:'11px 0', marginTop:6, fontSize:14 }}
              disabled={loading}>
              {loading
                ? <><span className="loading-spinner" style={{ width:15, height:15 }}/> Creating…</>
                : <>Create account <i className="ti ti-arrow-right" aria-hidden="true"/></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
