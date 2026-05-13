'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Search, Filter, Clock, Users, ChevronDown, ChevronUp,
  Plus, X, Save, GraduationCap, Zap, Shield, Target, Activity, Footprints
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Drills', icon: '📋' },
  { id: 'fundamentals', label: 'Fundamentals', icon: '🏈' },
  { id: 'offense', label: 'Offense', icon: '⚔️' },
  { id: 'defense', label: 'Defense', icon: '🛡️' },
  { id: 'conditioning', label: 'Conditioning', icon: '🏃' },
  { id: 'agility', label: 'Agility', icon: '⚡' },
  { id: 'special_teams', label: 'Special Teams', icon: '🦶' },
];

const POSITIONS = [
  { id: 'all', label: 'All Positions' },
  { id: 'qb', label: 'QB' }, { id: 'rb', label: 'RB' }, { id: 'wr', label: 'WR' },
  { id: 'ol', label: 'OL' }, { id: 'te', label: 'TE' },
  { id: 'dl', label: 'DL' }, { id: 'lb', label: 'LB' }, { id: 'db', label: 'DB' },
  { id: 'k', label: 'K/P' },
];

const DIFFICULTY_COLORS = {
  beginner: { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)', text: '#4ADE80', label: '🟢 Beginner' },
  intermediate: { bg: 'rgba(253,185,19,0.15)', border: 'rgba(253,185,19,0.3)', text: '#FDB913', label: '🟡 Intermediate' },
  advanced: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#EF4444', label: '🔴 Advanced' },
};

