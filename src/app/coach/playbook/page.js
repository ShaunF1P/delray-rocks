'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { trackPlaybookView } from '@/lib/track';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Search, Edit2, Trash2, X, Save, Maximize2, Star, Copy, RotateCcw } from 'lucide-react';
import PlayDiagram from '@/components/PlayDiagram';

// Module-level helpers (shared by all components)
function isInRotation(play) {
  return (play.tags || []).includes('rotation');
}

function getReadKey(play) {
  if (play.read_key) return play.read_key;
  const match = (play.description || '').match(/\u{1F511} Read Key:\s*(.+)/su);
  return match ? match[1].trim() : null;
}

function getCleanDescription(play) {
  return (play.description || '').replace(/\n\n\u{1F511} Read Key:.+/su, '').trim();
}

export default function PlaybookPage() {
  const [formations, setFormations] = useState([]);
  const [plays, setPlays] = useState([]);
  const [side, setSide] = useState('offense');
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [search, setSearch] = useState('');
  const [editingPlay, setEditingPlay] = useState(null);
  const [showAddPlay, setShowAddPlay] = useState(false);
  const [focusedPlay, setFocusedPlay] = useState(null);
  const [templatePlay, setTemplatePlay] = useState(null); // Play to copy from

  useEffect(() => { loadData(); trackPlaybookView(); }, []);

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


  async function toggleRotation(play) {
    const supabase = createClient();
    const currentTags = play.tags || [];
    const inRotation = currentTags.includes('rotation');
    const newTags = inRotation
      ? currentTags.filter(t => t !== 'rotation')
      : [...currentTags, 'rotation'];
    const { error } = await supabase.from('playbook_plays').update({ tags: newTags }).eq('id', play.id);
    if (!error) {
      setPlays(prev => prev.map(p => p.id === play.id ? { ...p, tags: newTags } : p));
    }
  }

  async function savePlay(play) {
    const supabase = createClient();
    // Embed read_key into description before saving (no DB column needed)
    let desc = (play.description || '').replace(/\n\n\u{1F511} Read Key:.+/su, '').trim();
    if (play.read_key && play.read_key.trim()) {
      desc = `${desc}\n\n\u{1F511} Read Key: ${play.read_key.trim()}`;
    }
    // Strip columns that don't exist in DB
    const { read_key, is_rotation, ...dbPlay } = { ...play, description: desc };
    if (dbPlay.id) {
      const { data } = await supabase.from('playbook_plays').update(dbPlay).eq('id', dbPlay.id).select().single();
      if (data) setPlays(prev => prev.map(p => p.id === data.id ? data : p));
    } else {
      const { id, ...rest } = dbPlay;
      const { data } = await supabase.from('playbook_plays').insert(rest).select().single();
      if (data) setPlays(prev => [...prev, data]);
    }
    setEditingPlay(null);
    setShowAddPlay(false);
    setTemplatePlay(null);
  }

  function startFromTemplate(play) {
    setTemplatePlay({
      ...play,
      id: undefined, // Will create new
      name: `${play.name} (Copy)`,
      source: 'custom',
      // rotation handled via tags
    });
    setShowAddPlay(true);
  }

  // Filter logic
  const isRotationView = side === 'rotation';
  const filteredFormations = formations.filter(f => f.side === (isRotationView ? 'offense' : side));

  const filteredPlays = useMemo(() => {
    return plays.filter(p => {
      if (isRotationView) {
        if (!isInRotation(p)) return false;
      } else {
        const matchFormationSide = formations.some(f => f.id === p.formation_id && f.side === side);
        if (!matchFormationSide && !selectedFormation) return false;
      }
      const matchesFormation = selectedFormation ? p.formation_id === selectedFormation.id : true;
      const matchesSearch = search
        ? p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.tags?.some(t => t.includes(search.toLowerCase())) ||
          (p.play_type || '').toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesFormation && matchesSearch;
    });
  }, [plays, side, selectedFormation, search, formations, isRotationView]);

  const rotationCount = plays.filter(p => isInRotation(p)).length;

  const typeIcon = (t) => t === 'run' ? '🏃' : t === 'pass' ? '🎯' : t === 'trick' ? '🎭' : t === 'rpo' ? '🔄' : t === 'blitz' ? '💥' : t === 'zone' ? '🔷' : t === 'man' ? '👤' : t === 'special' ? '⭐' : '📋';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={24} /> Playbook
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            {formations.length} formations • {plays.length} plays loaded • {rotationCount} in rotation
          </p>
        </div>
        <button onClick={() => { setTemplatePlay(null); setShowAddPlay(true); }} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          background: 'var(--rocks-green)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
        }}>
          <Plus size={14} /> Add Play
        </button>
      </div>

      {/* Side Toggle + Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
          {['offense', 'defense', 'special_teams', 'rotation'].map((s, i) => (
            <button key={s} onClick={() => { setSide(s); setSelectedFormation(null); }}
              style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 600, border: '1px solid',
                cursor: 'pointer', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 4,
                borderRadius: i === 0 ? '8px 0 0 8px' : i === 3 ? '0 8px 8px 0' : '0',
                background: side === s ? (s === 'rotation' ? 'rgba(253,185,19,0.15)' : 'rgba(0,154,68,0.15)') : 'transparent',
                borderColor: side === s ? (s === 'rotation' ? 'var(--rocks-gold)' : 'var(--rocks-green)') : 'var(--border)',
                color: side === s ? (s === 'rotation' ? 'var(--rocks-gold)' : 'var(--rocks-green-light)') : 'var(--text-dim)',
              }}>
              {s === 'rotation' && <Star size={12} fill={side === s ? 'var(--rocks-gold)' : 'none'} />}
              {s === 'special_teams' ? 'Special' : s === 'rotation' ? `Rotation (${rotationCount})` : s}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search plays, tags, or type (rpo, run, pass)..."
            style={{
              width: '100%', padding: '8px 8px 8px 32px', fontSize: 13, background: 'var(--bg-glass)',
              border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
            }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Formation List */}
        {!isRotationView && (
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
        )}

        {/* Rotation header when in rotation view */}
        {isRotationView && (
          <div style={{ width: 240, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ⭐ Game Day Rotation
            </div>
            <div style={{ padding: 12, background: 'rgba(253,185,19,0.06)', border: '1px solid rgba(253,185,19,0.15)', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--rocks-gold)' }}>{rotationCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>PLAYS IN ROTATION</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Star plays from offense, defense, or special teams to add them to your game-day rotation.
            </div>
            {/* Breakdown by type */}
            <div style={{ marginTop: 12 }}>
              {['run', 'pass', 'rpo', 'trick', 'blitz', 'zone', 'man', 'special'].map(t => {
                const c = plays.filter(p => isInRotation(p) && p.play_type === t).length;
                if (c === 0) return null;
                return (
                  <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{typeIcon(t)} {t}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plays Grid */}
        <div style={{ flex: 1 }}>
          {filteredPlays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
              {isRotationView ? (
                <>
                  <Star size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p style={{ fontSize: 14 }}>No plays in rotation yet</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Star plays from offense or defense to build your game-day call sheet</p>
                </>
              ) : (
                <p>No plays match your filters</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 10 }}>
              {filteredPlays.map(p => {
                const formation = formations.find(f => f.id === p.formation_id);
                return (
                  <div key={p.id} style={{
                    padding: 14, background: isInRotation(p) ? 'rgba(253,185,19,0.03)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isInRotation(p) ? 'rgba(253,185,19,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 10, position: 'relative',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          {typeIcon(p.play_type)} {p.name}
                          {p.play_type === 'rpo' && (
                            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#A78BFA', fontWeight: 700 }}>RPO</span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                          {formation?.name} • {p.play_type} {p.direction ? `• ${p.direction}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        {/* Star toggle */}
                        <button onClick={() => toggleRotation(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title={isInRotation(p) ? 'Remove from rotation' : 'Add to rotation'}>
                          <Star size={14} color={isInRotation(p) ? '#FDB913' : 'var(--text-dim)'} fill={isInRotation(p) ? '#FDB913' : 'none'} />
                        </button>
                        {/* Copy as template */}
                        <button onClick={() => startFromTemplate(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Create from template">
                          <Copy size={12} color="var(--text-dim)" />
                        </button>
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
                    {/* RPO Read Key */}
                    {getReadKey(p) && (
                      <div style={{
                        fontSize: 10, color: '#A78BFA', padding: '4px 8px', marginTop: 4,
                        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
                        borderRadius: 6, lineHeight: 1.4,
                      }}>
                        <span style={{ fontWeight: 700 }}>🔑 Read:</span> {getReadKey(p)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
                      {getCleanDescription(p)}
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
                        {(p.tags || []).filter(t => t !== 'rotation').map(t => (
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
          )}
        </div>
      </div>

      {/* Edit/Add Play Modal */}
      <AnimatePresence>
        {(editingPlay || showAddPlay) && (
          <PlayEditor
            play={editingPlay || templatePlay}
            formations={formations}
            allPlays={plays}
            onSave={savePlay}
            onClose={() => { setEditingPlay(null); setShowAddPlay(false); setTemplatePlay(null); }}
            isTemplate={!!templatePlay && !editingPlay}
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

/* ═══════════════════════════════════════════════════════════════
   ENHANCED PLAY EDITOR — with template support + RPO read key
   ═══════════════════════════════════════════════════════════════ */
function PlayEditor({ play, formations, allPlays, onSave, onClose, isTemplate }) {
  const [form, setForm] = useState(play || {
    name: '', play_type: 'run', direction: 'right', description: '', formation_id: formations[0]?.id,
    assignments: {}, tags: [], source: 'custom', read_key: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Position presets for assignment builder
  const offensePositions = ['QB', 'RB', 'FB', 'WR1', 'WR2', 'LT', 'LG', 'C', 'RG', 'RT', 'TE'];
  const defensePositions = ['DL1', 'DL2', 'DE1', 'DE2', 'LB1', 'LB2', 'LB3', 'CB1', 'CB2', 'S1', 'S2'];
  const isDefenseType = ['blitz', 'zone', 'man'].includes(form.play_type);
  const defaultPositions = isDefenseType ? defensePositions : offensePositions;

  function addTag() {
    if (!tagInput.trim()) return;
    setForm(p => ({ ...p, tags: [...(p.tags || []), tagInput.trim().toLowerCase()] }));
    setTagInput('');
  }

  function removeTag(tag) {
    setForm(p => ({ ...p, tags: (p.tags || []).filter(t => t !== tag) }));
  }

  function updateAssignment(pos, value) {
    setForm(p => ({
      ...p,
      assignments: { ...p.assignments, [pos]: value },
    }));
  }

  function removeAssignment(pos) {
    setForm(p => {
      const a = { ...p.assignments };
      delete a[pos];
      return { ...p, assignments: a };
    });
  }

  function addAssignmentPosition(pos) {
    if (form.assignments?.[pos]) return;
    setForm(p => ({
      ...p,
      assignments: { ...p.assignments, [pos]: '' },
    }));
  }

  function loadFromTemplate(template) {
    setForm({
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
      source: 'custom',
      // rotation handled via tags
    });
    setShowTemplateSelector(false);
  }

  // Get all unique tags across plays for autocomplete
  const allTags = [...new Set(allPlays.flatMap(p => p.tags || []))].sort();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 580, maxHeight: '90vh', overflow: 'auto', background: '#0d1117', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            {play?.id ? 'Edit Play' : isTemplate ? '📋 Create from Template' : '➕ New Play'}
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {!play?.id && (
              <button onClick={() => setShowTemplateSelector(!showTemplateSelector)} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6,
                color: '#60A5FA', cursor: 'pointer',
              }}>
                <Copy size={11} /> Start from Template
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-dim)" /></button>
          </div>
        </div>

        {/* Template selector dropdown */}
        {showTemplateSelector && (
          <div style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase' }}>Select a play to copy</div>
            {allPlays.map(p => (
              <button key={p.id} onClick={() => loadFromTemplate(p)} style={{
                width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 12, border: 'none', borderRadius: 4,
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 2,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {typeIcon(p.play_type)} {p.name}
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{p.play_type}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Play name" style={{ padding: 10, fontSize: 14, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={form.formation_id || ''} onChange={e => setForm(p => ({ ...p, formation_id: e.target.value }))}
              style={{ flex: 1, minWidth: 120, padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}>
              {formations.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={form.play_type} onChange={e => setForm(p => ({ ...p, play_type: e.target.value }))}
              style={{ width: 100, padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}>
              {['run','pass','rpo','trick','blitz','zone','man','special'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.direction || ''} onChange={e => setForm(p => ({ ...p, direction: e.target.value || null }))}
              style={{ width: 90, padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}>
              {['left','right','middle','varies'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Play description..." rows={2}
            style={{ padding: 10, fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', resize: 'vertical' }} />

          {/* RPO Read Key */}
          {form.play_type === 'rpo' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', marginBottom: 4, textTransform: 'uppercase' }}>🔑 RPO Read Key</div>
              <input value={form.read_key || ''} onChange={e => setForm(p => ({ ...p, read_key: e.target.value }))}
                placeholder="e.g., Read the OLB — hand off if he crashes, throw bubble if he stays wide"
                style={{ width: '100%', padding: 10, fontSize: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 8, color: '#A78BFA' }} />
            </div>
          )}

          {/* Position Assignments */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Position Assignments</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {defaultPositions.filter(pos => !form.assignments?.[pos]).slice(0, 6).map(pos => (
                  <button key={pos} onClick={() => addAssignmentPosition(pos)} style={{
                    fontSize: 9, padding: '2px 6px', background: 'rgba(0,154,68,0.1)', border: '1px solid rgba(0,154,68,0.2)',
                    borderRadius: 4, color: '#4ADE80', cursor: 'pointer', fontWeight: 600,
                  }}>+{pos}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {Object.entries(form.assignments || {}).map(([pos, task]) => (
                <div key={pos} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--rocks-gold)', width: 36 }}>{pos}</span>
                  <input value={task} onChange={e => updateAssignment(pos, e.target.value)}
                    placeholder={`${pos} assignment...`}
                    style={{ flex: 1, padding: '6px 8px', fontSize: 11, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#fff' }} />
                  <button onClick={() => removeAssignment(pos)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <X size={12} color="rgba(239,68,68,0.5)" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>Tags</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
              {(form.tags || []).map(t => (
                <span key={t} onClick={() => removeTag(t)} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4,
                }}>{t} <X size={8} /></span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag..."
                list="tag-suggestions"
                style={{ flex: 1, padding: '6px 8px', fontSize: 11, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#fff' }} />
              <datalist id="tag-suggestions">
                {allTags.filter(t => !(form.tags || []).includes(t)).map(t => <option key={t} value={t} />)}
              </datalist>
              <button onClick={addTag} style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 600, background: 'var(--bg-glass)',
                border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer',
              }}>Add</button>
            </div>
          </div>

          <button onClick={() => onSave(form)} style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 700, background: 'var(--rocks-green)', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Save size={14} /> {play?.id ? 'Update Play' : 'Save Play'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOCUSED PLAY VIEWER (unchanged from before, kept intact)
   ═══════════════════════════════════════════════════════════════ */
function FocusedPlayViewer({ play, formations, onClose }) {
  const [tab, setTab] = useState('diagram');
  const [teachPos, setTeachPos] = useState(null);
  const [teaching, setTeaching] = useState(null);
  const [loadingTeach, setLoadingTeach] = useState(false);
  const [tone, setTone] = useState('encouraging');
  const [roster, setRoster] = useState([]);
  const [lineup, setLineup] = useState({});
  const posKeys = Object.keys(play.assignments || {});
  const formationName = formations.find(f => f.id === play.formation_id)?.name;

  useEffect(() => {
    async function loadRoster() {
      const supabase = createClient();
      const { data } = await supabase.from('players').select('id, first_name, last_name, jersey_number, position').order('jersey_number');
      if (data) setRoster(data);
    }
    loadRoster();
  }, []);

  function assignPlayer(posKey, playerId) {
    if (!playerId) { setLineup(prev => { const n = { ...prev }; delete n[posKey]; return n; }); return; }
    const player = roster.find(p => p.id === playerId);
    if (player) setLineup(prev => ({ ...prev, [posKey]: { name: player.first_name, jersey: `#${player.jersey_number || ''}`, playerId: player.id, fullName: `${player.first_name} ${player.last_name}` } }));
  }

  const playerOverrides = lineup;

  async function loadTeaching(posKey, selectedTone) {
    const t = selectedTone || tone;
    setTeachPos(posKey);
    setTeaching(null);
    setLoadingTeach(true);
    try {
      const res = await fetch('/api/play-teaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playId: play.id, positionKey: posKey, tone: t }),
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
        style={{ width: '95vw', maxWidth: 1000, maxHeight: '92vh', overflow: 'auto', background: '#0a0e14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              {play.name}
              {play.play_type === 'rpo' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#A78BFA', fontWeight: 700 }}>RPO</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{formationName} • {play.play_type} • {play.direction || 'varies'}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {['diagram', 'lineup', 'learn', 'assignments'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 600, border: '1px solid', borderRadius: 6, cursor: 'pointer',
                background: tab === t ? 'rgba(0,154,68,0.15)' : 'transparent',
                borderColor: tab === t ? '#009A44' : 'rgba(255,255,255,0.1)',
                color: tab === t ? '#4ADE80' : 'rgba(255,255,255,0.4)',
              }}>{t === 'diagram' ? '📐 Diagram' : t === 'lineup' ? '👕 Lineup' : t === 'learn' ? '🎓 Watch & Learn' : '📋 Assignments'}</button>
            ))}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>
              <X size={18} color="var(--text-dim)" />
            </button>
          </div>
        </div>

        {/* RPO Read Key Banner */}
        {getReadKey(play) && (
          <div style={{
            padding: '10px 20px', background: 'rgba(139,92,246,0.06)',
            borderBottom: '1px solid rgba(139,92,246,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#A78BFA' }}>🔑 RPO Read:</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getReadKey(play)}</span>
          </div>
        )}

        {/* DIAGRAM TAB */}
        {tab === 'diagram' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PlayDiagram formationName={formationName} play={play}
              isDefense={['blitz','zone','man'].includes(play.play_type)}
              width={600} height={420} animated={true} playerOverrides={playerOverrides} />
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

            {/* Tone Selector */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', marginRight: 4 }}>Tone:</span>
              {[
                { key: 'encouraging', label: '😊 Encouraging', desc: 'Fun & kid-friendly' },
                { key: 'direct', label: '💪 Direct', desc: 'Firm but helpful' },
                { key: 'coach', label: '📋 Coach', desc: 'Technical breakdown' },
              ].map(t => (
                <button key={t.key} onClick={() => { setTone(t.key); if (teachPos) loadTeaching(teachPos, t.key); }}
                  title={t.desc}
                  style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 600, border: '1px solid', borderRadius: 5, cursor: 'pointer',
                    background: tone === t.key ? 'rgba(253,185,19,0.12)' : 'transparent',
                    borderColor: tone === t.key ? '#FDB913' : 'rgba(255,255,255,0.08)',
                    color: tone === t.key ? '#FDB913' : 'rgba(255,255,255,0.4)',
                  }}>{t.label}</button>
              ))}
            </div>

            {loadingTeach && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#4ADE80' }}>Coach Assistant is breaking it down...</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Generating {tone} teaching for {teachPos}</div>
              </div>
            )}

            {teaching && !loadingTeach && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{teaching.title}</div>
                <div style={{
                  fontSize: 14, color: '#4ADE80', lineHeight: 1.6, padding: '12px 16px', marginBottom: 16,
                  background: 'rgba(0,154,68,0.08)', border: '1px solid rgba(0,154,68,0.2)', borderRadius: 10,
                }}>{teaching.narration}</div>

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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 12, marginBottom: 16 }}>
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

                {(teaching.strength_vs || teaching.weakness_vs) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 12 }}>
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

        {/* LINEUP TAB */}
        {tab === 'lineup' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <PlayDiagram formationName={formationName} play={play}
                  isDefense={['blitz','zone','man'].includes(play.play_type)}
                  width={440} height={320} animated={true} playerOverrides={playerOverrides} />
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
                  {Object.keys(lineup).length > 0 ? `${Object.keys(lineup).length} of ${posKeys.length} positions assigned` : 'Assign players to see names on diagram'}
                </div>
              </div>

              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rocks-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    👕 Set Your Lineup
                  </div>
                  {Object.keys(lineup).length > 0 && (
                    <button onClick={() => setLineup({})} style={{
                      padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, color: '#EF4444', cursor: 'pointer',
                    }}>Clear All</button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                  {posKeys.map(pk => {
                    const assigned = lineup[pk];
                    const assignment = play.assignments?.[pk] || '';
                    return (
                      <div key={pk} style={{
                        display: 'flex', gap: 8, alignItems: 'center', padding: '6px 10px',
                        background: assigned ? 'rgba(0,154,68,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${assigned ? 'rgba(0,154,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 8,
                      }}>
                        <div style={{ width: 36, textAlign: 'center', fontSize: 11, fontWeight: 800, color: assigned ? '#4ADE80' : 'rgba(255,255,255,0.5)' }}>{pk}</div>
                        <select value={assigned?.playerId || ''} onChange={e => assignPlayer(pk, e.target.value)}
                          style={{
                            flex: 1, padding: '5px 8px', fontSize: 12,
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6, color: assigned ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
                          }}>
                          <option value="">— Select Player —</option>
                          {roster.map(p => (
                            <option key={p.id} value={p.id}>
                              #{p.jersey_number || '?'} {p.first_name} {p.last_name}
                            </option>
                          ))}
                        </select>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {assignment.substring(0, 25)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {roster.length > 0 && Object.keys(lineup).length < posKeys.length && (
                  <button onClick={() => {
                    const auto = { ...lineup };
                    const used = new Set(Object.values(auto).map(v => v.playerId));
                    posKeys.forEach(pk => {
                      if (auto[pk]) return;
                      const match = roster.find(p => !used.has(p.id) && p.position?.toUpperCase() === pk.toUpperCase());
                      if (match) {
                        auto[pk] = { name: match.first_name, jersey: `#${match.jersey_number || ''}`, playerId: match.id, fullName: `${match.first_name} ${match.last_name}` };
                        used.add(match.id);
                      }
                    });
                    setLineup(auto);
                  }} style={{
                    marginTop: 10, padding: '6px 14px', fontSize: 11, fontWeight: 600, width: '100%',
                    background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                    borderRadius: 6, color: '#60A5FA', cursor: 'pointer',
                  }}>⚡ Auto-Fill by Position Match</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {tab === 'assignments' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 300px' }}>
                <PlayDiagram formationName={formationName} play={play}
                  isDefense={['blitz','zone','man'].includes(play.play_type)}
                  width={300} height={220} animated={true} />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
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
