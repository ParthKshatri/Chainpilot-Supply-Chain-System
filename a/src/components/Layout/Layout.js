import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/',            icon: 'ti-layout-dashboard', label: 'Dashboard',   exact: true },
  { to: '/products',    icon: 'ti-package',           label: 'Products'               },
  { to: '/inventory',   icon: 'ti-stack-2',           label: 'Inventory'              },
  { to: '/predictions', icon: 'ti-sparkles',          label: 'Predictions'            },
  { to: '/calendar',    icon: 'ti-calendar-event',    label: 'Calendar'               },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'U';

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 60 : 220,
        background: 'var(--bg-sidebar)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0, overflow: 'hidden',
        borderRight: '0.5px solid rgba(255,255,255,0.05)',
      }}>

        {/* Logo row */}
        <div style={{
          padding: collapsed ? '20px 0 16px' : '20px 16px 16px',
          borderBottom: '0.5px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{
                width:8, height:8, borderRadius:'50%', background:'var(--accent)',
                boxShadow:'0 0 8px rgba(124,106,247,0.6)'
              }}/>
              <span style={{
                fontFamily:'var(--font-display)', fontSize:16, fontWeight:800,
                color:'#E6EEFF', letterSpacing:'0.01em'
              }}>ChainPilot</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.08)',
            color:'#8892A4', padding:'5px 7px', borderRadius:6, cursor:'pointer', fontSize:13,
            flexShrink:0, lineHeight:1
          }}>
            <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-left'}`} aria-hidden="true"/>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          {NAV.map(({ to, icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:9,
              padding: collapsed ? '10px 0' : '9px 11px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius:8, textDecoration:'none', fontSize:13, fontWeight:500,
              transition:'all 0.14s',
              background: isActive ? 'var(--accent-sidebar-bg)' : 'transparent',
              color: isActive ? 'var(--text-sidebar-active)' : 'var(--text-sidebar)',
              border: isActive ? '0.5px solid var(--accent-sidebar-border)' : '0.5px solid transparent',
            })}>
              <i className={`ti ${icon}`} style={{ fontSize:17, flexShrink:0 }} aria-hidden="true"/>
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{
          padding: collapsed ? '12px 0' : '12px 10px',
          borderTop:'0.5px solid rgba(255,255,255,0.05)',
          display:'flex', alignItems:'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap:9
        }}>
          <div style={{
            width:32, height:32, borderRadius:'50%', flexShrink:0,
            background:'rgba(124,106,247,0.2)', border:'1px solid rgba(124,106,247,0.35)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#B5ADFF'
          }}>{initials}</div>
          {!collapsed && (
            <>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#C8D0E0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
                <div style={{ fontSize:10, color:'#5A6478', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.company || user?.email}</div>
              </div>
              <button onClick={handleLogout} title="Logout" style={{
                background:'none', border:'none', color:'#5A6478',
                cursor:'pointer', fontSize:16, padding:3, flexShrink:0, lineHeight:1
              }}>
                <i className="ti ti-logout" aria-hidden="true"/>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, overflow:'auto', background:'var(--bg-page)' }}>
        <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
