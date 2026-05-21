'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, TrendingUp, Users, Film, BookOpen, Star, FileText,
  Trophy, LogIn, Clock, RefreshCw, Calendar
} from 'lucide-react';
import { Card, Button, Badge, PageHeader } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';

const EVENT_CONFIG = {
  login:            { label: 'Login',           icon: LogIn,   color: '#60A5FA', emoji: '🔐' },
  film_view:        { label: 'Film View',       icon: Film,    color: '#A78BFA', emoji: '🎬' },
  film_upload:      { label: 'Film Upload',     icon: Film,    color: '#818CF8', emoji: '📤' },
  film_analysis:    { label: 'Film Analysis',   icon: Film,    color: '#C084FC', emoji: '🧠' },
  playbook_view:    { label: 'Playbook View',   icon: BookOpen, color: '#34D399', emoji: '📋' },
  evaluation:       { label: 'Evaluation',      icon: Star,    color: '#FBBF24', emoji: '📊' },
  roster_update:    { label: 'Roster Update',   icon: Users,   color: '#F87171', emoji: '📝' },
  award_given:      { label: 'Award Given',     icon: Trophy,  color: '#FDB913', emoji: '🏆' },
  practice_plan:    { label: 'Practice Plan',   icon: Calendar, color: '#4ADE80', emoji: '🏈' },
  report_generated: { label: 'Report Generated', icon: FileText, color: '#FB923C', emoji: '📄' },
};

export default function ActivityDashboardPage() {
  const [logs, setLogs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - timeRange);

    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    setLogs(data || []);

    // Fetch profiles for user IDs
    const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      const map = {};
      (profileData || []).forEach(p => { map[p.id] = `${p.first_name} ${p.last_name}`; });
      setProfiles(map);
    }

    setLoading(false);
  }, [timeRange]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  // Aggregate stats
  const byType = {};
  logs.forEach(l => { byType[l.event_type] = (byType[l.event_type] || 0) + 1; });

  const byUser = {};
  logs.forEach(l => {
    const name = profiles[l.user_id] || l.details?.name || 'Unknown';
    byUser[name] = (byUser[name] || 0) + 1;
  });

  const topUsers = Object.entries(byUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topEvents = Object.entries(byType)
    .sort((a, b) => b[1] - a[1]);

  // Today vs yesterday comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = logs.filter(l => new Date(l.created_at) >= today).length;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayCount = logs.filter(l => {
    const d = new Date(l.created_at);
    return d >= yesterday && d < today;
  }).length;

  return (
    <div>
      <PageHeader
        title="Activity Feed"
        subtitle={`${logs.length} events in the last ${timeRange} days`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="form-input"
              value={timeRange}
              onChange={e => setTimeRange(parseInt(e.target.value))}
              style={{ width: 'auto', minWidth: 100, fontSize: 'var(--text-xs)' }}
            >
              <option value={1}>Today</option>
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
            <Button variant="ghost" icon={<RefreshCw size={14} />} onClick={loadActivity}>
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading activity data...
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            {[
              { label: 'Total Events', value: logs.length, icon: Activity, color: '#009A44' },
              { label: 'Today', value: todayCount, icon: TrendingUp, color: '#4ADE80',
                sub: yesterdayCount > 0 ? `${todayCount >= yesterdayCount ? '↑' : '↓'} vs ${yesterdayCount} yesterday` : null },
              { label: 'Active Staff', value: Object.keys(byUser).length, icon: Users, color: '#60A5FA' },
              { label: 'Event Types', value: Object.keys(byType).length, icon: Clock, color: '#FDB913' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color, lineHeight: 1.2, marginTop: 4 }}>
                        {stat.value}
                      </div>
                      {stat.sub && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 4 }}>{stat.sub}</div>
                      )}
                    </div>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)',
                      background: `${stat.color}15`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <stat.icon size={20} color={stat.color} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            {/* Engagement Leaderboard */}
            <Card>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={16} color="var(--rocks-gold)" /> Staff Engagement Leaderboard
              </h3>
              {topUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
                  No activity yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topUsers.map(([name, count], i) => (
                    <div key={name} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      background: i === 0 ? 'rgba(253,185,19,0.06)' : 'var(--bg-glass)',
                      border: `1px solid ${i === 0 ? 'rgba(253,185,19,0.15)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: i === 0 ? 'rgba(253,185,19,0.2)' : i === 1 ? 'rgba(192,192,192,0.15)' : i === 2 ? 'rgba(205,127,50,0.15)' : 'var(--bg-glass)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800,
                        color: i === 0 ? '#FDB913' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-dim)',
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 'var(--text-sm)' }}>{name}</div>
                      <Badge variant={i === 0 ? 'gold' : 'green'}>{count} events</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Event Type Breakdown */}
            <Card>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="var(--rocks-green-light)" /> Event Breakdown
              </h3>
              {topEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
                  No events recorded
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topEvents.map(([type, count]) => {
                    const cfg = EVENT_CONFIG[type] || { label: type, color: '#888', emoji: '📌' };
                    const pct = Math.round((count / logs.length) * 100);
                    return (
                      <div key={type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{cfg.emoji}</span> {cfg.label}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            style={{ height: '100%', background: cfg.color, borderRadius: 'var(--radius-full)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <Card>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="var(--text-dim)" /> Recent Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {logs.slice(0, 30).map((log, i) => {
                const cfg = EVENT_CONFIG[log.event_type] || { label: log.event_type, color: '#888', emoji: '📌' };
                const userName = profiles[log.user_id] || log.details?.name || 'Unknown';
                const time = new Date(log.created_at);
                const ago = getTimeAgo(time);
                const detail = log.details?.title || log.details?.player || log.details?.action || '';

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', flexShrink: 0 }}>
                      {cfg.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        <span style={{ fontWeight: 700 }}>{userName}</span>{' '}
                        <span style={{ color: 'var(--text-dim)' }}>{cfg.label.toLowerCase()}</span>
                        {detail && <span style={{ color: 'var(--text-secondary)' }}> — {detail}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {ago}
                    </div>
                  </motion.div>
                );
              })}
              {logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  <Activity size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p style={{ fontSize: 'var(--text-sm)' }}>No activity recorded yet. Start using the platform!</p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}
