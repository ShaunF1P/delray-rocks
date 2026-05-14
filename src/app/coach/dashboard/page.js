'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, TrendingUp, Plus, Star, ClipboardCheck, Zap, Shield, BarChart3, Gamepad2, Trophy, Brain, BookOpen, FileText } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge } from '@/components/ui/index';
import { FootballIcon, CalendarIcon, ClipboardCheckIcon, DollarIcon, StadiumIcon, PlaybookIcon } from '@/components/ui/Icons';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function CoachDashboard() {
  const [stats, setStats] = useState({
    totalPlayers: 0, upcomingEvents: 0, attendanceRate: 0, activeFundraising: 0,
    totalPlaysCalled: 0, depthChartFilled: 0, totalPlays: 0, savedPracticePlans: 0,
  });
  const [recentEvals, setRecentEvals] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [topPlays, setTopPlays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      const [playerRes, eventRes, evalRes, attendRes, campaignRes, callRes, depthRes, playsRes, practiceRes] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(5),
        supabase.from('evaluations').select('*, players(first_name, last_name, position, jersey_number)').order('created_at', { ascending: false }).limit(5),
        supabase.from('attendance').select('present'),
        supabase.from('fundraising_campaigns').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('play_calls').select('play_id, result').order('called_at', { ascending: false }),
        supabase.from('depth_chart').select('*', { count: 'exact', head: true }),
        supabase.from('playbook_plays').select('id, name', { count: 'exact', head: true }),
        supabase.from('practice_plans').select('*', { count: 'exact', head: true }),
      ]);

      const totalAttendance = attendRes.data?.length || 0;
      const presentCount = attendRes.data?.filter(a => a.present)?.length || 0;
      const rate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      // Top plays calculation
      const playFreq = {};
      const playResults = {};
      (callRes.data || []).forEach(c => {
        playFreq[c.play_id] = (playFreq[c.play_id] || 0) + 1;
        if (!playResults[c.play_id]) playResults[c.play_id] = { success: 0, fail: 0, total: 0 };
        playResults[c.play_id].total++;
        if (c.result === 'success') playResults[c.play_id].success++;
        if (c.result === 'fail') playResults[c.play_id].fail++;
      });

      const successRate = (callRes.data || []).filter(c => c.result === 'success').length;
      const totalGraded = (callRes.data || []).filter(c => c.result).length;

      setStats({
        totalPlayers: playerRes.count || 0,
        upcomingEvents: eventRes.data?.length || 0,
        attendanceRate: rate,
        activeFundraising: campaignRes.count || 0,
        totalPlaysCalled: callRes.data?.length || 0,
        depthChartFilled: depthRes.count || 0,
        totalPlays: playsRes.count || 0,
        savedPracticePlans: practiceRes.count || 0,
        successRate: totalGraded > 0 ? Math.round((successRate / totalGraded) * 100) : 0,
      });

      setRecentEvals(evalRes.data || []);
      setUpcomingEvents(eventRes.data || []);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="8U Rocks — Season Overview"
      />

      {/* Hero Stats */}
      <div className="stat-grid stagger-children" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={<FootballIcon size={22} />} value={stats.totalPlayers} label="Total Players" color="gold" delay={0} />
        <StatCard icon={<CalendarIcon size={22} />} value={stats.upcomingEvents} label="Upcoming Events" color="blue" delay={1} />
        <StatCard icon={<ClipboardCheckIcon size={22} />} value={`${stats.attendanceRate}%`} label="Attendance Rate" color="green" delay={2} />
        <StatCard icon={<DollarIcon size={22} />} value={stats.activeFundraising} label="Active Campaigns" color="amber" delay={3} />
      </div>

      {/* Game Intel Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: Gamepad2, label: 'Plays Called', value: stats.totalPlaysCalled, color: '#4ADE80', href: '/coach/season' },
          { icon: Shield, label: 'Depth Chart', value: `${stats.depthChartFilled} filled`, color: '#60A5FA', href: '/coach/depth-chart' },
          { icon: BookOpen, label: 'Playbook', value: `${stats.totalPlays} plays`, color: '#A855F7', href: '/coach/playbook' },
          { icon: TrendingUp, label: 'Success Rate', value: `${stats.successRate || 0}%`, color: (stats.successRate || 0) >= 60 ? '#4ADE80' : (stats.successRate || 0) >= 40 ? '#FDB913' : '#EF4444', href: '/coach/season' },
        ].map((s, i) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
              style={{
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-glass)', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'border-color 200ms',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <s.icon size={16} color={s.color} />
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Upcoming Events */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="var(--electric-blue-light)" />
                Upcoming Events
              </h3>
              <a href="/coach/events" style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 600 }}>
                View All →
              </a>
            </div>

            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
                No upcoming events scheduled
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingEvents.map((event, i) => (
                  <div key={event.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-glass)', border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                      background: event.type === 'game' ? 'var(--red-dim)' : event.type === 'practice' ? 'var(--green-dim)' : 'var(--electric-blue-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0,
                    }}>
                      {event.type === 'game' ? <StadiumIcon size={18} color="var(--red)" /> : event.type === 'practice' ? <FootballIcon size={18} color="var(--green)" /> : <PlaybookIcon size={18} color="var(--electric-blue-light)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.name || event.title || 'Event'}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                        {event.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
                        {event.location && ` · ${event.location}`}
                      </div>
                    </div>
                    <Badge variant={event.type === 'game' ? 'red' : event.type === 'practice' ? 'green' : 'blue'}>
                      {event.type || 'Event'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recent Evaluations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={18} color="var(--rocks-gold)" />
                Recent Evaluations
              </h3>
              <a href="/coach/evaluate" style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 600 }}>Evaluate →</a>
            </div>

            {recentEvals.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
                No evaluations yet. Start evaluating your players!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentEvals.map((ev, i) => {
                  const player = ev.players;
                  const avgScore = ev.effort && ev.discipline && ev.coachability
                    ? Math.round(((ev.effort + ev.discipline + ev.coachability) / 3) * 20) : null;
                  return (
                    <div key={ev.id || i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-glass)', border: '1px solid var(--border)',
                    }}>
                      <Avatar name={player ? `${player.first_name} ${player.last_name}` : 'Player'} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                          {player ? `${player.first_name} ${player.last_name}` : 'Unknown'}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {player?.position && <PositionBadge position={player.position} />}
                          {player?.jersey_number && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>#{player.jersey_number}</span>
                          )}
                        </div>
                      </div>
                      {avgScore !== null && (
                        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: avgScore >= 80 ? 'var(--green)' : avgScore >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                          {avgScore}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} style={{ marginTop: 'var(--space-xl)' }}>
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            {[
              { icon: <Gamepad2 size={20} />, label: 'Start Sideline', desc: 'Call plays during a live game', href: '/coach/sideline', color: '#4ADE80' },
              { icon: <FileText size={20} />, label: 'Post-Game Report', desc: 'AI analysis of last game', href: '/coach/post-game', color: '#A855F7' },
              { icon: <Trophy size={20} />, label: 'Scout Opponent', desc: 'Pregame scouting report', href: '/coach/scouting', color: '#FDB913' },
              { icon: <ClipboardCheck size={20} />, label: 'Practice Plan', desc: 'Build this week\'s practice', href: '/coach/practice', color: '#60A5FA' },
              { icon: <Users size={20} />, label: 'Manage Roster', desc: 'Add or edit players', href: '/coach/roster', color: 'var(--electric-blue-light)' },
              { icon: <Star size={20} />, label: 'Evaluate Players', desc: 'Run sideline evaluations', href: '/coach/evaluate', color: 'var(--rocks-gold)' },
            ].map((action, i) => (
              <a key={i} href={action.href} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '1rem', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-glass)', border: '1px solid var(--border)',
                transition: 'all 200ms ease', textDecoration: 'none', color: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: `${action.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color, flexShrink: 0,
                }}>{action.icon}</div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{action.label}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: '2px' }}>{action.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
