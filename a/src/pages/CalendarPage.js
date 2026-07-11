import React, { useState, useEffect, useCallback } from 'react';
import { calendarAPI, materialsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, parseISO } from 'date-fns';

const EVENT_TYPES = [
  { value:'resupply',       label:'Resupply',       icon:'ti-truck',          color:'#D97706' },
  { value:'meeting',        label:'Meeting',         icon:'ti-users',          color:'#2563EB' },
  { value:'product_launch', label:'Product Launch',  icon:'ti-rocket',         color:'#10A37F' },
  { value:'maintenance',    label:'Maintenance',     icon:'ti-tool',           color:'#DC2626' },
  { value:'custom',         label:'Custom',          icon:'ti-bookmark',       color:'#7C6AF7' },
];

function EventModal({ date, event, onClose, onSave, materials }) {
  const isEdit = !!event;
  const [form, setForm] = useState(event ? {
    title:event.title, description:event.description||'',
    date: format(parseISO(event.date),'yyyy-MM-dd'),
    endDate: event.endDate ? format(parseISO(event.endDate),'yyyy-MM-dd') : '',
    type:event.type, priority:event.priority, color:event.color,
    materialId: event.materialId?._id||event.materialId||'',
  } : {
    title:'', description:'',
    date: date ? format(date,'yyyy-MM-dd') : format(new Date(),'yyyy-MM-dd'),
    endDate:'', type:'custom', priority:'medium', color:'#7C6AF7', materialId:'',
  });
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (type) => {
    const t = EVENT_TYPES.find(x=>x.value===type);
    setForm({ ...form, type, color:t?.color||'#7C6AF7' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title required');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.endDate) delete payload.endDate;
      if (!payload.materialId) delete payload.materialId;
      isEdit ? await calendarAPI.updateEvent(event._id, payload) : await calendarAPI.createEvent(payload);
      toast.success(isEdit ? 'Event updated' : 'Event added');
      onSave(); onClose();
    } catch (err) { toast.error(err.response?.data?.message||'Save failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:480 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">
          <span>{isEdit ? 'Edit Event' : 'Add Event'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1 }}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Event title" required />
          </div>

          {/* Event type pills */}
          <div className="form-group">
            <label className="label">Type</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {EVENT_TYPES.map(t => (
                <button key={t.value} type="button" onClick={()=>handleTypeChange(t.value)} style={{
                  padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
                  border:`0.5px solid ${form.type===t.value ? t.color : 'var(--border)'}`,
                  background: form.type===t.value ? `${t.color}18` : 'var(--bg-elevated)',
                  color: form.type===t.value ? t.color : 'var(--text-secondary)',
                  display:'flex', alignItems:'center', gap:5,
                }}>
                  <i className={`ti ${t.icon}`} style={{ fontSize:13 }} aria-hidden="true"/>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {form.type==='resupply' && materials.length > 0 && (
            <div className="form-group">
              <label className="label">Linked Material</label>
              <select className="input" value={form.materialId} onChange={e=>setForm({...form,materialId:e.target.value})}>
                <option value="">— None —</option>
                {materials.map(m=><option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Optional notes…" style={{ minHeight:60 }}/>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="loading-spinner" style={{ width:13, height:13 }}/>}
              {isEdit ? 'Save Changes' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventDetail({ event, onClose, onEdit, onDelete }) {
  const typeObj = EVENT_TYPES.find(t=>t.value===event.type);
  const priorityBadge = { high:'badge-danger', medium:'badge-warning', low:'badge-success' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:380 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:18 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:`${event.color}18`, border:`0.5px solid ${event.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className={`ti ${typeObj?.icon||'ti-bookmark'}`} style={{ fontSize:17, color:event.color }} aria-hidden="true"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--text-primary)' }}>{event.title}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{typeObj?.label}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, lineHeight:1, padding:2 }}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:18 }}>
          {[
            { icon:'ti-calendar', label:'Date', value: format(parseISO(event.date),'EEEE, MMMM d, yyyy') },
            event.endDate && { icon:'ti-calendar-off', label:'Ends', value: format(parseISO(event.endDate),'MMMM d, yyyy') },
            { icon:'ti-flag', label:'Priority', value: <span className={`badge ${priorityBadge[event.priority]}`} style={{ textTransform:'capitalize' }}>{event.priority}</span> },
            event.materialId && { icon:'ti-package', label:'Material', value: event.materialId?.name||'Linked' },
            event.isAutoGenerated && { icon:'ti-robot', label:'Source', value: 'ML Auto-generated' },
          ].filter(Boolean).map((row,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
              <i className={`ti ${row.icon}`} style={{ fontSize:15, color:'var(--text-muted)', width:16, flexShrink:0 }} aria-hidden="true"/>
              <span style={{ color:'var(--text-muted)', width:60, flexShrink:0, fontSize:12 }}>{row.label}</span>
              <span style={{ color:'var(--text-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {event.description && (
          <div style={{ padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:8, marginBottom:18, fontSize:13, color:'var(--text-secondary)', border:'0.5px solid var(--border)', lineHeight:1.6 }}>
            {event.description}
          </div>
        )}

        {!event.isAutoGenerated && (
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={()=>{ onEdit(event); onClose(); }}>
              <i className="ti ti-edit" aria-hidden="true"/> Edit
            </button>
            <button className="btn btn-danger" style={{ flex:1, justifyContent:'center' }} onClick={()=>onDelete(event.id || event._id)}>
              <i className="ti ti-trash" aria-hidden="true"/> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const loadEvents = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth()+1;
    try { const { data } = await calendarAPI.getEvents({ year, month }); setEvents(data.data||[]); }
    catch {}
  },[currentDate]);

  useEffect(()=>{ materialsAPI.getAll().then(r=>setMaterials(r.data.data||[])).catch(()=>{}); },[]);
  useEffect(()=>{ setLoading(true); loadEvents().finally(()=>setLoading(false)); },[loadEvents]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try { await calendarAPI.deleteEvent(id); toast.success('Deleted'); setModal(null); loadEvents(); }
    catch { toast.error('Delete failed'); }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart,{ weekStartsOn:1 });
  const calEnd     = endOfWeek(monthEnd,{ weekStartsOn:1 });
  const days       = eachDayOfInterval({ start:calStart, end:calEnd });
  const getEventsForDay = (day) => events.filter(e=>isSameDay(parseISO(e.date),day));

  const today = new Date();
  const upcoming = events
    .filter(e=>parseISO(e.date)>=today)
    .sort((a,b)=>new Date(a.date)-new Date(b.date))
    .slice(0,10);

  const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Resupply schedule and operational events</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal({ type:'add', date:new Date() })}>
          <i className="ti ti-plus" aria-hidden="true"/> Add Event
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 268px', gap:16 }}>

        {/* Calendar */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'0.5px solid var(--border)' }}>
            <button onClick={()=>setCurrentDate(subMonths(currentDate,1))} style={{
              width:32, height:32, borderRadius:8, border:'0.5px solid var(--border)',
              background:'var(--bg-elevated)', color:'var(--text-secondary)',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <i className="ti ti-chevron-left" style={{ fontSize:16 }} aria-hidden="true"/>
            </button>

            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text-primary)' }}>
                {format(currentDate,'MMMM yyyy')}
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setCurrentDate(new Date())} style={{
                padding:'5px 12px', borderRadius:8, border:'0.5px solid var(--border)',
                background:'var(--bg-elevated)', color:'var(--text-secondary)', cursor:'pointer', fontSize:12
              }}>Today</button>
              <button onClick={()=>setCurrentDate(addMonths(currentDate,1))} style={{
                width:32, height:32, borderRadius:8, border:'0.5px solid var(--border)',
                background:'var(--bg-elevated)', color:'var(--text-secondary)',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <i className="ti ti-chevron-right" style={{ fontSize:16 }} aria-hidden="true"/>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'0.5px solid var(--border)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign:'center', padding:'10px 0', fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
              <div className="loading-spinner" style={{ width:28, height:28 }}/>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
              {days.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const inMonth   = isSameMonth(day, currentDate);
                const todayFlag = isToday(day);
                const isWeekend = day.getDay()===0||day.getDay()===6;

                return (
                  <div key={idx} onClick={()=>setModal({ type:'add', date:day })}
                    style={{
                      minHeight:88, padding:'8px 7px 6px',
                      borderRight: idx%7!==6 ? '0.5px solid var(--border)' : 'none',
                      borderBottom: idx<days.length-7 ? '0.5px solid var(--border)' : 'none',
                      cursor:'pointer', transition:'background 0.1s',
                      background: todayFlag ? 'rgba(124,106,247,0.04)' : isWeekend&&inMonth ? 'rgba(0,0,0,0.01)' : 'transparent',
                    }}
                    onMouseEnter={e=>{ if(!todayFlag) e.currentTarget.style.background='rgba(124,106,247,0.03)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=todayFlag?'rgba(124,106,247,0.04)':isWeekend&&inMonth?'rgba(0,0,0,0.01)':'transparent'; }}
                  >
                    <div style={{
                      width:26, height:26, borderRadius:'50%', display:'flex',
                      alignItems:'center', justifyContent:'center', marginBottom:4,
                      background: todayFlag ? 'var(--accent)' : 'transparent',
                      color: todayFlag ? '#fff' : inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize:12, fontWeight: todayFlag ? 700 : 400,
                    }}>
                      {format(day,'d')}
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {dayEvents.slice(0,2).map(ev => (
                        <div key={ev._id}
                          onClick={e=>{ e.stopPropagation(); setModal({ type:'detail', event:ev }); }}
                          style={{
                            padding:'2px 5px', borderRadius:4, fontSize:10, fontWeight:500,
                            background:`${ev.color}18`, color:ev.color,
                            border:`0.5px solid ${ev.color}35`,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer',
                          }}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div style={{ fontSize:10, color:'var(--text-muted)', paddingLeft:5 }}>+{dayEvents.length-2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Legend */}
          <div className="card">
            <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Event Types</div>
            {EVENT_TYPES.map(t => (
              <div key={t.value} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
                <div style={{ width:26, height:26, borderRadius:7, background:`${t.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`ti ${t.icon}`} style={{ fontSize:13, color:t.color }} aria-hidden="true"/>
                </div>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{t.label}</span>
              </div>
            ))}
          </div>

          {/* Upcoming */}
          <div className="card" style={{ flex:1 }}>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Upcoming</div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'20px 0' }}>No upcoming events</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {upcoming.map(ev => {
                  const daysUntil = Math.round((parseISO(ev.date)-today)/86400000);
                  const typeObj = EVENT_TYPES.find(t=>t.value===ev.type);
                  return (
                    <div key={ev._id} onClick={()=>setModal({ type:'detail', event:ev })}
                      style={{
                        padding:'9px 11px', borderRadius:8,
                        background:'var(--bg-elevated)', cursor:'pointer',
                        border:`0.5px solid ${ev.color}25`,
                        transition:'border-color 0.14s',
                        display:'flex', alignItems:'center', gap:9,
                      }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=`${ev.color}60`}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=`${ev.color}25`}
                    >
                      <div style={{ width:28, height:28, borderRadius:7, background:`${ev.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className={`ti ${typeObj?.icon||'ti-bookmark'}`} style={{ fontSize:14, color:ev.color }} aria-hidden="true"/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{format(parseISO(ev.date),'EEE, MMM d')}</div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:600, flexShrink:0, color: daysUntil===0?'var(--danger)':daysUntil<=3?'var(--warning)':'var(--text-muted)' }}>
                        {daysUntil===0?'TODAY':`${daysUntil}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {(modal?.type==='add'||modal?.type==='edit') && (
        <EventModal date={modal.date} event={modal.event} materials={materials} onClose={()=>setModal(null)} onSave={loadEvents}/>
      )}
      {modal?.type==='detail' && (
        <EventDetail event={modal.event} onClose={()=>setModal(null)} onEdit={ev=>setModal({type:'edit',event:ev})} onDelete={handleDelete}/>
      )}
    </div>
  );
}
