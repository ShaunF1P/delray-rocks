'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Save, Users, Zap, TrendingUp, Brain, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge } from '@/components/ui/index';
import { FlexIcon, TargetIcon, PlaybookIcon, LightningIcon, FootballIcon } from '@/components/ui/Icons';
import { createClient } from '@/lib/supabase';
import { trackEvaluation } from '@/lib/track';
import toast from 'react-hot-toast';

const METRICS = [
  { key: 'effort', label: 'Effort', icon: FlexIcon, desc: 'Hustle and intensity' },
  { key: 'discipline', label: 'Discipline', icon: TargetIcon, desc: 'Following assignments' },
  { key: 'coachability', label: 'Coachability', icon: PlaybookIcon, desc: 'Takes direction well' },
  { key: 'technique', label: 'Technique', icon: LightningIcon, desc: 'Fundamental skills' },
  { key: 'physicality', label: 'Physicality', icon: FootballIcon, desc: 'Strength & conditioning' },
];

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE — Inline SVG mini chart (no external library)
   ═══════════════════════════════════════════════════════════════ */
function Sparkline({ values, width = 120, height = 32 }) {
  if (!values || values.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fill="#6B7280" fontSize="9">—</text>
      </svg>
    );
  }

  const padX = 4;
  const padY = 4;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const minVal = 1;
  const maxVal = 5;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * chartW;
    const y = padY + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
    return { x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Area fill path
  const areaPath = `M ${points[0].x},${padY + chartH} ` +
    points.map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x},${padY + chartH} Z`;

  // Determine trend
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  let color;
  if (diff > 0.3) color = '#4ADE80';
  else if (diff < -0.3) color = '#EF4444';
  else color = '#6B7280';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <path d={areaPath} fill={color} fillOpacity={0.1} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={color} />
    </svg>
  );
}

export default function EvaluatePage() {
  const [players, setPlayers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('select'); // 'select', 'evaluate', or 'trends'
  const [aiInsights, setAiInsights] = useState({}); // { [playerId]: string }
  const [loadingInsight, setLoadingInsight] = useState(null); // playerId currently loading

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [playerRes, evalRes] = await Promise.all([
        supabase.from('players').select('*').order('jersey_number'),
        supabase.from('evaluations').select('*').order('created_at'),
      ]);
      setPlayers(playerRes.data || []);
      setEvaluations(evalRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  // Group evaluations by player
  const evalsByPlayer = useMemo(() => {
    const map = {};
    (evaluations || []).forEach(e => {
      if (!map[e.player_id]) map[e.player_id] = [];
      map[e.player_id].push(e);
    });
    return map;
  }, [evaluations]);

  const player = players[currentIdx];

  function resetForm() {
    const initial = {};
    METRICS.forEach(m => { initial[m.key] = 3; });
    setScores(initial);
    setNotes('');
  }

  function startEval() {
    resetForm();
    setMode('evaluate');
  }

  async function saveEval() {
    if (!player) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('evaluations').insert({
      player_id: player.id,
      ...scores,
      notes,
      eval_type: 'practice',
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    trackEvaluation(`${player.first_name} ${player.last_name}`);
    toast.success(`${player.first_name} evaluated!`);

    // Add to local state
    setEvaluations(prev => [...prev, { player_id: player.id, ...scores, notes, eval_type: 'practice', created_at: new Date().toISOString() }]);
    setSaving(false);

    if (currentIdx < players.length - 1) {
      setCurrentIdx(currentIdx + 1);
      resetForm();
    } else {
      toast.success('All players evaluated!');
      setMode('select');
    }
  }

  async function fetchInsight(playerId) {
    // Cache check
    if (aiInsights[playerId]) return;
    setLoadingInsight(playerId);
    try {
      const res = await fetch('/api/evaluate/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data.insight) {
        setAiInsights(prev => ({ ...prev, [playerId]: data.insight }));
      } else {
        setAiInsights(prev => ({ ...prev, [playerId]: 'Unable to generate insights at this time.' }));
      }
    } catch (err) {
      console.error(err);
      setAiInsights(prev => ({ ...prev, [playerId]: 'Error fetching insights. Please try again.' }));
    }
    setLoadingInsight(null);
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading roster...</div>;

  /* ═══════════════════════════════════════════════════════════════
     TRENDS VIEW
     ═══════════════════════════════════════════════════════════════ */
  if (mode === 'trends') {
    return (
      <div>
        <PageHeader
          title="Player Trends"
          subtitle={`${players.length} players • ${evaluations.length} total evaluations`}
          actions={<Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => setMode('select')}>Back</Button>}
        />

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: 'var(--space-lg)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 3, background: '#4ADE80', borderRadius: 2, display: 'inline-block' }} /> Trending Up
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 3, background: '#EF4444', borderRadius: 2, display: 'inline-block' }} /> Trending Down
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 3, background: '#6B7280', borderRadius: 2, display: 'inline-block' }} /> Flat
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {players.map((p, pi) => {
            const playerEvals = evalsByPlayer[p.id] || [];
            const lastEvals = playerEvals.slice(-8); // Last 8 evaluations
            const hasData = lastEvals.length >= 1;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pi * 0.03 }}
              >
                <Card style={{ padding: 'var(--space-md)' }}>
                  {/* Player Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: hasData ? 'var(--space-md)' : 0 }}>
                    <Avatar name={`${p.first_name} ${p.last_name}`} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{p.first_name} {p.last_name}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 2 }}>
                        {p.jersey_number && <Badge variant="green">#{p.jersey_number}</Badge>}
                        {p.position && <PositionBadge position={p.position} />}
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                          {playerEvals.length} eval{playerEvals.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* AI Insight Button */}
                    {hasData && (
                      <button
                        onClick={() => fetchInsight(p.id)}
                        disabled={loadingInsight === p.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', fontSize: 11, fontWeight: 600,
                          background: aiInsights[p.id] ? 'rgba(139,92,246,0.1)' : 'rgba(253,185,19,0.1)',
                          border: `1px solid ${aiInsights[p.id] ? 'rgba(139,92,246,0.2)' : 'rgba(253,185,19,0.2)'}`,
                          borderRadius: 8, cursor: loadingInsight === p.id ? 'wait' : 'pointer',
                          color: aiInsights[p.id] ? '#A78BFA' : '#FDB913',
                          transition: 'all 150ms ease',
                          opacity: loadingInsight === p.id ? 0.7 : 1,
                        }}
                      >
                        {loadingInsight === p.id ? (
                          <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                        ) : aiInsights[p.id] ? (
                          <><Brain size={12} /> View Insight</>
                        ) : (
                          <><Brain size={12} /> AI Development Notes</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Sparklines Grid */}
                  {hasData && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '8px 16px',
                    }}>
                      {METRICS.map(metric => {
                        const metricValues = lastEvals.map(e => e[metric.key]).filter(v => v != null);
                        const latestVal = metricValues.length > 0 ? metricValues[metricValues.length - 1] : null;

                        return (
                          <div key={metric.key} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.04)',
                          }}>
                            <div style={{ width: 70, flexShrink: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <metric.icon size={11} color="var(--rocks-green-light)" />
                                {metric.label}
                              </div>
                            </div>
                            <Sparkline values={metricValues} width={80} height={28} />
                            {latestVal != null && (
                              <div style={{
                                fontSize: 14, fontWeight: 800, minWidth: 20, textAlign: 'center',
                                color: latestVal >= 4 ? '#4ADE80' : latestVal <= 2 ? '#EF4444' : 'var(--text-secondary)',
                              }}>
                                {latestVal}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* No data message */}
                  {!hasData && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 4 }}>
                      No evaluations yet
                    </div>
                  )}

                  {/* AI Insight Display */}
                  {aiInsights[p.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{
                        marginTop: 'var(--space-md)',
                        padding: '12px 16px',
                        background: 'rgba(139,92,246,0.06)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        borderRadius: 10,
                        borderLeft: '3px solid #A78BFA',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Brain size={13} color="#A78BFA" />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          AI Development Notes
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {aiInsights[p.id]}
                      </div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Spin animation for loader */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     SELECT MODE
     ═══════════════════════════════════════════════════════════════ */
  if (mode === 'select') {
    return (
      <div>
        <PageHeader title="Evaluate Players" subtitle="Sideline evaluation mode" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card highlight style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-2xl)' }} onClick={startEval}>
              <Zap size={40} color="var(--rocks-green-light)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '0.5rem' }}>Quick Evaluate All</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>Cycle through all {players.length} players one by one</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              <Users size={40} color="var(--rocks-gold)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '0.5rem' }}>Pick a Player</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', marginBottom: '1rem' }}>Choose a specific player to evaluate</p>
              <select className="form-input" onChange={e => { setCurrentIdx(parseInt(e.target.value)); startEval(); }} defaultValue="">
                <option value="" disabled>Select player...</option>
                {players.map((p, i) => <option key={p.id} value={i}>#{p.jersey_number || '?'} {p.first_name} {p.last_name}</option>)}
              </select>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-2xl)', borderColor: 'rgba(253,185,19,0.2)' }} onClick={() => setMode('trends')}>
              <TrendingUp size={40} color="var(--rocks-gold)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '0.5rem' }}>Trends & Insights</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
                Sparkline charts & AI development notes
              </p>
              {evaluations.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <Badge variant="gold">{evaluations.length} evaluations tracked</Badge>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     EVALUATE MODE (unchanged from original)
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div>
      <PageHeader title="Evaluating" subtitle={`Player ${currentIdx + 1} of ${players.length}`} actions={<Button variant="ghost" onClick={() => setMode('select')}>Exit</Button>} />

      {/* Progress */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginBottom: 4 }}>
          <span>Progress</span><span>{Math.round(((currentIdx) / players.length) * 100)}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <motion.div animate={{ width: `${(currentIdx / players.length) * 100}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #106B3A, #009A44)', borderRadius: 'var(--radius-full)' }} />
        </div>
      </div>

      {/* Player Card */}
      <motion.div key={player?.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <Card style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'var(--space-xl)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border)' }}>
            <Avatar name={player ? `${player.first_name} ${player.last_name}` : ''} size={56} />
            <div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>{player?.first_name} {player?.last_name}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                {player?.jersey_number && <Badge variant="green">#{player.jersey_number}</Badge>}
                {player?.position && <PositionBadge position={player.position} />}
              </div>
            </div>
          </div>

          {/* Scoring */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {METRICS.map(metric => (
              <div key={metric.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><metric.icon size={16} color="var(--rocks-green-light)" /> {metric.label}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{metric.desc}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <button key={val} onClick={() => setScores(s => ({ ...s, [metric.key]: val }))}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                        border: `2px solid ${scores[metric.key] === val ? '#009A44' : 'var(--border)'}`,
                        background: scores[metric.key] === val ? 'rgba(16, 107, 58, 0.15)' : 'var(--bg-glass)',
                        color: scores[metric.key] === val ? '#009A44' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-lg)',
                        transition: 'all 150ms ease',
                      }}>{val}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
            <label className="form-label">Coach Notes</label>
            <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Quick notes on this player..." rows={3} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'var(--space-xl)', justifyContent: 'space-between' }}>
            <Button variant="ghost" icon={<ChevronLeft size={16} />} disabled={currentIdx === 0} onClick={() => { setCurrentIdx(currentIdx - 1); resetForm(); }}>Previous</Button>
            <Button variant="primary" icon={<Save size={16} />} loading={saving} onClick={saveEval}>
              {currentIdx < players.length - 1 ? 'Save & Next' : 'Save & Finish'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
