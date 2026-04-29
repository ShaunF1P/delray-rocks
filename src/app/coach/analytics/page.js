'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';
import { Card, PageHeader, Badge, Avatar, PositionBadge } from '@/components/ui/index';
import { StatCard } from '@/components/ui/StatCard';
import { createClient, getPlayerAge } from '@/lib/supabase';

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ players: 0, evals: 0, avgScore: 0, attendanceRate: 0 });
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { count: playerCount } = await supabase.from('players').select('*', { count: 'exact', head: true });
      const { data: evals } = await supabase.from('evaluations').select('*, players(first_name, last_name, position, jersey_number)');
      const { data: attendance } = await supabase.from('attendance').select('present');

      const totalAtt = attendance?.length || 0;
      const presentAtt = attendance?.filter(a => a.present)?.length || 0;
      const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

      // Aggregate eval scores by player
      const playerScores = {};
      (evals || []).forEach(ev => {
        if (!ev.player_id) return;
        if (!playerScores[ev.player_id]) {
          playerScores[ev.player_id] = { player: ev.players, scores: [], count: 0 };
        }
        const avg = ((ev.effort || 0) + (ev.discipline || 0) + (ev.coachability || 0) + (ev.technique || 0) + (ev.physicality || 0)) / 5;
        playerScores[ev.player_id].scores.push(avg);
        playerScores[ev.player_id].count++;
      });

      const ranked = Object.values(playerScores)
        .map(p => ({ ...p, avgScore: p.scores.reduce((a, b) => a + b, 0) / p.scores.length }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 10);

      const overallAvg = ranked.length > 0 ? Math.round(ranked.reduce((a, b) => a + b.avgScore, 0) / ranked.length * 20) : 0;

      setStats({ players: playerCount || 0, evals: evals?.length || 0, avgScore: overallAvg, attendanceRate: attRate });
      setTopPlayers(ranked);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Team performance insights and player rankings" />

      <div className="stat-grid stagger-children" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon="🏈" value={stats.players} label="Total Players" color="green" delay={0} />
        <StatCard icon="📊" value={stats.evals} label="Evaluations" color="blue" delay={1} />
        <StatCard icon="⭐" value={`${stats.avgScore}%`} label="Avg Score" color="gold" delay={2} />
        <StatCard icon="✅" value={`${stats.attendanceRate}%`} label="Attendance" color="teal" delay={3} />
      </div>

      {/* Top Players */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--rocks-gold)" /> Player Rankings
            </h3>
          </div>

          {topPlayers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
              No evaluations yet. Start evaluating players to see rankings.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topPlayers.map((entry, i) => {
                const p = entry.player;
                const score = Math.round(entry.avgScore * 20);
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                    background: i < 3 ? 'rgba(16,107,58,0.04)' : 'transparent',
                    border: i < 3 ? '1px solid rgba(16,107,58,0.1)' : '1px solid transparent',
                  }}>
                    <span style={{ width: 28, textAlign: 'center', fontSize: medal ? '1.2rem' : 'var(--text-sm)', fontWeight: 700, color: 'var(--text-dim)' }}>
                      {medal || `#${i + 1}`}
                    </span>
                    <Avatar name={p ? `${p.first_name} ${p.last_name}` : ''} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{p?.first_name} {p?.last_name}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {p?.position && <PositionBadge position={p.position} />}
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{entry.count} evals</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 120, height: 6, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444', borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, width: 40, textAlign: 'right', color: score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444' }}>{score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
