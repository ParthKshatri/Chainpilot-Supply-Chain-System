import React, { useState, useEffect } from 'react';
import { predictionsAPI, materialsAPI } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart } from 'recharts';
import toast from 'react-hot-toast';

const TREND_MAP = {
  increasing: { icon:'ti-trending-up',   color:'var(--danger)',  label:'Increasing' },
  decreasing: { icon:'ti-trending-down', color:'var(--info)',    label:'Decreasing' },
  stable:     { icon:'ti-minus',         color:'var(--success)', label:'Stable'     },
  volatile:   { icon:'ti-wave-sine',     color:'var(--warning)', label:'Volatile'   },
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'0 4px 16px rgba(26,16,51,0.1)' }}>
      <div style={{ color:'var(--text-secondary)', marginBottom:4 }}>{label}</div>
      <div style={{ fontWeight:600, color:'var(--accent)' }}>Stock: {payload[0]?.value?.toFixed(0)}</div>
    </div>
  );
};

export default function PredictionsPage() {
  const [materials, setMaterials] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const [mRes, pRes] = await Promise.all([materialsAPI.getAll(), predictionsAPI.getAll()]);
      setMaterials(mRes.data.data||[]);
      setPredictions(pRes.data.data||[]);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  const handleGenerate = async (materialId) => {
    setGenerating(materialId);
    try { await predictionsAPI.generate(materialId); toast.success('Prediction generated!'); load(); }
    catch (err) { toast.error(err.response?.data?.message||'Prediction failed'); }
    finally { setGenerating(null); }
  };

  const getPrediction = (materialId) =>
    predictions.find(p => p.materialId?._id===materialId || p.materialId===materialId);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="loading-spinner" style={{ width:34, height:34 }}/></div>;

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">ML Predictions</h1>
        <p className="page-subtitle">AI-powered demand forecasting and resupply recommendations</p>
      </div>

      {materials.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:64 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="ti ti-sparkles" style={{ fontSize:28, color:'var(--accent)' }} aria-hidden="true"/>
          </div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:8 }}>No materials to predict</h3>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Add products and log usage data first</p>
        </div>
      ) : (
        <>
          {/* Forecast chart - shown when selected */}
          {selected && selected.forecastData?.length > 0 && (
            <div className="card" style={{ marginBottom:20, borderColor:'var(--border-muted)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700 }}>{selected.materialName}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:3 }}>
                    90-day stock forecast · Model: {selected.modelUsed} · {selected.trainedOn} data points
                  </div>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:'var(--bg-elevated)', border:'0.5px solid var(--border)', borderRadius:7, padding:'5px 8px', cursor:'pointer', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                  <i className="ti ti-x" style={{ fontSize:13 }} aria-hidden="true"/> Close
                </button>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={selected.forecastData.slice(0,60).map(d => ({
                  date: new Date(d.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}),
                  stock: d.predicted_stock,
                }))}>
                  <defs>
                    <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fill:'var(--text-secondary)', fontSize:11 }} axisLine={false} tickLine={false} interval={6}/>
                  <YAxis tick={{ fill:'var(--text-secondary)', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="5 5" label={{ value:'Stockout', fill:'var(--danger)', fontSize:10 }}/>
                  <Area type="monotone" dataKey="stock" stroke="var(--accent)" strokeWidth={2} fill="url(#stockGrad)" dot={false} name="Predicted Stock"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Material cards grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {materials.map(m => {
              const pred = getPrediction(m._id);
              const isGenerating = generating === m._id;
              const trend = pred ? TREND_MAP[pred.trend] || TREND_MAP.stable : null;
              const isSelected = selected?._id === pred?._id;

              return (
                <div key={m._id} className="card" style={{
                  borderColor: isSelected ? 'var(--accent)' : pred ? 'var(--border-muted)' : 'var(--border)',
                  cursor: pred?.forecastData?.length > 0 ? 'pointer' : 'default',
                  transition:'border-color 0.15s',
                }}
                onClick={()=>{ if(pred?.forecastData?.length>0) setSelected(isSelected ? null : pred); }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{m.unit} · {m.currentStock} in stock</div>
                    </div>
                    {trend && (
                      <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:20, background:`${trend.color}15`, border:`0.5px solid ${trend.color}30` }}>
                        <i className={`ti ${trend.icon}`} style={{ fontSize:13, color:trend.color }} aria-hidden="true"/>
                        <span style={{ fontSize:11, fontWeight:500, color:trend.color }}>{trend.label}</span>
                      </div>
                    )}
                  </div>

                  {pred ? (
                    <>
                      {/* Key metrics */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                        <div style={{ padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:8, border:'0.5px solid var(--border)' }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Daily Usage</div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)' }}>
                            {pred.predictedDailyUsage?.toFixed(1)}
                            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-body)', fontWeight:400 }}> {m.unit}</span>
                          </div>
                        </div>
                        <div style={{ padding:'10px 12px', background:'var(--accent-light)', borderRadius:8, border:'0.5px solid var(--border-muted)' }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Confidence</div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--accent)' }}>
                            {Math.round((pred.confidence||0)*100)}%
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                        {pred.recommendedResupplyDate && (
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'var(--warning-bg)', borderRadius:8, border:'0.5px solid rgba(217,119,6,0.2)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <i className="ti ti-calendar-event" style={{ fontSize:13, color:'var(--warning)' }} aria-hidden="true"/>
                              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Resupply by</span>
                            </div>
                            <span style={{ fontWeight:600, fontSize:12, color:'var(--warning)' }}>
                              {new Date(pred.recommendedResupplyDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                            </span>
                          </div>
                        )}
                        {pred.estimatedStockoutDate && (
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'var(--danger-bg)', borderRadius:8, border:'0.5px solid rgba(220,38,38,0.2)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <i className="ti ti-alert-triangle" style={{ fontSize:13, color:'var(--danger)' }} aria-hidden="true"/>
                              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Stockout est.</span>
                            </div>
                            <span style={{ fontWeight:600, fontSize:12, color:'var(--danger)' }}>
                              {new Date(pred.estimatedStockoutDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                          {pred.modelUsed} · {pred.trainedOn} pts
                          {pred.forecastData?.length > 0 && <span style={{ color:'var(--accent)', marginLeft:6 }}>· Click to view chart</span>}
                        </span>
                        <button className="btn btn-secondary" style={{ padding:'5px 10px', fontSize:11 }}
                          onClick={e=>{ e.stopPropagation(); handleGenerate(m._id); }} disabled={isGenerating}>
                          {isGenerating ? <span className="loading-spinner" style={{ width:11, height:11 }}/> : <i className="ti ti-refresh" style={{ fontSize:12 }} aria-hidden="true"/>}
                          Refresh
                        </button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12, lineHeight:1.6 }}>
                        {m.dailyUsage > 0
                          ? 'Usage data detected — ready to predict.'
                          : 'Log usage data or upload a CSV to enable ML predictions.'}
                      </p>
                      <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
                        onClick={e=>{ e.stopPropagation(); handleGenerate(m._id); }} disabled={isGenerating}>
                        {isGenerating
                          ? <><span className="loading-spinner" style={{ width:13, height:13 }}/> Generating…</>
                          : <><i className="ti ti-sparkles" aria-hidden="true"/> Generate Prediction</>}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
