import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { materialsAPI, productsAPI, predictionsAPI } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'0 4px 16px rgba(26,16,51,0.12)' }}>
        <div style={{ color:'var(--text-secondary)', marginBottom:3 }}>{label}</div>
        <div style={{ fontWeight:600, color:'var(--accent)' }}>{payload[0].value}%</div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([materialsAPI.getAll(), productsAPI.getAll(), predictionsAPI.getAll()])
      .then(([m, p, pred]) => {
        setMaterials(m.data.data || []);
        setProducts(p.data.data || []);
        setPredictions(pred.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const criticalMaterials = materials.filter(m =>
    m.totalStorageCapacity > 0 && (m.currentStock / m.totalStorageCapacity) * 100 < 20
  );

  const upcomingResupplies = predictions
    .filter(p => p.recommendedResupplyDate)
    .sort((a, b) => new Date(a.recommendedResupplyDate) - new Date(b.recommendedResupplyDate))
    .slice(0, 5);

  const stockData = materials.slice(0, 7).map(m => ({
    name: m.name.length > 11 ? m.name.slice(0, 11) + '…' : m.name,
    stock: m.totalStorageCapacity > 0 ? Math.round((m.currentStock / m.totalStorageCapacity) * 100) : 0,
  }));

  const getBarColor = (v) => v < 20 ? '#DC2626' : v < 50 ? '#D97706' : '#7C6AF7';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="loading-spinner" style={{ width:36, height:36 }} />
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--text-primary)' }}>
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:3 }}>
          Here's your supply chain at a glance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          { label:'Products',    value:products.length,        sub:`${products.filter(p=>p.isActive).length} active`,        cls:'purple' },
          { label:'Materials',   value:materials.length,       sub:`${criticalMaterials.length} critical`,                   cls:'teal'   },
          { label:'Predictions', value:predictions.length,     sub:'ML-powered forecasts',                                   cls:'amber'  },
          { label:'Low Stock',   value:criticalMaterials.length, sub:criticalMaterials.length>0?'Needs attention':'All good!', cls:'red'   },
        ].map(k => (
          <div key={k.label} className={`stat-card ${k.cls}`}>
            <div className="stat-label">{k.label}</div>
            <div className="stat-value">{k.value}</div>
            <div className="stat-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        {/* Stock bar chart */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Stock Levels</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:1 }}>% of total capacity</div>
            </div>
            <div style={{ display:'flex', gap:12, fontSize:10, color:'var(--text-muted)' }}>
              {[['#DC2626','Critical'],['#D97706','Low'],['#7C6AF7','Good']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:c }}/>
                  {l}
                </div>
              ))}
            </div>
          </div>
          {stockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={stockData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill:'var(--text-secondary)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-secondary)', fontSize:10 }} axisLine={false} tickLine={false} domain={[0,100]} tickFormatter={v=>`${v}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(124,106,247,0.05)' }} />
                <Bar dataKey="stock" radius={[5,5,0,0]}>
                  {stockData.map((entry, i) => (
                    <Cell key={i} fill={getBarColor(entry.stock)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height:190, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-chart-bar" style={{ fontSize:32, color:'var(--text-muted)', marginBottom:10 }} aria-hidden="true"/>
              <p style={{ fontSize:13, color:'var(--text-secondary)' }}>No materials tracked yet</p>
            </div>
          )}
        </div>

        {/* Upcoming resupplies */}
        <div className="card">
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:16 }}>
            Upcoming Resupplies
          </div>
          {upcomingResupplies.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {upcomingResupplies.map(pred => {
                const days = Math.round((new Date(pred.recommendedResupplyDate) - new Date()) / 86400000);
                return (
                  <div key={pred._id} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'11px 14px', background:'var(--bg-elevated)',
                    borderRadius:8, border:'0.5px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{pred.materialName}</div>
                      <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>
                        {new Date(pred.recommendedResupplyDate).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })}
                      </div>
                    </div>
                    <span className={`badge ${days <= 0 ? 'badge-danger' : days <= 5 ? 'badge-warning' : 'badge-accent'}`}>
                      {days <= 0 ? 'TODAY' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ height:190, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-sparkles" style={{ fontSize:32, color:'var(--text-muted)', marginBottom:10 }} aria-hidden="true"/>
              <p style={{ fontSize:13, color:'var(--text-secondary)' }}>Run predictions to see resupply dates</p>
            </div>
          )}
        </div>
      </div>

      {/* Critical alerts */}
      {criticalMaterials.length > 0 && (
        <div className="card" style={{ borderColor:'rgba(220,38,38,0.25)', borderWidth:'0.5px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'var(--danger-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize:15, color:'var(--danger)' }} aria-hidden="true"/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--danger)' }}>Critical Stock Alerts</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{criticalMaterials.length} material{criticalMaterials.length>1?'s':''} below 20% capacity</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {criticalMaterials.map(m => {
              const pct = m.totalStorageCapacity > 0 ? Math.round((m.currentStock / m.totalStorageCapacity) * 100) : 0;
              return (
                <div key={m._id} style={{ padding:'12px 14px', background:'var(--danger-bg)', borderRadius:8, border:'0.5px solid rgba(220,38,38,0.15)' }}>
                  <div style={{ fontWeight:500, fontSize:13, marginBottom:4 }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'var(--danger)', marginBottom:8 }}>{pct}% remaining · {m.currentStock} {m.unit}</div>
                  <div className="stock-bar">
                    <div className="stock-bar-fill" style={{ width:`${pct}%`, background:'var(--danger)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
