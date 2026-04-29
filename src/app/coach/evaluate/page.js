'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Save, Users, Zap } from 'lucide-react';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

const METRICS = [
  { key: 'effort', label: 'Effort', emoji: '💪', desc: 'Hustle and intensity' },
  { key: 'discipline', label: 'Discipline', emoji: '🎯', desc: 'Following assignments' },
  { key: 'coachability', label: 'Coachability', emoji: '📋', desc: 'Takes direction well' },
  { key: 'technique', label: 'Technique', emoji: '⚡', desc: 'Fundamental skills' },
  { key: 'physicality', label: 'Physicality', emoji: '🏈', desc: 'Strength & conditioning' },
];

export default function EvaluatePage() {
  const [players, setPlayers] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('select'); // 'select' or 'evaluate'

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('players').select('*').order('jersey_number');
      setPlayers(data || []);
      setLoading(false);
    }
    load();
  }, []);

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
    toast.success(`${player.first_name} evaluated!`);
    setSaving(false);

    if (currentIdx < players.length - 1) {
      setCurrentIdx(currentIdx + 1);
      resetForm();
    } else {
      toast.success('All players evaluated! 🎉');
      setMode('select');
    }
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading roster...</div>;

  if (mode === 'select') {
    return (
      <div>
        <PageHeader title="Evaluate Players" subtitle="Sideline evaluation mode" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
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
        </div>
      </div>
    );
  }

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
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{metric.emoji} {metric.label}</span>
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