export default function TrainingPage() {
  const [drills, setDrills] = useState([]);
  const [category, setCategory] = useState('all');
  const [position, setPosition] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedDrill, setExpandedDrill] = useState(null);
  const [difficulty, setDifficulty] = useState('all');
  const [practicePlan, setPracticePlan] = useState([]);
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('training_drills').select('*').order('sort_order');
      if (data) setDrills(data);
    }
    load();
  }, []);

  const filtered = drills.filter(d => {
    if (category !== 'all' && d.category !== category) return false;
    if (position !== 'all' && d.position_group !== position && d.position_group !== 'all') return false;
    if (difficulty !== 'all' && d.difficulty !== difficulty) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.skill_focus.toLowerCase().includes(q) ||
        d.tags?.some(t => t.includes(q)) || d.description.toLowerCase().includes(q);
    }
    return true;
  });

  function addToPlan(drill) {
    if (!practicePlan.find(p => p.id === drill.id)) {
      setPracticePlan(prev => [...prev, drill]);
    }
  }

  function removeFromPlan(drillId) {
    setPracticePlan(prev => prev.filter(p => p.id !== drillId));
  }

  const totalPlanMinutes = practicePlan.reduce((sum, d) => sum + (d.duration_minutes || 10), 0);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dumbbell size={24} /> Training & Drills
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            {drills.length} drills • Filter by position, skill, or difficulty
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {practicePlan.length > 0 && (
            <button onClick={() => setShowPlanBuilder(!showPlanBuilder)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              background: 'rgba(253,185,19,0.15)', color: '#FDB913', border: '1px solid rgba(253,185,19,0.3)',
              borderRadius: 8, cursor: 'pointer', position: 'relative',
            }}>
              <GraduationCap size={14} /> Practice Plan ({practicePlan.length})
              <span style={{
                position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                background: '#FDB913', color: '#000', fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{practicePlan.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drills, skills, or tags..."
            style={{ width: '100%', padding: '8px 8px 8px 32px', fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
        </div>
        {/* Position Filter */}
        <select value={position} onChange={e => setPosition(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer' }}>
          {POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {/* Difficulty Filter */}
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 13, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="all">All Levels</option>
          <option value="beginner">🟢 Beginner</option>
          <option value="intermediate">🟡 Intermediate</option>
          <option value="advanced">🔴 Advanced</option>
        </select>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, border: '1px solid', borderRadius: 20,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms',
              background: category === c.id ? 'rgba(0,154,68,0.15)' : 'transparent',
              borderColor: category === c.id ? 'var(--rocks-green)' : 'var(--border)',
              color: category === c.id ? 'var(--rocks-green-light)' : 'var(--text-dim)',
            }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Drill Cards */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, fontWeight: 600 }}>
            {filtered.length} drill{filtered.length !== 1 ? 's' : ''} found
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(drill => {
              const isExpanded = expandedDrill === drill.id;
              const diff = DIFFICULTY_COLORS[drill.difficulty] || DIFFICULTY_COLORS.beginner;
              const inPlan = practicePlan.find(p => p.id === drill.id);

              return (
                <motion.div key={drill.id} layout
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, overflow: 'hidden',
                    borderLeft: `3px solid ${diff.text}`,
                  }}>
                  {/* Drill Header */}
                  <div onClick={() => setExpandedDrill(isExpanded ? null : drill.id)}
                    style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{drill.name}</span>
                        <span style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 4,
                          background: diff.bg, border: `1px solid ${diff.border}`, color: diff.text,
                        }}>{drill.difficulty}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-dim)' }}>
                        <span><Target size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{drill.skill_focus}</span>
                        <span><Users size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{drill.players_needed} players</span>
                        <span><Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{drill.duration_minutes} min</span>
                        <span style={{ textTransform: 'uppercase', fontWeight: 600, color: diff.text, fontSize: 10 }}>
                          {drill.position_group === 'all' ? 'ALL POS' : drill.position_group?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={(e) => { e.stopPropagation(); inPlan ? removeFromPlan(drill.id) : addToPlan(drill); }}
                        style={{
                          padding: '4px 10px', fontSize: 10, fontWeight: 600, border: '1px solid',
                          borderRadius: 4, cursor: 'pointer',
                          background: inPlan ? 'rgba(0,154,68,0.2)' : 'transparent',
                          borderColor: inPlan ? '#009A44' : 'var(--border)',
                          color: inPlan ? '#4ADE80' : 'var(--text-dim)',
                        }}>
                        {inPlan ? '✓ In Plan' : '+ Add'}
                      </button>
                      {isExpanded ? <ChevronUp size={16} color="var(--text-dim)" /> : <ChevronDown size={16} color="var(--text-dim)" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          {/* Description */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{drill.description}</div>
                          </div>

                          {/* Setup */}
                          {drill.setup && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setup</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, borderLeft: '2px solid rgba(0,154,68,0.3)' }}>
                                {drill.setup}
                              </div>
                            </div>
                          )}

                          {/* Coaching Points */}
                          {drill.coaching_points?.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#FDB913', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🏈 Coaching Points
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {drill.coaching_points.map((cp, i) => (
                                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <span style={{ color: '#FDB913', fontWeight: 700, flexShrink: 0 }}>✦</span>
                                    {cp}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Equipment */}
                          {drill.equipment?.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>Equipment</div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {drill.equipment.map(e => (
                                  <span key={e} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60A5FA' }}>
                                    {e}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Variations */}
                          {drill.variations?.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>Variations</div>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {drill.variations.map(v => (
                                  <span key={v} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {drill.tags?.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {drill.tags.map(t => (
                                <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)' }}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Practice Plan Builder Sidebar */}
        {showPlanBuilder && practicePlan.length > 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            style={{
              width: 300, flexShrink: 0, position: 'sticky', top: 24, alignSelf: 'flex-start',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(253,185,19,0.2)',
              borderRadius: 10, padding: 16,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FDB913' }}>
                <GraduationCap size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Practice Plan
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {totalPlanMinutes} min total
              </div>
            </div>

            {/* Time bar */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (totalPlanMinutes / 90) * 100)}%`, background: totalPlanMinutes > 90 ? '#EF4444' : '#FDB913', borderRadius: 2, transition: 'width 300ms' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {practicePlan.map((drill, i) => (
                <div key={drill.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11,
                }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>{i + 1}.</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{drill.name}</span>
                    <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>{drill.duration_minutes}m</span>
                  </div>
                  <button onClick={() => removeFromPlan(drill.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <X size={12} color="rgba(239,68,68,0.5)" />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={async () => {
              const supabase = createClient();
              const { error } = await supabase.from('practice_plans').insert({
                title: `Practice ${new Date().toLocaleDateString()}`,
                date: new Date().toISOString().split('T')[0],
                duration_minutes: totalPlanMinutes,
                drills: practicePlan.map(d => ({ id: d.id, name: d.name, duration: d.duration_minutes })),
              });
              if (!error) { alert('Practice plan saved!'); }
            }} style={{
              width: '100%', marginTop: 12, padding: '8px', fontSize: 12, fontWeight: 700,
              background: 'var(--rocks-green)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <Save size={12} /> Save Practice Plan
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
