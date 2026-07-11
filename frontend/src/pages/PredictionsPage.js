import React, { useState, useEffect } from 'react';
import { predictionsAPI, materialsAPI } from '../utils/api';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
  BarChart, Bar, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import toast from 'react-hot-toast';

const TREND_MAP = {
  increasing: { icon:'ti-trending-up',   color:'#DC2626', label:'Increasing' },
  decreasing: { icon:'ti-trending-down', color:'#2563EB', label:'Decreasing' },
  stable:     { icon:'ti-minus',         color:'#10A37F', label:'Stable'     },
  volatile:   { icon:'ti-wave-sine',     color:'#D97706', label:'Volatile'   },
};

const MODEL_COLORS = {
  prophet:         '#7C6AF7',
  sarima:          '#10A37F',
  xgboost:         '#D97706',
  holt_winters:    '#2563EB',
  lstm:            '#DC2626',
  linear_baseline: '#8B82A7',
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

function ModelComparisonTable({ modelsCompared, bestModel, usedEnsemble }) {
  if (!modelsCompared || modelsCompared.length === 0) return null;

  const sorted = [...modelsCompared].sort((a, b) => (a.mape ?? 999) - (b.mape ?? 999));

  const radarData = sorted
    .filter(m => m.success)
    .map(m => ({
      model:      (m.model_name || '').replace(/_/g, ' '),
      Accuracy:   m.mape != null ? Math.max(0, Math.round(100 - m.mape)) : 0,
      Confidence: Math.round((m.confidence || 0) * 100),
      Speed:      Math.max(0, Math.round(100 - (m.training_time_s || 0) * 10)),
    }));

  return (
    <div className="card" style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 }}>Model Comparison Report</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:3 }}>
            {modelsCompared.length} models evaluated ·{' '}
            {usedEnsemble
              ? <span style={{ color:'var(--accent)', fontWeight:500 }}>Weighted ensemble used as final output</span>
              : <span>Best: <strong>{bestModel}</strong></span>}
          </div>
        </div>
        {usedEnsemble && (
          <div style={{ padding:'5px 12px', borderRadius:20, background:'var(--accent-light)', border:'0.5px solid var(--border-muted)', fontSize:11, fontWeight:600, color:'var(--accent)' }}>
            Ensemble Active
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Metrics table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>
                {['Model','MAPE','MAE','RMSE','Confidence','CV Folds','Time'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'6px 8px', fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'0.5px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, idx) => {
                const isWinner = idx === 0 && m.success;
                const color    = MODEL_COLORS[m.model_name] || 'var(--text-secondary)';
                return (
                  <tr key={m.model_name || idx} style={{ background: isWinner ? 'rgba(124,106,247,0.04)' : 'transparent' }}>
                    <td style={{ padding:'8px', borderBottom:'0.5px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: m.success ? color : 'var(--text-muted)', flexShrink:0 }}/>
                        <span style={{ fontWeight: isWinner ? 600 : 400, color: isWinner ? 'var(--text-primary)' : 'var(--text-secondary)', textTransform:'capitalize' }}>
                          {(m.model_name || '').replace(/_/g,' ')}
                        </span>
                        {isWinner && !usedEnsemble && (
                          <span style={{ fontSize:9, padding:'1px 5px', borderRadius:10, background:'var(--accent-light)', color:'var(--accent)', fontWeight:700 }}>BEST</span>
                        )}
                      </div>
                    </td>
                    {m.success ? (
                      <>
                        <td style={{ padding:'8px', borderBottom:'0.5px solid var(--border)', fontWeight:600, color: m.mape < 10 ? 'var(--success)' : m.mape < 25 ? 'var(--warning)' : 'var(--danger)' }}>
                          {m.mape?.toFixed(1)}%
                        </td>
                        <td style={{ padding:'8px', borderBottom:'0.5px solid var(--border)', color:'var(--text-secondary)' }}>{m.mae?.toFixed(2)}</td>
                        <td style={{ padding:'8px', borderBottom:'0.5px solid var(--border)', color:'var(--text-secondary)' }}>{m.rmse?.toFixed(2)}</td>
                        <td style={{ padding:'8px', borderBottom:'0.5px solid var(--border)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:4, borderRadius:2, background:'var(--bg-elevated)', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${Math.round((m.confidence||0)*100)}%`, background:color, borderRadius:2 }}/>
                            </div>
                            <span style={{ fontSize:11, color:'var(--text-secondary)', minWidth:28, textAlign:'right' }}>{Math.round((m.confidence||0)*100)}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'8px', borderBottom:'0.5px solid var(--border)', color:'var(--text-muted)', textAlign:'center' }}>{m.cv_folds ?? '—'}</td>
                        <td style={{ padding:'8px', borderBottom:'0.5px solid var(--border)', color:'var(--text-muted)' }}>{m.training_time_s?.toFixed(1)}s</td>
                      </>
                    ) : (
                      <td colSpan={6} style={{ padding:'8px', borderBottom:'0.5px solid var(--border)', color:'var(--danger)', fontSize:11 }}>
                        Failed: {m.error || 'Unknown error'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Radar chart */}
        {radarData.length >= 2 && (
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Model Profiles</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)"/>
                <PolarAngleAxis dataKey="model" tick={{ fill:'var(--text-secondary)', fontSize:10 }}/>
                <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                {radarData.map((entry, i) => {
                  const color = MODEL_COLORS[sorted.filter(m => m.success)[i]?.model_name] || 'var(--accent)';
                  return (
                    <Radar key={entry.model} name={entry.model} dataKey="Accuracy"
                      stroke={color} fill={color} fillOpacity={0.08} dot={false}/>
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* MAPE bar chart */}
      {sorted.filter(m => m.success).length > 1 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>MAPE Comparison (lower = better)</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={sorted.filter(m => m.success).map(m => ({
                name:  (m.model_name || '').replace(/_/g,' '),
                mape:  parseFloat((m.mape || 0).toFixed(1)),
                color: MODEL_COLORS[m.model_name] || 'var(--text-muted)',
              }))}
              layout="vertical" barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
              <XAxis type="number" tick={{ fill:'var(--text-secondary)', fontSize:10 }} axisLine={false} tickFormatter={v => `${v}%`}/>
              <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-secondary)', fontSize:11 }} axisLine={false} width={100}/>
              <Tooltip formatter={v => [`${v}%`, 'MAPE']} contentStyle={{ background:'var(--bg-card)', border:'0.5px solid var(--border)', borderRadius:8, fontSize:12 }}/>
              <Bar dataKey="mape" radius={[0,4,4,0]}>
                {sorted.filter(m => m.success).map((m, i) => (
                  <Cell key={i} fill={MODEL_COLORS[m.model_name] || 'var(--accent)'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function PredictionsPage() {
  const [materials,   setMaterials]   = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [comparison,  setComparison]  = useState(null);

  const load = async () => {
    try {
      const [mRes, pRes] = await Promise.all([materialsAPI.getAll(), predictionsAPI.getAll()]);
      setMaterials(mRes.data.data || []);
      setPredictions(pRes.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async (materialId) => {
    setGenerating(materialId);
    try {
      const { data } = await predictionsAPI.generate(materialId);
      toast.success(`Best model: ${data.data?.best_model || 'pipeline'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Prediction failed');
    } finally {
      setGenerating(null);
    }
  };

  const getPred = (materialId) =>
    predictions.find(p =>
      String(p.material_id)  === String(materialId) ||
      String(p.materialId)   === String(materialId)
    );

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
      <div className="loading-spinner" style={{ width:34, height:34 }}/>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">ML Predictions</h1>
        <p className="page-subtitle">Multi-model comparison pipeline with ensemble forecasting</p>
      </div>

      {materials.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:64 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="ti ti-sparkles" style={{ fontSize:28, color:'var(--accent)' }}/>
          </div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:8 }}>No materials to predict</h3>
          <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Add products and log usage data first</p>
        </div>
      ) : (
        <>
          {/* Stock forecast chart */}
          {selected && selected.forecast_data?.length > 0 && (
            <div className="card" style={{ marginBottom:20, borderColor:'var(--border-muted)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 }}>{selected.material_name} — Stock Forecast</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:3 }}>
                    {selected.used_ensemble ? `Ensemble of top ${selected.ensemble_top_n} models` : `Model: ${selected.best_model}`}
                    {' '}· {selected.data_points} data points · Confidence {Math.round((selected.confidence || 0) * 100)}%
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'var(--bg-elevated)', border:'0.5px solid var(--border)', borderRadius:7, padding:'5px 10px', cursor:'pointer', color:'var(--text-secondary)', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-x" style={{ fontSize:13 }}/> Close
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={selected.forecast_data.slice(0, 60).map(d => ({
                  date:  new Date(d.date).toLocaleDateString('en-US', { month:'short', day:'numeric' }),
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
                  <Area type="monotone" dataKey="stock" stroke="var(--accent)" strokeWidth={2} fill="url(#stockGrad)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Model comparison panel */}
          {comparison && (
            <ModelComparisonTable
              modelsCompared={comparison.models_compared}
              bestModel={comparison.best_model}
              usedEnsemble={comparison.used_ensemble}
            />
          )}

          {/* Material cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {materials.map(m => {
              const matId     = m.id || m._id;
              const pred      = getPred(matId);
              const isGen     = generating === matId;
              const trend     = pred ? TREND_MAP[pred.trend] || TREND_MAP.stable : null;
              const isSelChart = selected?.id === pred?.id;
              const isSelComp  = comparison?.id === pred?.id;

              return (
                <div key={matId} className="card" style={{
                  borderColor: isSelChart || isSelComp ? 'var(--accent)' : pred ? 'var(--border-muted)' : 'var(--border)',
                  transition:'border-color 0.15s',
                }}>
                  {/* Header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{m.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        {m.unit} · {m.current_stock ?? 0} in stock
                      </div>
                    </div>
                    {trend && (
                      <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:`${trend.color}14`, border:`0.5px solid ${trend.color}30` }}>
                        <i className={`ti ${trend.icon}`} style={{ fontSize:13, color:trend.color }}/>
                        <span style={{ fontSize:11, fontWeight:500, color:trend.color }}>{trend.label}</span>
                      </div>
                    )}
                  </div>

                  {pred ? (
                    <>
                      {/* Best model badge */}
                      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                        <span style={{
                          fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:500, textTransform:'capitalize',
                          background: MODEL_COLORS[pred.best_model] ? `${MODEL_COLORS[pred.best_model]}18` : 'var(--accent-light)',
                          color:      MODEL_COLORS[pred.best_model] || 'var(--accent)',
                          border:     `0.5px solid ${MODEL_COLORS[pred.best_model] || 'var(--accent)'}30`,
                        }}>
                          <i className="ti ti-trophy" style={{ fontSize:10, marginRight:4 }}/>
                          {pred.used_ensemble ? `Ensemble (${pred.ensemble_top_n} models)` : (pred.best_model || '').replace(/_/g,' ')}
                        </span>
                        {pred.models_compared?.length > 0 && (
                          <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:'var(--bg-elevated)', color:'var(--text-muted)', border:'0.5px solid var(--border)' }}>
                            {pred.models_compared.length} models tested
                          </span>
                        )}
                      </div>

                      {/* Key metrics */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                        <div style={{ padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:8, border:'0.5px solid var(--border)' }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Daily Usage</div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:19, color:'var(--text-primary)' }}>
                            {pred.predicted_daily_usage != null ? pred.predicted_daily_usage.toFixed(1) : '—'}
                            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-body)', fontWeight:400 }}> {m.unit}</span>
                          </div>
                        </div>
                        <div style={{ padding:'10px 12px', background:'var(--accent-light)', borderRadius:8, border:'0.5px solid var(--border-muted)' }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Confidence</div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:19, color:'var(--accent)' }}>
                            {Math.round((pred.confidence || 0) * 100)}%
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
                        {pred.recommended_resupply_date && (
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 11px', background:'var(--warning-bg)', borderRadius:8, border:'0.5px solid rgba(217,119,6,0.2)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <i className="ti ti-calendar-event" style={{ fontSize:13, color:'var(--warning)' }}/>
                              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Resupply by</span>
                            </div>
                            <span style={{ fontWeight:600, fontSize:12, color:'var(--warning)' }}>
                              {new Date(pred.recommended_resupply_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                            </span>
                          </div>
                        )}
                        {pred.estimated_stockout_date && (
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 11px', background:'var(--danger-bg)', borderRadius:8, border:'0.5px solid rgba(220,38,38,0.2)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <i className="ti ti-alert-triangle" style={{ fontSize:13, color:'var(--danger)' }}/>
                              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Stockout est.</span>
                            </div>
                            <span style={{ fontWeight:600, fontSize:12, color:'var(--danger)' }}>
                              {new Date(pred.estimated_stockout_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:11, padding:'6px 0' }}
                          onClick={() => setSelected(isSelChart ? null : pred)}
                          disabled={!pred.forecast_data?.length}>
                          <i className="ti ti-chart-line" style={{ fontSize:13 }}/>
                          {isSelChart ? 'Hide Chart' : 'View Chart'}
                        </button>
                        <button className="btn btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:11, padding:'6px 0' }}
                          onClick={() => setComparison(isSelComp ? null : pred)}
                          disabled={!pred.models_compared?.length}>
                          <i className="ti ti-table" style={{ fontSize:13 }}/>
                          {isSelComp ? 'Hide Models' : 'Compare Models'}
                        </button>
                        <button className="btn btn-primary" style={{ justifyContent:'center', fontSize:11, padding:'6px 10px' }}
                          onClick={() => handleGenerate(matId)} disabled={isGen} title="Refresh prediction">
                          {isGen ? <span className="loading-spinner" style={{ width:12, height:12 }}/> : <i className="ti ti-refresh" style={{ fontSize:13 }}/>}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12, lineHeight:1.6 }}>
                        {m.daily_usage > 0
                          ? 'Usage detected — will run SARIMA, XGBoost, Holt-Winters & more.'
                          : 'Upload a CSV or log daily usage to enable multi-model predictions.'}
                      </p>
                      <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
                        onClick={() => handleGenerate(matId)} disabled={isGen}>
                        {isGen
                          ? <><span className="loading-spinner" style={{ width:13, height:13 }}/> Running pipeline…</>
                          : <><i className="ti ti-sparkles"/> Generate Prediction</>}
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
