'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, TrendingUp, DollarSign, Plus, Star, ClipboardCheck, Zap } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';

export default function CoachDashboard() {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    upcomingEvents: 0,
    attendanceRate: 0,
    activeFundraising: 0,
  });
  const [recentEvals, setRecentEvals] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      // Load players count
      const { count: playerCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true });

      // Load upcoming events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);

      // Load recent evaluations
      const { data: evals } = await supabase
        .from('evaluations')
        .select('*, players(first_name, last_name, position, jersey_number)')
        .order('created_at', { ascending: false })
        .limit(5);

      // Load attendance rate
      const { data: attendance } = await supabase
        .from('attendance')
        .select('present');

      const totalAttendance = attendance?.length || 0;
      const presentCount = attendance?.filter(a => a.present)?.length || 0;
      const rate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      // Load active fundraising
      const { count: campaignCount } = await supabase
        .from('fundraising_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({
        totalPlayers: playerCount || 0,
        upcomingEvents: events?.length || 0,
        attendanceRate: rate,
        activeFundraising: campaignCount || 0,
      });

      setRecentEvals(evals || []);
      setUpcomingEvents(events || []);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="8U Rocks — Season Overview"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" icon={<Zap size={16} />}>
              Start Live Game
            </Button>
            <Button variant="primary" icon={<Plus size={16} />}>
              Quick Action
            </Button>
          </div>
        }
      />

      {/* Hero Stats */}
      <div className="stat-grid stagger-children" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard
          icon="🏈"
          value={stats.totalPlayers}
          label="Total Players"
          color="gold"
          trend={12}
          trendLabel="this season"
          delay={0}
        />
        <StatCard
          icon="📅"
          value={stats.upcomingEvents}
          label="Upcoming Events"
          color="blue"
          delay={1}
        />
        <StatCard
          icon="✅"
          value={`${stats.attendanceRate}%`}
          label="Attendance Rate"
          color="green"
          trend={3}
          trendLabel="vs last month"
          delay={2}
        />
        <StatCard
          icon="💰"
          value={stats.activeFundraising}
          label="Active Campaigns"
          color="amber"
          delay={3}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
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
                      background: event.type === 'game'
                        ? 'var(--red-dim)' : event.type === 'practice'
                        ? 'var(--green-dim)' : 'var(--electric-blue-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', flexShrink: 0,
                    }}>
                      {event.type === 'game' ? '🏟️' : event.type === 'practice' ? '🏈' : '📋'}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={18} color="var(--rocks-gold)" />
                Recent Evaluations
              </h3>
              <a href="/coach/evaluate" style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 600 }}>
                Evaluate →
              </a>
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
                    ? Math.round(((ev.effort + ev.discipline + ev.coachability) / 3) * 20)
                    : null;

                  return (
                    <div key={ev.id || i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-glass)', border: '1px solid var(--border)',
                    }}>
                      <Avatar
                        name={player ? `${player.first_name} ${player.last_name}` : 'Player'}
                        size={36}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                          {player ? `${player.first_name} ${player.last_name}` : 'Unknown'}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {player?.position && <PositionBadge position={player.position} />}
                          {player?.jersey_number && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                              #{player.jersey_number}
                            </span>
                          )}
                        </div>
                      </div>
                      {avgScore !== null && (
                        <div style={{
                          fontSize: 'var(--text-lg)', fontWeight: 800,
                          color: avgScore >= 80 ? 'var(--green)' : avgScore >= 60 ? 'var(--amber)' : 'var(--red)',
                        }}>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        style={{ marginTop: 'var(--space-xl)' }}
      >
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            {[
              { icon: <Users size={20} />, label: 'Add Player', desc: 'Register a new player to the roster', href: '/coach/roster', color: 'var(--electric-blue-light)' },
              { icon: <Calendar size={20} />, label: 'Schedule Event', desc: 'Create a practice or game', href: '/coach/events', color: 'var(--green)' },
              { icon: <Star size={20} />, label: 'Evaluate Players', desc: 'Run sideline evaluations', href: '/coach/evaluate', color: 'var(--rocks-gold)' },
              { icon: <ClipboardCheck size={20} />, label: 'Take Attendance', desc: 'Quick check-in for today', href: '/coach/attendance', color: 'var(--teal)' },
            ].map((action, i) => (
              <a
                key={i}
                href={action.href}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '1rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-glass)', border: '1px solid var(--border)',
                  transition: 'all 200ms ease', textDecoration: 'none', color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-accent)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: `${action.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: action.color, flexShrink: 0,
                }}>
                  {action.icon}
                </div>
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
