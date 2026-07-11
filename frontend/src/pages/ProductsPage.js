import React, { useState, useEffect } from 'react';
import { productsAPI, materialsAPI } from '../utils/api';
import toast from 'react-hot-toast';

const UNITS = ['units','kg','g','liters','ml','meters','cm','pieces','sheets','rolls','boxes','tons'];

function ProductModal({ product, onClose, onSave }) {
  const isEdit = !!product;
  const [form, setForm] = useState(product || {
    name:'', description:'', sku:'', category:'', productionCycle:'monthly', materials:[]
  });
  const [loading, setLoading] = useState(false);
  const [newMat, setNewMat] = useState({ materialName:'', quantityPerUnit:'', unit:'units' });

  const addMaterial = () => {
    if (!newMat.materialName.trim() || !newMat.quantityPerUnit) return;
    setForm({ ...form, materials:[...form.materials, { ...newMat, quantityPerUnit:Number(newMat.quantityPerUnit) }] });
    setNewMat({ materialName:'', quantityPerUnit:'', unit:'units' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.materials.length === 0) return toast.error('Add at least one material');
    setLoading(true);
    try {
      isEdit ? await productsAPI.update(product._id, form) : await productsAPI.create(form);
      toast.success(isEdit ? 'Product updated' : 'Product created!');
      onSave(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:600 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          <span>{isEdit ? 'Edit Product' : 'Add New Product'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1 }}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Product Name *</label>
              <input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Widget A" required />
            </div>
            <div className="form-group">
              <label className="label">SKU</label>
              <input className="input" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="PROD-001" />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Category</label>
              <input className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Electronics" />
            </div>
            <div className="form-group">
              <label className="label">Production Cycle</label>
              <select className="input" value={form.productionCycle} onChange={e=>setForm({...form,productionCycle:e.target.value})}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Product details…" style={{ minHeight:56 }} />
          </div>

          {/* Materials */}
          <div style={{ marginTop:4 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
              Required Materials
            </div>

            {form.materials.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                {form.materials.map((mat,idx) => (
                  <div key={idx} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'8px 12px', background:'var(--bg-elevated)',
                    borderRadius:8, border:'0.5px solid var(--border)',
                  }}>
                    <div style={{ fontSize:13 }}>
                      <span style={{ fontWeight:500 }}>{mat.materialName}</span>
                      <span style={{ color:'var(--text-secondary)', marginLeft:8 }}>{mat.quantityPerUnit} {mat.unit} / unit</span>
                    </div>
                    <button type="button" onClick={()=>setForm({...form,materials:form.materials.filter((_,i)=>i!==idx)})}
                      style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:16, lineHeight:1, padding:2 }}>
                      <i className="ti ti-trash" aria-hidden="true"/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ flex:2 }}>
                <label className="label">Material Name</label>
                <input className="input" value={newMat.materialName} onChange={e=>setNewMat({...newMat,materialName:e.target.value})}
                  placeholder="e.g. Steel Sheet" onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addMaterial())} />
              </div>
              <div style={{ flex:1 }}>
                <label className="label">Qty / Unit</label>
                <input className="input" type="number" min="0" step="0.01" value={newMat.quantityPerUnit}
                  onChange={e=>setNewMat({...newMat,quantityPerUnit:e.target.value})} placeholder="2" />
              </div>
              <div style={{ flex:1 }}>
                <label className="label">Unit</label>
                <select className="input" value={newMat.unit} onChange={e=>setNewMat({...newMat,unit:e.target.value})}>
                  {UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <button type="button" onClick={addMaterial} className="btn btn-secondary" style={{ flexShrink:0, paddingLeft:12, paddingRight:12 }}>
                <i className="ti ti-plus" aria-hidden="true"/> Add
              </button>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="loading-spinner" style={{ width:13, height:13 }}/>}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [search, setSearch] = useState('');

  const loadProducts = async () => {
    try { const { data } = await productsAPI.getAll(); setProducts(data.data||[]); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ loadProducts(); },[]);

  const handleDelete = async (p) => {
    const matNames = p.materials?.map(m => m.materialName).join(', ');
    const msg = matNames
      ? `Delete "${p.name}"?\n\nNote: Its materials (${matNames}) will remain in Inventory since they may be shared with other products.`
      : `Delete "${p.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await productsAPI.delete(p.id || p._id);
      toast.success('Product deleted');
      loadProducts();
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const cycleColors = { daily:'var(--info-text)', weekly:'var(--accent)', monthly:'var(--success)' };
  const cycleBgs   = { daily:'var(--info-bg)',  weekly:'var(--accent-light)', monthly:'var(--success-bg)' };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="loading-spinner" style={{ width:34, height:34 }}/></div>;

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} product{products.length!==1?'s':''} configured</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ position:'relative' }}>
            <i className="ti ti-search" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' }} aria-hidden="true"/>
            <input className="input" placeholder="Search products…" value={search}
              onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32, width:220 }} />
          </div>
          <button className="btn btn-primary" onClick={()=>{ setEditProduct(null); setShowModal(true); }}>
            <i className="ti ti-plus" aria-hidden="true"/> Add Product
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:64 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="ti ti-package" style={{ fontSize:28, color:'var(--accent)' }} aria-hidden="true"/>
          </div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:8 }}>{search ? 'No results' : 'No products yet'}</h3>
          <p style={{ color:'var(--text-secondary)', marginBottom:24, fontSize:13 }}>{search ? 'Try a different search' : 'Add your first product to start tracking materials'}</p>
          {!search && <button className="btn btn-primary" onClick={()=>setShowModal(true)}><i className="ti ti-plus" aria-hidden="true"/> Add First Product</button>}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {filtered.map(p => (
            <div key={p._id} className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>{p.name}</div>
                  {p.sku && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>SKU: {p.sku}</div>}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>{ setEditProduct(p); setShowModal(true); }} style={{
                    width:30, height:30, borderRadius:7, border:'0.5px solid var(--border)',
                    background:'var(--bg-elevated)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)'
                  }}>
                    <i className="ti ti-edit" style={{ fontSize:14 }} aria-hidden="true"/>
                  </button>
                  <button onClick={() => handleDelete(p)} style={{
                    width:30, height:30, borderRadius:7, border:'0.5px solid rgba(220,38,38,0.2)',
                    background:'var(--danger-bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)'
                  }}>
                    <i className="ti ti-trash" style={{ fontSize:14 }} aria-hidden="true"/>
                  </button>
                </div>
              </div>

              {p.description && <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>{p.description}</p>}

              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {p.category && (
                  <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:'var(--bg-elevated)', color:'var(--text-secondary)', border:'0.5px solid var(--border)' }}>{p.category}</span>
                )}
                <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:cycleBgs[p.productionCycle]||'var(--accent-light)', color:cycleColors[p.productionCycle]||'var(--accent)', border:'0.5px solid var(--border)' }}>
                  {p.productionCycle}
                </span>
              </div>

              <div>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:7 }}>
                  Materials ({p.materials?.length||0})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {p.materials?.slice(0,4).map((mat,i) => (
                    <div key={i} style={{
                      display:'flex', justifyContent:'space-between', padding:'6px 10px',
                      background:'var(--bg-elevated)', borderRadius:6, fontSize:12,
                      border:'0.5px solid var(--border)',
                    }}>
                      <span style={{ color:'var(--text-primary)' }}>{mat.materialName}</span>
                      <span style={{ color:'var(--text-muted)' }}>{mat.quantityPerUnit} {mat.unit}</span>
                    </div>
                  ))}
                  {p.materials?.length > 4 && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'4px 0' }}>
                      +{p.materials.length - 4} more materials
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ProductModal product={editProduct} onClose={()=>setShowModal(false)} onSave={loadProducts} />}
    </div>
  );
}
