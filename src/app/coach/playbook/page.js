'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Search, Edit2, Trash2, X, Save, Maximize2 } from 'lucide-react';
import PlayDiagram from '@/components/PlayDiagram';

export default function PlaybookPage() {
  const [formations, setFormations] = useState([]);
  const [plays, setPlays] = useState([]);
  const [side, setSide] = useState('offense');
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [search, setSearch] = useState('');
  const [editingPlay, setEditingPlay] = useState(null);
  const [showAddPlay, setShowAddPlay] = useState(false);
  const [focusedPlay, setFocusedPlay] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const [fRes, pRes] = await Promise.all([
      supabase.from('playbook_formations').select('*').order('sort_order'),
      supabase.from('playbook_plays').select('*').order('sort_order'),
    ]);
    if (fRes.data) setFormations(fRes.data);
    if (pRes.data) setPlays(pRes.data);
  }

  async function deletePlay(id) {
    if (!confirm('Delete this play?')) return;
    const supabase = createClient();
    await supabase.from('playbook_plays').delete().eq('id', id);
    setPlays(prev => prev.filter(p => p.id !== id));
  }

  async function savePlay(play) {
    const supabase = createClient();
    if (play.id) {
      const { data } = await supabase.from('playbook_plays').update(play).eq('id', play.id).select().single();
      if (data) setPlays(prev => prev.map(p => p.id === data.id ? data : p));
    } else {
      const { data } = await supabase.from('playbook_plays').insert(play).select().single();
      if (data) setPlays(prev => [...prev, data]);
    }
    setEditingPlay(null);
    setShowAddPlay(false);
  }

  const filteredFormations = formations.filter(f => f.side === side);
  const filteredPlays = plays.filter(p => {
    const matchesFormation = selectedFormation ? p.formation_id === selectedFormation.id : true;
    const matchesSearch = search ? p.name.toLowerCase().includes(search.toLowerCase()) || p.tags?.some(t => t.includes(search.toLowerCase())) : true;
    return matchesFormation && matchesSearch;
  });

  const typeIcon = (t) => t === 'run' ? '🏃' : t === 'pass' ? '🎯' : t === 'trick' ? '🎭' : t === 'blitz' ? '💥' : t === 'zone' ? '🔷' : t === 'man' ? '👤' : '⭐';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={24} /> Playbook
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            {formations.length} formations • {plays.length} plays loaded
          </p>
        </div>
        <button onClick={() => setShowAddPlay(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          background: 'var(--rocks-green)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
        }}>
          <Plus size={14} /> Add Play
        </button>
      </div>

      {/* Side Toggle + Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {['offense', 'defense', 'special_teams'].map(s => (
            <button key={s} onClick={() => { setSide(s); setSelectedFormation(null); }}
              style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600, border: '1px solid',
                cursor: 'pointer', textTransform: 'capitalize',
                borderRadius: s === 'offense' ? '8px 0 0 8px' : s === 'special_teams' ? '0 8px 8px 0' : '0',
                background: side === s ? 'rgba(0,154,68,0.15)' : 'transparent',
                borderColor: side === s ? 'var(--rocks-green)' : 'var(--border)',
                color: side === s ? 'var(--rocks-green-light)' : 'var(--text-dim)',
              }}>{s === 'special_teams' ? 'Special' : s}</button>
          ))}
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search plays or tags..."
            style={{
              width: '100%', padding: '8px 8px 8px 32px', fontSize: 13, background: 'var(--bg-glass)',
              border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
            }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Formation List */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Formations
          </div>
          <button onClick={() => setSelectedFormation(null)}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 600, border: '1px solid',
              borderRadius: 6, cursor: 'pointer', textAlign: 'left', marginBottom: 4,
              background: !selectedFormation ? 'rgba(0,154,68,0.1)' : 'transparent',
              borderColor: !selectedFormation ? 'var(--rocks-green)' : 'var(--border)',
              color: !selectedFormation ? 'var(--rocks-green-light)' : 'var(--text-secondary)',
            }}>
            All Plays ({plays.filter(p => filteredFormations.some(f => f.id === p.formation_id)).length})
          </button>
          {filteredFormations.map(f => {
            const count = plays.filter(p => p.formation_id === f.id).length;
            return (
              <button key={f.id} onClick={() => setSelectedFormation(f)}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 500, border: '1px solid',
                  borderRadius: 6, cursor: 'pointer', textAlign: 'left', marginBottom: 4,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: selectedFormation?.id === f.id ? 'rgba(0,154,68,0.1)' : 'transparent',
                  borderColor: selectedFormation?.id === f.id ? 'var(--rocks-green)' : 'transparent',
                  color: selectedFormation?.id === f.id ? '#fff' : 'var(--text-secondary)',
                }}>
                <span>{f.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Plays Grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))', gap: 10 }}>
            {filteredPlays.map(p => {
              const formation = formations.find(f => f.id === p.formation_id);
              return (
                <div key={p.id} style={{
                  padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, position: 'relative',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {typeIcon(p.play_type)} {p.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                        {formation?.name} • {p.play_type} {p.direction ? `• ${p.direction}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setFocusedPlay(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="View diagram">
                        <Maximize2 size={12} color="var(--rocks-green-light)" />
                      </button>
                      <button onClick={() => setEditingPlay(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Edit2 size={12} color="var(--text-dim)" />
                      </button>
                      <button onClick={() => deletePlay(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={12} color="rgba(239,68,68,0.5)" />
                      </button>
                    </div>
                  </div>
                  {/* Mini Diagram */}
                  <div style={{ marginTop: 8, marginBottom: 4 }}>
                    <PlayDiagram
                      formationName={formation?.name}
                      play={p}
                      isDefense={['blitz','zone','man'].includes(p.play_type)}
                      width={260}
                      height={160}
                      animated={true}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
                    {p.description}
                  </div>
                  {p.assignments && Object.keys(p.assignments).length > 0 && (
                    <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>ASSIGNMENTS</div>
                      {Object.entries(p.assignments).map(([pos, task]) => (
                        <div key={pos} style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, color: 'var(--rocks-gold)', marginRight: 4 }}>{pos}:</span>{task}
                        </div>
                      ))}
                    </div>
                  )}
                  {p.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                      {p.tags.map(t => (
                        <span key={t} style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)',
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit/Add Play Modal */}
      <AnimatePresence>
        {(editingPlay || showAddPlay) && (
          <PlayEditor
            play={editingPlay}
            formations={formations}
            onSave={savePlay}
            onClose={() => { setEditingPlay(null); setShowAddPlay(false); }}
          />
        )}
      </AnimatePresence>

      {/* Focused Play Full View */}
      <AnimatePresence>
        {focusedPlay && (
          <FocusedPlayViewer play={focusedPlay} formations={formations} onClose={() => setFocusedPlay(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayEditor({ play, formations, onSave, onClose }) {
  const [form, setForm] = useState(play || {
    name: '', play_type: 'run', direction: 'right', description: '', formation_id: formations[0]?.id,
    assignments: {}, tags: [], source: 'custom',
  });
  const [tagInput, setTagInput] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 500, maxHeight: '80vh', overflow: 'auto', background: '#0d1117', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{play ? 'Edit Play' : 'Add New Play'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-dim)" /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Play name" style={{ padding: 10, fontSize: 14, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <select value={form.formation_id || ''} onChange={e => setForm(p => ({ ...p, formation_id: e.target.value }))}
              style={{ flex: 1, padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}>
              {formations.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={form.play_type} onChange={e => setForm(p => ({ ...p, play_type: e.target.value }))}
              style={{ width: 100, padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}>
              {['run','pass','trick','blitz','zone','man','special'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.direction || ''} onChange={e => setForm(p => ({ ...p, direction: e.target.value || null }))}
              style={{ width: 90, padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}>
              {['left','right','middle','varies'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Play description..." rows={3}
            style={{ padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', resize: 'vertical' }} />

          <button onClick={() => onSave(form)} style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 700, background: 'var(--rocks-green)', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Save size={14} /> Save Play
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FocusedPlayViewer({ play, formations, onClose }) {
  const [tab, setTab] = useState('diagram');
  const [teachPos, setTeachPos] = useState(null);
  const [teaching, setTeaching] = useState(null);
  const [loadingTeach, setLoadingTeach] = useState(false);
  const posKeys = Object.keys(play.assignments || {});
  const formationName = formations.find(f => f.id === play.formation_id)?.name;

  async function loadTeaching(posKey) {
    setTeachPos(posKey);
    setTeaching(null);
    setLoadingTeach(true);
    try {
      const res = await fetch('/api/play-teaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playId: play.id, positionKey: posKey }),
      });
      const data = await res.json();
      if (data.teaching) setTeaching(data.teaching);
    } catch (e) { console.error(e); }
    setLoadingTeach(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 1000, maxHeight: '92vh', overflow: 'auto', background: '#0a0e14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{play.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{formationName} • {play.play_type} • {play.direction || 'varies'}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {['diagram', 'learn', 'assignments'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 600, border: '1px solid', borderRadius: 6, cursor: 'pointer',
                background: tab === t ? 'rgba(0,154,68,0.15)' : 'transparent',
                borderColor: tab === t ? '#009A44' : 'rgba(255,255,255,0.1)',
                color: tab === t ? '#4ADE80' : 'rgba(255,255,255,0.4)',
              }}>{t === 'diagram' ? '📐 Diagram' : t === 'learn' ? '🎓 Watch & Learn' : '📋 Assignments'}</button>
            ))}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>
              <X size={18} color="var(--text-dim)" />
            </button>
          </div>
        </div>

        {/* DIAGRAM TAB */}
        {tab === 'diagram' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PlayDiagram formationName={formationName} play={play}
              isDefense={['blitz','zone','man'].includes(play.play_type)}
              width={600} height={420} animated={true} />
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>Click players to highlight • Toggle 🏃 Motion / 📐 Routes • Hit ▶ to animate</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 16, maxWidth: 600, textAlign: 'center' }}>{play.description}</div>
          </div>
        )}

        {/* WATCH & LEARN TAB */}
        {tab === 'learn' && (
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎓 Choose a Position to Learn
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
              {posKeys.map(pk => (
                <button key={pk} onClick={() => loadTeaching(pk)} style={{
                  padding: '8px 14px', fontSize: 12, fontWeight: 700, border: '1px solid', borderRadius: 8, cursor: 'pointer',
                  background: teachPos === pk ? 'rgba(0,154,68,0.2)' : 'rgba(255,255,255,0.03)',
                  borderColor: teachPos === pk ? '#009A44' : 'rgba(255,255,255,0.1)',
                  color: teachPos === pk ? '#4ADE80' : 'rgba(255,255,255,0.6)',
                }}>
                  {pk}
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontWeight: 400 }}>
                    {(play.assignments[pk] || '').substring(0, 30)}
                  </div>
                </button>
              ))}
            </div>

            {/* Loading */}
            {loadingTeach && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#4ADE80' }}>AI Coach is breaking it down...</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Generating kid-friendly teaching for {teachPos}</div>
              </div>
            )}

            {/* Teaching Content */}
            {teaching && !loadingTeach && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{teaching.title}</div>
                <div style={{
                  fontSize: 14, color: '#4ADE80', lineHeight: 1.6, padding: '12px 16px', marginBottom: 16,
                  background: 'rgba(0,154,68,0.08)', border: '1px solid rgba(0,154,68,0.2)', borderRadius: 10,
                }}>{teaching.narration}</div>

                {/* Steps */}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 8, textTransform: 'uppercase' }}>Step-by-Step Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {(teaching.steps || []).map((step, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 12, padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(0,154,68,0.2)', border: '2px solid #009A44',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: '#4ADE80',
                      }}>{step.step || i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{step.action}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Two columns: Tips & Mistakes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {teaching.coaching_tips?.length > 0 && (
                    <div style={{ padding: 12, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', marginBottom: 6 }}>💡 Coaching Tips</div>
                      {teaching.coaching_tips.map((t, i) => (
                        <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid rgba(96,165,250,0.3)' }}>{t}</div>
                      ))}
                    </div>
                  )}
                  {teaching.common_mistakes?.length > 0 && (
                    <div style={{ padding: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>⚠️ Common Mistakes</div>
                      {teaching.common_mistakes.map((m, i) => (
                        <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid rgba(239,68,68,0.3)' }}>{m}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Strengths & Weaknesses */}
                {(teaching.strength_vs || teaching.weakness_vs) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {teaching.strength_vs && (
                      <div style={{ padding: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', marginBottom: 4 }}>✅ STRONG AGAINST</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{teaching.strength_vs}</div>
                      </div>
                    )}
                    {teaching.weakness_vs && (
                      <div style={{ padding: 10, background: 'rgba(253,185,19,0.06)', border: '1px solid rgba(253,185,19,0.15)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#FDB913', marginBottom: 4 }}>⚠️ WATCH OUT FOR</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{teaching.weakness_vs}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!teachPos && !loadingTeach && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👆</div>
                <div style={{ fontSize: 13 }}>Pick a position above to see what that player needs to do</div>
              </div>
            )}
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {tab === 'assignments' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: '0 0 300px' }}>
                <PlayDiagram formationName={formationName} play={play}
                  isDefense={['blitz','zone','man'].includes(play.play_type)}
                  width={300} height={220} animated={true} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 8, textTransform: 'uppercase' }}>All Player Assignments</div>
                {Object.entries(play.assignments || {}).map(([pos, task]) => (
                  <div key={pos} style={{
                    fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, padding: '6px 10px',
                    background: 'rgba(255,255,255,0.02)', borderRadius: 6, borderLeft: '3px solid var(--rocks-gold)',
                  }}>
                    <span style={{ fontWeight: 700, color: '#fff', marginRight: 8 }}>{pos}</span>{task}
                  </div>
                ))}
                {play.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                    {play.tags.map(t => (
                      <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)' }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
