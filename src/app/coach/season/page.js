'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Trophy, Target, Zap, Shield } from 'lucide-react';

export default function SeasonPage() {
  const [games, setGames] = useState([]);
  const [playCalls, setPlayCalls] = useState([]);
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSeasonData(); }, []);

  async function loadSeasonData() {
    const supabase = createClient();
    const [gRes, pcRes, pRes] = await Promise.all([
      supabase.from('game_films').select('*').order('created_at', { ascending: false }),
      supabase.from('play_calls').select('*').order('called_at', { ascending: false }),
      supabase.from('playbook_plays').select('id, name, play_type, direction').order('name'),
    ]);
    if (gRes.data) setGames(gRes.data);
    if (pcRes.data) setPlayCalls(pcRes.data);
    if (pRes.data) setPlays(pRes.data);
    setLoading(false);
  }

  // Compute stats
  const totalGames = games.length;
  const totalPlaysCalled = playCalls.length;

  // Play frequency
  const playFreq = {};
  playCalls.forEach(pc => {
    const name = plays.find(p => p.id === pc.play_id)?.name || 'Unknown';
    if (!playFreq[name]) playFreq[name] = 0;
    playFreq[name]++;
  });
  const topPlays = Object.entries(playFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Play type breakdown
  const typeCount = { run: 0, pass: 0, trick: 0, zone: 0, man: 0, blitz: 0 };
  playCalls.forEach(pc => {
    const play = plays.find(p => p.id === pc.play_id);
    if (play && typeCount[play.play_type] !== undefined) typeCount[play.play_type]++;
  });

  // Down distribution
  const downDist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  playCalls.forEach(pc => { if (pc.down) downDist[pc.down]++; });

  // Quarter distribution
  const qtrDist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  playCalls.forEach(pc => { if (pc.quarter) qtrDist[pc.quarter]++; });

  // Success rate
  const graded = playCalls.filter(pc => pc.result);
  const successes = playCalls.filter(pc => pc.result === 'success').length;
  const fails = playCalls.filter(pc => pc.result === 'fail').length;
  const successRate = graded.length > 0 ? Math.round((successes / graded.length) * 100) : 0;

  // Opponent defense frequency
  const defFreq = {};
  playCalls.forEach(pc => { if (pc.opp_defense) defFreq[pc.opp_defense] = (defFreq[pc.opp_defense] || 0) + 1; });
  const topDefenses = Object.entries(defFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const maxFreq = topPlays.length > 0 ? topPlays[0][1] : 1;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={24} color="#009A44" /> Season Analytics
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
          Aggregate play-calling trends and tendencies across the entire season
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading season data...</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Games', value: totalGames, icon: Trophy, color: '#FDB913' },
              { label: 'Total Plays', value: totalPlaysCalled, icon: Zap, color: '#4ADE80' },
              { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: successRate >= 60 ? '#4ADE80' : successRate >= 40 ? '#FDB913' : '#EF4444' },
              { label: 'Unique Plays', value: Object.keys(playFreq).length, icon: Target, color: '#60A5FA' },
              { label: 'Defenses Tagged', value: Object.keys(defFreq).length, icon: Shield, color: '#EF4444' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{
                  padding: 16, borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                <stat.icon size={16} color={stat.color} />
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 4 }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Top Plays Chart */}
          <div style={{
            padding: 16, marginBottom: 16, borderRadius: 10,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80', marginBottom: 12 }}>🏆 Most Called Plays</div>
            {topPlays.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: 20, textAlign: 'center' }}>No play data yet. Use the Sideline module during games.</div>
            ) : topPlays.map(([name, count], i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 20, fontSize: 10, color: 'var(--text-dim)', textAlign: 'right', fontWeight: 600 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{name}</div>
                  <div style={{
                    height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3, width: `${(count / maxFreq) * 100}%`,
                      background: `linear-gradient(90deg, #009A44, #4ADE80)`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80', width: 30, textAlign: 'right' }}>{count}</div>
              </div>
            ))}
          </div>

          {/* Play Type & Down Breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* Play Type */}
            <div style={{
              padding: 16, borderRadius: 10,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', marginBottom: 10 }}>⚔️ Play Type Split</div>
              {Object.entries(typeCount).filter(([, v]) => v > 0).map(([type, count]) => {
                const pct = totalPlaysCalled > 0 ? Math.round(count / totalPlaysCalled * 100) : 0;
                const colors = { run: '#4ADE80', pass: '#60A5FA', trick: '#A855F7', zone: '#14B8A6', man: '#F43F5E', blitz: '#EC4899' };
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 50, fontSize: 11, fontWeight: 600, color: colors[type] || '#fff', textTransform: 'capitalize' }}>{type}</div>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: colors[type] }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', width: 35, textAlign: 'right' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>

            {/* Down Distribution */}
            <div style={{
              padding: 16, borderRadius: 10,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FDB913', marginBottom: 10 }}>📊 Down Distribution</div>
              {Object.entries(downDist).map(([down, count]) => {
                const pct = totalPlaysCalled > 0 ? Math.round(count / totalPlaysCalled * 100) : 0;
                const labels = { 1: '1st Down', 2: '2nd Down', 3: '3rd Down', 4: '4th Down' };
                return (
                  <div key={down} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: '#fff' }}>{labels[down]}</div>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: '#FDB913' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', width: 35, textAlign: 'right' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quarter Activity */}
          <div style={{
            padding: 16, borderRadius: 10, marginBottom: 16,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A855F7', marginBottom: 10 }}>⏱️ Plays by Quarter</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
              {Object.entries(qtrDist).map(([q, count]) => {
                const maxQ = Math.max(...Object.values(qtrDist), 1);
                const pct = (count / maxQ) * 100;
                return (
                  <div key={q} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: `${Math.max(pct, 5)}%`, background: 'linear-gradient(180deg, #A855F7, rgba(168,85,247,0.3))',
                      borderRadius: '4px 4px 0 0', transition: 'height 0.6s ease', minHeight: 4,
                    }} />
                    <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, marginTop: 4 }}>Q{q}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opponent Defense Frequency */}
          {topDefenses.length > 0 && (
            <div style={{
              padding: 16, borderRadius: 10, marginBottom: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 10 }}>🛡️ Opponent Defenses Seen (Season)</div>
              {topDefenses.map(([def, count]) => {
                const totalTagged = Object.values(defFreq).reduce((s, v) => s + v, 0);
                const pct = totalTagged > 0 ? Math.round(count / totalTagged * 100) : 0;
                return (
                  <div key={def} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 70, fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{def.replace(/_/g, ' ')}</div>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: '#EF4444' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', width: 50, textAlign: 'right' }}>{pct}% ({count})</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
