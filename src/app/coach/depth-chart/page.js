'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Shield, Users, ChevronDown, Save, RotateCcw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const POSITIONS = {
  offense: [
    { key: 'QB', label: 'Quarterback' },
    { key: 'TB', label: 'Tailback' },
    { key: 'FB', label: 'Fullback' },
    { key: 'C', label: 'Center' },
    { key: 'LG', label: 'Left Guard' },
    { key: 'RG', label: 'Right Guard' },
    { key: 'LT', label: 'Left Tackle' },
    { key: 'RT', label: 'Right Tackle' },
    { key: 'TE', label: 'Tight End' },
    { key: 'WR', label: 'Wide Receiver' },
    { key: 'SE', label: 'Split End' },
  ],
  defense: [
    { key: 'DT1', label: 'Nose Tackle' },
    { key: 'DT2', label: 'Defensive Tackle' },
    { key: 'DE1', label: 'Left End' },
    { key: 'DE2', label: 'Right End' },
    { key: 'MLB', label: 'Middle Linebacker' },
    { key: 'OLB1', label: 'Outside LB (L)' },
    { key: 'OLB2', label: 'Outside LB (R)' },
    { key: 'CB1', label: 'Cornerback (L)' },
    { key: 'CB2', label: 'Cornerback (R)' },
    { key: 'FS', label: 'Free Safety' },
    { key: 'SS', label: 'Strong Safety' },
  ],
  special: [
    { key: 'K', label: 'Kicker' },
    { key: 'P', label: 'Punter' },
    { key: 'KR', label: 'Kick Returner' },
    { key: 'PR', label: 'Punt Returner' },
    { key: 'LS', label: 'Long Snapper' },
  ],
};

