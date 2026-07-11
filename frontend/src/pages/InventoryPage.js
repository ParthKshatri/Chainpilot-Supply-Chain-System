import React, { useState, useEffect, useCallback } from 'react';
import { materialsAPI, usageAPI } from '../utils/api';
import toast from 'react-hot-toast';

function StockUpdateModal({ material, onClose, onSave }) {
  const [form, setForm] = useState({
    currentStock:         material.current_stock || 0,
    totalStorageCapacity: material.total_storage_capacity || 0,
    dailyUsage:           material.daily_usage || 0,
  });
  const [loading, setLoading] = useState(false);
  const pct      = form.totalStorageCapacity > 0 ? Math.round((form.currentStock / form.totalStorageCapacity) * 100) : 0;
  const barColor = pct < 20 ? 'var(--danger)' : pct < 50 ? 'var(--warning)' : 'var(--success)';

  const handleSave = async () => {
    setLoading(true);
    try {
      await materialsAPI.updateStock(material.id || material._id, {
        currentStock:         form.currentStock,
        totalStorageCapacity: form.totalStorageCapacity,
        dailyUsage:           form.dailyUsage,
      });
      toast.success('Stock updated');
      onClose();
      onSave();
    } catch (e) {
      console.error(e);
      toast.error('Update failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span>Update Stock — {material.name}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}><i className="ti ti-x"/></button>
        </div>
        <div style={{ marginBottom:20,padding:'14px 16px',background:'var(--bg-elevated)',borderRadius:10,border:'0.5px solid var(--border)' }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
            <span style={{ fontSize:12,color:'var(--text-secondary)' }}>Stock Level</span>
            <span style={{ fontFamily:'var(--font-display)',fontWeight:700,color:barColor,fontSize:22 }}>{pct}%</span>
          </div>
          <div className="stock-bar" style={{ height:8 }}>
            <div className="stock-bar-fill" style={{ width:`${Math.min(100,pct)}%`,background:barColor }}/>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',marginTop:7,fontSize:11,color:'var(--text-muted)' }}>
            <span>{form.currentStock} {material.unit}</span>
            <span>{form.totalStorageCapacity} {material.unit} capacity</span>
          </div>
        </div>
        <div className="form-group">
          <label className="label">Current Stock ({material.unit})</label>
          <input className="input" type="number" min="0" step="0.01" value={form.currentStock} onChange={e=>setForm({...form,currentStock:parseFloat(e.target.value)||0})}/>
        </div>
        <div className="form-group">
          <label className="label">Total Storage Capacity ({material.unit})</label>
          <input className="input" type="number" min="0" step="0.01" value={form.totalStorageCapacity} onChange={e=>setForm({...form,totalStorageCapacity:parseFloat(e.target.value)||0})}/>
        </div>
        <div className="form-group">
          <label className="label">Average Daily Usage ({material.unit}/day)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.dailyUsage} onChange={e=>setForm({...form,dailyUsage:parseFloat(e.target.value)||0})}/>
          {form.dailyUsage>0&&form.currentStock>0&&(
            <div style={{ fontSize:11,color:'var(--accent)',marginTop:5 }}>≈ {Math.floor(form.currentStock/form.dailyUsage)} days until stockout</div>
          )}
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading&&<span className="loading-spinner" style={{ width:13,height:13 }}/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function UsageLogModal({ material, onClose, onSave }) {
  const [form, setForm]     = useState({ date:new Date().toISOString().split('T')[0], quantity:'', notes:'' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    usageAPI.getByMaterial(material.id||material._id).then(r=>setHistory(r.data.data||[])).catch(()=>{});
  }, [material]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await usageAPI.logUsage({ materialId:material.id||material._id, ...form, quantity:parseFloat(form.quantity) });
      toast.success('Usage logged'); onClose(); onSave();
    } catch(err) { console.error(err); toast.error('Log failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:460 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          <span>Log Daily Usage — {material.name}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}><i className="ti ti-x"/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/>
            </div>
            <div className="form-group">
              <label className="label">Quantity ({material.unit})</label>
              <input className="input" type="number" min="0" step="0.01" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="0" required/>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Notes (optional)</label>
            <input className="input" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="e.g. High production day"/>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%',justifyContent:'center',marginBottom:16 }}>
            {loading&&<span className="loading-spinner" style={{ width:13,height:13 }}/>} Log Usage
          </button>
        </form>
        {history.length>0&&(
          <div>
            <div style={{ fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8 }}>Recent Entries</div>
            {history.slice(0,5).map((h,i)=>(
              <div key={h.id||i} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border)',fontSize:12 }}>
                <span style={{ color:'var(--text-secondary)' }}>{new Date(h.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                <span style={{ fontWeight:500 }}>{h.quantity} {material.unit}</span>
                <span style={{ color:'var(--text-muted)',fontSize:10,textTransform:'capitalize' }}>{h.source?.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadModal({ material, onClose, onSave }) {
  const [file, setFile]     = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file first');
    setLoading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await usageAPI.uploadFile(material.id||material._id, fd);
      toast.success(data.message||'Uploaded!'); onClose(); onSave();
    } catch(err) { console.error(err); toast.error(err.response?.data?.message||'Upload failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          <span>Upload Usage Data — {material.name}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}><i className="ti ti-x"/></button>
        </div>
        <div style={{ padding:'14px 16px',background:'var(--bg-elevated)',borderRadius:10,marginBottom:16,border:'0.5px solid var(--border)' }}>
          <div style={{ fontSize:12,fontWeight:500,marginBottom:8 }}>Supported Formats</div>
          <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:6 }}>
            <strong>CSV:</strong> columns <code style={{ background:'var(--accent-light)',color:'var(--accent)',padding:'1px 5px',borderRadius:4 }}>date, quantity</code>
          </div>
          <div style={{ background:'var(--bg-card)',borderRadius:7,padding:'8px 12px',fontFamily:'monospace',fontSize:11,color:'var(--text-secondary)',border:'0.5px solid var(--border)',marginTop:8 }}>
            date,quantity<br/>2024-01-01,150<br/>2024-01-02,175
          </div>
        </div>
        <div className="form-group">
          <label className="label">Select CSV or XML File</label>
          <input type="file" accept=".csv,.xml" onChange={e=>setFile(e.target.files[0])} style={{ color:'var(--text-primary)',fontSize:13 }}/>
        </div>
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={loading||!file}>
            {loading?<span className="loading-spinner" style={{ width:13,height:13 }}/>:<i className="ti ti-upload"/>} Upload
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [materials,   setMaterials]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('all');
  const [modal,       setModal]       = useState(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  const loadMaterials = useCallback(async () => {
    try {
      const { data } = await materialsAPI.getAll();
      setMaterials(data.data || []);
    } catch(e) {
      console.error('loadMaterials error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMaterials(); }, [loadMaterials, refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  const handleDeleteMaterial = async (material) => {
    if (!window.confirm(`Delete "${material.name}" from inventory?`)) return;
    try {
      await materialsAPI.delete(material.id || material._id);
      toast.success(`${material.name} deleted`);
      refresh();
    } catch { toast.error('Delete failed'); }
  };

  const getStatus = (m) => {
    const pct = m.total_storage_capacity > 0 ? (m.current_stock / m.total_storage_capacity) * 100 : 0;
    if (pct < 20) return { label:'Critical', bar:'var(--danger)',  cls:'badge-danger'  };
    if (pct < 50) return { label:'Low',      bar:'var(--warning)', cls:'badge-warning' };
    return              { label:'Good',     bar:'var(--success)', cls:'badge-success' };
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
    all:      materials.length,
    critical: materials.filter(m => getStatus(m).label === 'Critical').length,
    low:      materials.filter(m => getStatus(m).label === 'Low').length,
  };

  if (loading) return <div style={{ display:'flex',justifyContent:'center',paddingTop:80 }}><div className="loading-spinner" style={{ width:34,height:34 }}/></div>;

  return (
    <div className="fade-in">
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20 }}>
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage stock levels and track daily usage</p>
        </div>
        <div style={{ position:'relative' }}>
          <i className="ti ti-search" style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:14,pointerEvents:'none' }}/>
          <input className="input" placeholder="Search materials…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32,width:220 }}/>
        </div>
      </div>

      <div style={{ display:'flex',gap:8,marginBottom:18 }}>
        {[['all','All'],['critical','Critical'],['low','Low Stock']].map(([val,lbl])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{
            padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',
            border:'0.5px solid',
            borderColor: filter===val?'var(--accent)':'var(--border)',
            background:  filter===val?'var(--accent-light)':'var(--bg-card)',
            color:       filter===val?'var(--accent)':'var(--text-secondary)',
          }}>
            {lbl} <span style={{ marginLeft:4,opacity:0.7 }}>({counts[val]})</span>
          </button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div className="card" style={{ textAlign:'center',padding:64 }}>
          <h3 style={{ fontFamily:'var(--font-display)',fontSize:18,marginBottom:8 }}>No materials found</h3>
          <p style={{ color:'var(--text-secondary)',fontSize:13 }}>Add products with materials to populate inventory</p>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          <div style={{ display:'grid',alignItems:'center',padding:'0 16px',gridTemplateColumns:'2fr 3fr 1fr 1fr 1fr 140px',gap:16,fontSize:10,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em' }}>
            <span>Material</span><span>Stock Level</span>
            <span style={{ textAlign:'center' }}>Daily Use</span>
            <span style={{ textAlign:'center' }}>Days Left</span>
            <span style={{ textAlign:'center' }}>Status</span>
            <span style={{ textAlign:'center' }}>Actions</span>
          </div>

          {filtered.map(m => {
            const status   = getStatus(m);
            const cap      = m.total_storage_capacity || 0;
            const cur      = m.current_stock || 0;
            const pct      = cap > 0 ? Math.round((cur/cap)*100) : 0;
            const daysLeft = m.days_until_stockout;
            const matId    = m.id || m._id;

            return (
              <div key={matId} className="card" style={{ display:'grid',alignItems:'center',padding:'14px 16px',gridTemplateColumns:'2fr 3fr 1fr 1fr 1fr 140px',gap:16 }}>
                <div>
                  <div style={{ fontWeight:500,fontSize:13 }}>{m.name}</div>
                  <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>{m.unit}{m.category?` · ${m.category}`:''}</div>
                </div>
                <div>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:11 }}>
                    <span style={{ color:'var(--text-secondary)' }}>{cur} / {cap} {m.unit}</span>
                    <span style={{ fontWeight:600,color:status.bar }}>{pct}%</span>
                  </div>
                  <div className="stock-bar" style={{ height:6 }}>
                    <div className="stock-bar-fill" style={{ width:`${Math.min(100,pct)}%`,background:status.bar }}/>
                  </div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:600,fontSize:13 }}>{m.daily_usage||'—'}</div>
                  {m.daily_usage>0&&<div style={{ fontSize:10,color:'var(--text-muted)' }}>{m.unit}/day</div>}
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:600,fontSize:14,color:daysLeft!==null&&daysLeft!==undefined&&daysLeft<7?'var(--danger)':daysLeft!==null&&daysLeft!==undefined&&daysLeft<14?'var(--warning)':'var(--text-primary)' }}>
                    {daysLeft!==null&&daysLeft!==undefined?daysLeft:'—'}
                  </div>
                  {daysLeft!==null&&daysLeft!==undefined&&<div style={{ fontSize:10,color:'var(--text-muted)' }}>days</div>}
                </div>
                <div style={{ textAlign:'center' }}>
                  <span className={`badge ${status.cls}`}>{status.label}</span>
                </div>
                <div style={{ display:'flex',gap:5,justifyContent:'center' }}>
                  {[
                    { icon:'ti-chart-bar', title:'Update Stock',   type:'stock',  danger:false },
                    { icon:'ti-pencil',    title:'Log Usage',      type:'usage',  danger:false },
                    { icon:'ti-upload',    title:'Upload CSV/XML', type:'upload', danger:false },
                    { icon:'ti-trash',     title:'Delete',         type:'delete', danger:true  },
                  ].map(btn=>(
                    <button key={btn.type} title={btn.title}
                      onClick={()=> btn.type==='delete' ? handleDeleteMaterial(m) : setModal({ type:btn.type, material:m })}
                      style={{
                        width:30,height:30,borderRadius:7,cursor:'pointer',
                        border:`0.5px solid ${btn.danger?'rgba(220,38,38,0.2)':'var(--border)'}`,
                        background: btn.danger?'var(--danger-bg)':'var(--bg-elevated)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        color: btn.danger?'var(--danger)':'var(--text-secondary)',
                        transition:'all 0.14s',
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.borderColor=btn.danger?'var(--danger)':'var(--accent)'; e.currentTarget.style.color=btn.danger?'var(--danger)':'var(--accent)'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.borderColor=btn.danger?'rgba(220,38,38,0.2)':'var(--border)'; e.currentTarget.style.color=btn.danger?'var(--danger)':'var(--text-secondary)'; }}
                    >
                      <i className={`ti ${btn.icon}`} style={{ fontSize:14 }}/>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal?.type==='stock'  && <StockUpdateModal material={modal.material} onClose={()=>setModal(null)} onSave={refresh}/>}
      {modal?.type==='usage'  && <UsageLogModal    material={modal.material} onClose={()=>setModal(null)} onSave={refresh}/>}
      {modal?.type==='upload' && <UploadModal       material={modal.material} onClose={()=>setModal(null)} onSave={refresh}/>}
    </div>
  );
}
