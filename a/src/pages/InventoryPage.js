import React, { useState, useEffect } from 'react';
import { materialsAPI, usageAPI } from '../utils/api';
import toast from 'react-hot-toast';

function StockUpdateModal({ material, onClose, onSave }) {
  const [form, setForm] = useState({
    currentStock: material.currentStock||0,
    totalStorageCapacity: material.totalStorageCapacity||0,
    dailyUsage: material.dailyUsage||0,
  });
  const [loading, setLoading] = useState(false);

  const pct = form.totalStorageCapacity > 0 ? Math.round((form.currentStock / form.totalStorageCapacity) * 100) : 0;
  const barColor = pct < 20 ? 'var(--danger)' : pct < 50 ? 'var(--warning)' : 'var(--success)';

  const handleSave = async () => {
    setLoading(true);
    try { await materialsAPI.updateStock(material._id, form); toast.success('Stock updated'); onSave(); onClose(); }
    catch { toast.error('Update failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          <span>Update Stock — {material.name}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1 }}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>

        <div style={{ marginBottom:20, padding:'14px 16px', background:'var(--bg-elevated)', borderRadius:10, border:'0.5px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Stock Level</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:barColor, fontSize:22 }}>{pct}%</span>
          </div>
          <div className="stock-bar" style={{ height:8 }}>
            <div className="stock-bar-fill" style={{ width:`${Math.min(100,pct)}%`, background:barColor }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:7, fontSize:11, color:'var(--text-muted)' }}>
            <span>{form.currentStock} {material.unit}</span>
            <span>{form.totalStorageCapacity} {material.unit} capacity</span>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Current Stock ({material.unit})</label>
          <input className="input" type="number" min="0" step="0.01"
            value={form.currentStock} onChange={e=>setForm({...form,currentStock:parseFloat(e.target.value)||0})} />
        </div>
        <div className="form-group">
          <label className="label">Total Storage Capacity ({material.unit})</label>
          <input className="input" type="number" min="0" step="0.01"
            value={form.totalStorageCapacity} onChange={e=>setForm({...form,totalStorageCapacity:parseFloat(e.target.value)||0})} />
        </div>
        <div className="form-group">
          <label className="label">Average Daily Usage ({material.unit}/day)</label>
          <input className="input" type="number" min="0" step="0.01"
            value={form.dailyUsage} onChange={e=>setForm({...form,dailyUsage:parseFloat(e.target.value)||0})} />
          {form.dailyUsage > 0 && form.currentStock > 0 && (
            <div style={{ fontSize:11, color:'var(--accent)', marginTop:5 }}>
              ≈ {Math.floor(form.currentStock/form.dailyUsage)} days until stockout
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading && <span className="loading-spinner" style={{ width:13, height:13 }}/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function UsageLogModal({ material, onClose, onSave }) {
  const [form, setForm] = useState({ date:new Date().toISOString().split('T')[0], quantity:'', notes:'' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    usageAPI.getByMaterial(material.id || material._id).then(r=>setHistory(r.data.data||[])).catch(()=>{});
  },[material._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usageAPI.logUsage({ materialId:material._id, ...form, quantity:parseFloat(form.quantity) });
      toast.success('Usage logged'); onSave(); onClose();
    } catch { toast.error('Log failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:460 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          <span>Log Daily Usage — {material.name}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1 }}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="label">Quantity Used ({material.unit})</label>
              <input className="input" type="number" min="0" step="0.01" value={form.quantity}
                onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="0" required />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Notes (optional)</label>
            <input className="input" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="e.g. High production day" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width:'100%', justifyContent:'center', marginBottom:16 }}>
            {loading && <span className="loading-spinner" style={{ width:13, height:13 }}/>} Log Usage
          </button>
        </form>

        {history.length > 0 && (
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Recent Entries</div>
            {history.slice(0,5).map(h=>(
              <div key={h._id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid var(--border)', fontSize:12 }}>
                <span style={{ color:'var(--text-secondary)' }}>{new Date(h.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                <span style={{ fontWeight:500 }}>{h.quantity} {material.unit}</span>
                <span style={{ color:'var(--text-muted)', fontSize:10, textTransform:'capitalize' }}>{h.source?.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadModal({ material, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file first');
    setLoading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await usageAPI.uploadFile(material._id, fd);
      toast.success(data.message || 'Uploaded!'); onSave(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          <span>Upload Usage Data — {material.name}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1 }}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>

        <div style={{ padding:'14px 16px', background:'var(--bg-elevated)', borderRadius:10, marginBottom:16, border:'0.5px solid var(--border)' }}>
          <div style={{ fontSize:12, fontWeight:500, marginBottom:8, color:'var(--text-primary)' }}>Supported Formats</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6 }}>
            <strong>CSV:</strong> columns <code style={{ background:'var(--accent-light)', color:'var(--accent)', padding:'1px 5px', borderRadius:4 }}>date, quantity</code>
          </div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10 }}>
            <strong>XML:</strong> <code style={{ background:'var(--accent-light)', color:'var(--accent)', padding:'1px 5px', borderRadius:4 }}>&lt;entry&gt;&lt;date&gt;...&lt;quantity&gt;...</code>
          </div>
          <div style={{ background:'var(--bg-card)', borderRadius:7, padding:'8px 12px', fontFamily:'monospace', fontSize:11, color:'var(--text-secondary)', border:'0.5px solid var(--border)' }}>
            date,quantity<br/>
            2024-01-01,150<br/>
            2024-01-02,175
          </div>
        </div>

        <div className="form-group">
          <label className="label">Select CSV or XML File</label>
          <input type="file" accept=".csv,.xml" onChange={e=>setFile(e.target.files[0])}
            style={{ color:'var(--text-primary)', fontSize:13 }} />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={loading||!file}>
            {loading ? <span className="loading-spinner" style={{ width:13, height:13 }}/> : <i className="ti ti-upload" aria-hidden="true"/>} Upload
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadMaterials = async () => {
    try { const { data } = await materialsAPI.getAll(); setMaterials(data.data||[]); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ loadMaterials(); },[]);

  const getStatus = (m) => {
    const pct = m.totalStorageCapacity > 0 ? (m.currentStock / m.totalStorageCapacity)*100 : 0;
    if (pct < 20) return { label:'Critical', color:'var(--danger)',  bg:'var(--danger-bg)',  bar:'var(--danger)',  cls:'badge-danger'  };
    if (pct < 50) return { label:'Low',      color:'var(--warning)', bg:'var(--warning-bg)', bar:'var(--warning)', cls:'badge-warning' };
    return              { label:'Good',     color:'var(--success)', bg:'var(--success-bg)', bar:'var(--success)', cls:'badge-success' };
  };

  const filtered = materials
    .filter(m => {
      const s = getStatus(m);
      if (filter === 'critical') return s.label === 'Critical';
      if (filter === 'low')      return s.label === 'Low';
      return true;
    })
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: materials.length,
    critical: materials.filter(m => getStatus(m).label==='Critical').length,
    low:      materials.filter(m => getStatus(m).label==='Low').length,
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="loading-spinner" style={{ width:34, height:34 }}/></div>;

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage stock levels and track daily usage</p>
        </div>
        <div style={{ position:'relative' }}>
          <i className="ti ti-search" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' }} aria-hidden="true"/>
          <input className="input" placeholder="Search materials…" value={search}
            onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32, width:220 }} />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:18 }}>
        {[['all','All'],['critical','Critical'],['low','Low Stock']].map(([val,lbl]) => (
          <button key={val} onClick={()=>setFilter(val)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
            border:'0.5px solid',
            borderColor: filter===val ? 'var(--accent)' : 'var(--border)',
            background: filter===val ? 'var(--accent-light)' : 'var(--bg-card)',
            color: filter===val ? 'var(--accent)' : 'var(--text-secondary)',
          }}>
            {lbl} <span style={{ marginLeft:4, opacity:0.7 }}>({counts[val]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:64 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="ti ti-stack-2" style={{ fontSize:28, color:'var(--accent)' }} aria-hidden="true"/>
          </div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:8 }}>No materials found</h3>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Add products with materials to populate inventory</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {/* Header row */}
          <div style={{
            display:'grid', alignItems:'center', padding:'0 16px',
            gridTemplateColumns:'2fr 3fr 1fr 1fr 1fr 120px',
            gap:16, fontSize:10, fontWeight:600,
            color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em',
          }}>
            <span>Material</span><span>Stock Level</span>
            <span style={{ textAlign:'center' }}>Daily Use</span>
            <span style={{ textAlign:'center' }}>Days Left</span>
            <span style={{ textAlign:'center' }}>Status</span>
            <span style={{ textAlign:'center' }}>Actions</span>
          </div>

          {filtered.map(m => {
            const status = getStatus(m);
            const pct = m.totalStorageCapacity > 0 ? Math.round((m.currentStock/m.totalStorageCapacity)*100) : 0;
            const daysLeft = m.dailyUsage > 0 ? Math.floor(m.currentStock/m.dailyUsage) : null;

            return (
              <div key={m._id} className="card" style={{ display:'grid', alignItems:'center', padding:'14px 16px', gridTemplateColumns:'2fr 3fr 1fr 1fr 1fr 120px', gap:16 }}>
                <div>
                  <div style={{ fontWeight:500, fontSize:13, color:'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                    {m.unit}{m.category?` · ${m.category}`:''}
                  </div>
                </div>

                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:11 }}>
                    <span style={{ color:'var(--text-secondary)' }}>{m.currentStock} / {m.totalStorageCapacity} {m.unit}</span>
                    <span style={{ fontWeight:600, color:status.bar }}>{pct}%</span>
                  </div>
                  <div className="stock-bar" style={{ height:6 }}>
                    <div className="stock-bar-fill" style={{ width:`${Math.min(100,pct)}%`, background:status.bar }}/>
                  </div>
                </div>

                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{m.dailyUsage||'—'}</div>
                  {m.dailyUsage > 0 && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{m.unit}/day</div>}
                </div>

                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:600, fontSize:14, color: daysLeft!==null&&daysLeft<7?'var(--danger)':daysLeft!==null&&daysLeft<14?'var(--warning)':'var(--text-primary)' }}>
                    {daysLeft !== null ? daysLeft : '—'}
                  </div>
                  {daysLeft !== null && <div style={{ fontSize:10, color:'var(--text-muted)' }}>days</div>}
                </div>

                <div style={{ textAlign:'center' }}>
                  <span className={`badge ${status.cls}`}>{status.label}</span>
                </div>

                <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                  {[
                    { icon:'ti-chart-bar', title:'Update Stock', type:'stock' },
                    { icon:'ti-pencil',    title:'Log Usage',    type:'usage' },
                    { icon:'ti-upload',    title:'Upload CSV/XML', type:'upload' },
                  ].map(btn => (
                    <button key={btn.type} title={btn.title} onClick={()=>setModal({ type:btn.type, material:m })} style={{
                      width:30, height:30, borderRadius:7, border:'0.5px solid var(--border)',
                      background:'var(--bg-elevated)', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'var(--text-secondary)', transition:'all 0.14s',
                    }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)'; }}
                    >
                      <i className={`ti ${btn.icon}`} style={{ fontSize:14 }} aria-hidden="true"/>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal?.type==='stock'  && <StockUpdateModal material={modal.material} onClose={()=>setModal(null)} onSave={loadMaterials}/>}
      {modal?.type==='usage'  && <UsageLogModal    material={modal.material} onClose={()=>setModal(null)} onSave={loadMaterials}/>}
      {modal?.type==='upload' && <UploadModal       material={modal.material} onClose={()=>setModal(null)} onSave={loadMaterials}/>}
    </div>
  );
}