export default function DepthChartPage() {
  const [roster, setRoster] = useState([]);
  const [depthChart, setDepthChart] = useState({});
  const [side, setSide] = useState('offense');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evalScores, setEvalScores] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const [rRes, dRes, eRes] = await Promise.all([
      supabase.from('players').select('id, first_name, last_name, jersey_number, position').order('jersey_number'),
      supabase.from('depth_chart').select('*').order('string_num'),
      supabase.from('evaluations').select('player_id, effort, discipline, coachability, technique, physicality, created_at').order('created_at', { ascending: false }),
    ]);
    if (rRes.data) setRoster(rRes.data);
    if (dRes.data) {
      const chart = {};
      dRes.data.forEach(d => {
        if (!chart[d.position_key]) chart[d.position_key] = {};
        chart[d.position_key][d.string_num] = d.player_id;
      });
      setDepthChart(chart);
    }
    setLoading(false);
    if (eRes.data && eRes.data.length > 0) {
      const latestEvals = {};
      eRes.data.forEach(ev => {
        if (!latestEvals[ev.player_id]) {
          latestEvals[ev.player_id] = ev;
        }
      });
      const scores = {};
      Object.entries(latestEvals).forEach(([pid, ev]) => {
        scores[pid] = ((ev.effort + ev.discipline + ev.coachability + ev.technique + ev.physicality) / 5).toFixed(1);
      });
      setEvalScores(scores);
    }
  }

  function setPlayer(posKey, stringNum, playerId) {
    setDepthChart(prev => {
      const next = { ...prev };
      if (!next[posKey]) next[posKey] = {};
      next[posKey] = { ...next[posKey], [stringNum]: playerId || null };
      return next;
    });
  }

  async function saveDepthChart() {
    setSaving(true);
    const supabase = createClient();
    // Delete existing entries
    await supabase.from('depth_chart').delete().gte('created_at', '2000-01-01');

    const rows = [];
    Object.entries(depthChart).forEach(([posKey, strings]) => {
      Object.entries(strings).forEach(([stringNum, playerId]) => {
        if (playerId) {
          rows.push({ position_key: posKey, string_num: parseInt(stringNum), player_id: playerId });
        }
      });
    });

    if (rows.length > 0) {
      const { error } = await supabase.from('depth_chart').insert(rows);
      if (error) { toast.error('Save failed: ' + error.message); setSaving(false); return; }
    }
    toast.success('Depth chart saved!');
    setSaving(false);
  }

  function getPlayerName(playerId) {
    const p = roster.find(r => r.id === playerId);
    return p ? `#${p.jersey_number || '?'} ${p.first_name} ${p.last_name?.charAt(0)}.` : '';
  }

  function getHigherRatedAlternative(posKey) {
    const starterId = depthChart[posKey]?.[1];
    if (!starterId || !evalScores[starterId]) return null;
    const starterScore = parseFloat(evalScores[starterId]);

    const alternatives = roster.filter(p =>
      p.id !== starterId &&
      evalScores[p.id] &&
      parseFloat(evalScores[p.id]) > starterScore
    );

    if (alternatives.length === 0) return null;
    alternatives.sort((a, b) => parseFloat(evalScores[b.id]) - parseFloat(evalScores[a.id]));
    return alternatives[0];
  }

  const positions = POSITIONS[side] || [];
  const filledCount = Object.values(depthChart).reduce((sum, strings) => sum + Object.values(strings).filter(Boolean).length, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={24} color="#009A44" /> Depth Chart
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
            {filledCount} positions assigned • {roster.length} players on roster
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDepthChart({})} style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444',
            display: 'flex', alignItems: 'center', gap: 4,
          }}><RotateCcw size={12} /> Reset</button>
          <button onClick={saveDepthChart} disabled={saving} style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: saving ? 'wait' : 'pointer',
            background: 'rgba(0,154,68,0.2)', border: '1px solid rgba(0,154,68,0.3)', color: '#4ADE80',
            display: 'flex', alignItems: 'center', gap: 4,
          }}><Save size={12} /> {saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {/* Side Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        {['offense', 'defense', 'special'].map(s => (
          <button key={s} onClick={() => setSide(s)} style={{
            flex: 1, padding: '8px', fontSize: 12, fontWeight: 700, border: '1px solid',
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
            borderRadius: s === 'offense' ? '8px 0 0 8px' : s === 'special' ? '0 8px 8px 0' : '0',
            background: side === s ? 'rgba(0,154,68,0.2)' : 'rgba(255,255,255,0.03)',
            borderColor: side === s ? '#009A44' : 'rgba(255,255,255,0.1)',
            color: side === s ? '#4ADE80' : 'rgba(255,255,255,0.4)',
          }}>{s === 'offense' ? '⚔️' : s === 'defense' ? '🛡️' : '⚡'} {s}</button>
        ))}
      </div>

      {/* Depth Chart Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 8, padding: '0 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Position</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase' }}>1st String</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>2nd String</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#FDB913', textTransform: 'uppercase' }}>3rd String</div>
        </div>

        {positions.map((pos, i) => (
          <motion.div key={pos.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 8, padding: '6px 8px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8,
            }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{pos.key}</div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{pos.label}</div>
              {(() => {
                const alt = getHigherRatedAlternative(pos.key);
                if (!alt) return null;
                return (
                  <div style={{
                    marginTop: 3, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                    background: 'rgba(253,185,19,0.1)', border: '1px solid rgba(253,185,19,0.2)',
                    color: '#FDB913', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
                  }}>
                    <Zap size={8} /> #{alt.jersey_number} rated higher ({evalScores[alt.id]})
                  </div>
                );
              })()}
            </div>
            {[1, 2, 3].map(stringNum => (
              <div key={stringNum} style={{ position: 'relative' }}>
                <select value={depthChart[pos.key]?.[stringNum] || ''} onChange={e => setPlayer(pos.key, stringNum, e.target.value)}
                  style={{
                    width: '100%', padding: '6px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                    background: depthChart[pos.key]?.[stringNum] ? 'rgba(0,154,68,0.08)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${depthChart[pos.key]?.[stringNum] ? 'rgba(0,154,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    color: depthChart[pos.key]?.[stringNum] ? '#fff' : 'rgba(255,255,255,0.3)',
                  }}>
                  <option value="">—</option>
                  {roster.map(p => (
                    <option key={p.id} value={p.id}>#{p.jersey_number || '?'} {p.first_name} {p.last_name}</option>
                  ))}
                </select>
                {stringNum === 1 && depthChart[pos.key]?.[1] && evalScores[depthChart[pos.key][1]] && (
                  <div style={{
                    position: 'absolute', top: -6, right: -4, padding: '1px 4px', borderRadius: 4,
                    background: 'rgba(0,154,68,0.2)', border: '1px solid rgba(0,154,68,0.3)',
                    fontSize: 8, fontWeight: 700, color: '#4ADE80',
                  }}>
                    {evalScores[depthChart[pos.key][1]]}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
