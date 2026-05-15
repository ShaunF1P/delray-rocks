'use client';

import { useState, useEffect } from 'react';
import { createClient, getUserWithProfile } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { TrendingUp, Star, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProgressPage() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => { loadProgress(); }, []);

  async function loadProgress() {
    const { user } = await getUserWithProfile();
    if (!user) return;

    const supabase = createClient();
    let kids = [];

    // Strategy 1: guardian_email
    try {
      const { data } = await supabase.from('players').select('*').ilike('guardian_email', user.email).order('first_name');
      if (data && data.length > 0) kids = data;
    } catch (e) {}

    // Strategy 2: player_guardians junction
    if (kids.length === 0) {
      try {
        const { data: links } = await supabase.from('player_guardians').select('player_id').eq('guardian_id', user.id);
        if (links && links.length > 0) {
          const { data } = await supabase.from('players').select('*').in('id', links.map(l => l.player_id)).order('first_name');
          if (data) kids = data;
        }
      } catch (e) {}
    }

    // Load evaluations separately
    for (let kid of kids) {
      try {
        const { data: evals } = await supabase.from('evaluations')
          .select('id, effort, discipline, coachability, notes, created_at')
          .eq('player_id', kid.id).order('created_at', { ascending: false });
        kid.evaluations = evals || [];
      } catch (e) { kid.evaluations = []; }
    }

    if (kids.length > 0) setChildren(kids);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: 32, marginBottom: 12 }}>📈</motion.div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading progress data...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={24} color="#4ADE80" /> Player Progress
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
          Track your child's development over the season
        </p>
      </div>

      {children.map((child, ci) => {
        const evals = (child.evaluations || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const latest = evals[evals.length - 1];
        const first = evals[0];
        const isExpanded = expanded[child.id];

        // Calculate growth
        let effortGrowth = 0, discGrowth = 0, coachGrowth = 0;
        if (first && latest && evals.length > 1) {
          effortGrowth = latest.effort - first.effort;
          discGrowth = latest.discipline - first.discipline;
          coachGrowth = latest.coachability - first.coachability;
        }

        return (
          <motion.div key={child.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.1 }}
            style={{
              marginBottom: 16, borderRadius: 12,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(0,154,68,0.08), rgba(253,185,19,0.04))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #009A44, #4ADE80)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 900, color: '#fff',
                }}>
                  {child.jersey_number || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    {child.first_name} {child.last_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {child.position || 'ATH'} • {evals.length} evaluations
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Indicators */}
            {evals.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 20px' }}>
                {[
                  { label: 'Effort', growth: effortGrowth, color: '#4ADE80' },
                  { label: 'Discipline', growth: discGrowth, color: '#60A5FA' },
                  { label: 'Coachability', growth: coachGrowth, color: '#FDB913' },
                ].map(g => (
                  <div key={g.label} style={{
                    padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 16, fontWeight: 800,
                      color: g.growth > 0 ? '#4ADE80' : g.growth < 0 ? '#EF4444' : 'var(--text-dim)',
                    }}>
                      {g.growth > 0 ? '+' : ''}{g.growth}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>{g.label} Growth</div>
                  </div>
                ))}
              </div>
            )}

            {/* Visual Progress Bars */}
            {latest && (
              <div style={{ padding: '0 20px 16px' }}>
                {[
                  { label: 'Effort', value: latest.effort, color: '#4ADE80' },
                  { label: 'Discipline', value: latest.discipline, color: '#60A5FA' },
                  { label: 'Coachability', value: latest.coachability, color: '#FDB913' },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>{s.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}/5</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.value / 5) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        style={{ height: '100%', borderRadius: 3, background: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expandable History */}
            <button onClick={() => setExpanded(p => ({ ...p, [child.id]: !p[child.id] }))}
              style={{
                width: '100%', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                background: 'rgba(255,255,255,0.02)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
              }}>
              {isExpanded ? 'Hide' : 'View'} Evaluation History
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {isExpanded && (
              <div style={{ padding: '0 20px 16px' }}>
                {evals.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                    No evaluations recorded yet
                  </div>
                ) : (
                  evals.map((ev, i) => (
                    <div key={ev.id} style={{
                      padding: '10px 12px', marginBottom: 4, borderRadius: 6,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
                          Evaluation #{i + 1}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                          {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                        <span>Effort: <strong style={{ color: '#4ADE80' }}>{ev.effort}/5</strong></span>
                        <span>Discipline: <strong style={{ color: '#60A5FA' }}>{ev.discipline}/5</strong></span>
                        <span>Coachability: <strong style={{ color: '#FDB913' }}>{ev.coachability}/5</strong></span>
                      </div>
                      {ev.notes && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>
                          "{ev.notes}"
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        );
      })}

      {children.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>No Player Data Found</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            Contact your coach to link your email to your child's roster profile.
          </div>
        </div>
      )}
    </div>
  );
}
