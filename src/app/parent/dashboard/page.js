'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getUserWithProfile } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Calendar, Star, Trophy, FileText, Activity, Heart } from 'lucide-react';

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadParentData(); }, []);

  async function loadParentData() {
    const { user, profile } = await getUserWithProfile();
    if (!user || !profile) return;

    const supabase = createClient();
    const parentEmail = user.email;

    // Find kids linked to this parent via guardian_email
    const { data: kids } = await supabase
      .from('players')
      .select('*, evaluations(effort, discipline, coachability, created_at)')
      .ilike('guardian_email', parentEmail)
      .order('first_name');

    if (kids) setChildren(kids);

    // Upcoming events
    const { data: evts } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5);

    if (evts) setEvents(evts);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: 32, marginBottom: 12 }}>🏈</motion.div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading your player data...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heart size={24} color="#EF4444" /> Parent Dashboard
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
          Welcome! Track your child's progress and upcoming events.
        </p>
      </div>

      {/* Player Cards */}
      {children.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            padding: 40, textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
          }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>No Players Linked Yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Ask your head coach to add your email as the guardian email on your child's roster profile.
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: children.length > 1 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
          {children.map((child, i) => {
            const evals = child.evaluations || [];
            const latestEval = evals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            const avgScore = latestEval
              ? Math.round(((latestEval.effort + latestEval.discipline + latestEval.coachability) / 3) * 20)
              : null;

            return (
              <motion.div key={child.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  padding: 20, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(0,154,68,0.08), rgba(253,185,19,0.04))',
                  border: '1px solid rgba(0,154,68,0.15)',
                }}>
                {/* Player Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #009A44, #4ADE80)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 900, color: '#fff',
                  }}>
                    {child.jersey_number || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                      {child.first_name} {child.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      #{child.jersey_number} • {child.position || 'ATH'} • 8U Rocks
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {latestEval ? (
                    <>
                      <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#4ADE80' }}>{latestEval.effort}/5</div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Effort</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#60A5FA' }}>{latestEval.discipline}/5</div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Discipline</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#FDB913' }}>{latestEval.coachability}/5</div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Coachability</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ gridColumn: 'span 3', padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                      No evaluations yet this season
                    </div>
                  )}
                </div>

                {avgScore !== null && (
                  <div style={{
                    marginTop: 12, padding: '8px 12px', borderRadius: 6,
                    background: avgScore >= 80 ? 'rgba(74,222,128,0.08)' : avgScore >= 60 ? 'rgba(253,185,19,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${avgScore >= 80 ? 'rgba(74,222,128,0.15)' : avgScore >= 60 ? 'rgba(253,185,19,0.15)' : 'rgba(239,68,68,0.15)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>Overall Score</span>
                    <span style={{
                      fontSize: 18, fontWeight: 900,
                      color: avgScore >= 80 ? '#4ADE80' : avgScore >= 60 ? '#FDB913' : '#EF4444',
                    }}>{avgScore}%</span>
                  </div>
                )}

                {evals.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                    {evals.length} evaluation{evals.length > 1 ? 's' : ''} recorded
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upcoming Events */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color="#60A5FA" /> Upcoming Schedule
          </div>
          {events.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
              No upcoming events scheduled
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {events.map((event, i) => (
                <div key={event.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: event.type === 'game' ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)',
                    fontSize: 16,
                  }}>
                    {event.type === 'game' ? '🏟️' : '🏈'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{event.name || event.title || 'Event'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {event.event_date ? new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      }) : 'TBD'}
                      {event.location && ` • ${event.location}`}
                    </div>
                  </div>
                  <div style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                    background: event.type === 'game' ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)',
                    color: event.type === 'game' ? '#EF4444' : '#4ADE80',
                  }}>{event.type || 'event'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Helpful Message */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{
          marginTop: 16, padding: 14, borderRadius: 10,
          background: 'rgba(253,185,19,0.04)', border: '1px solid rgba(253,185,19,0.1)',
        }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#FDB913', marginBottom: 4 }}>💡 Tip</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Check the <strong>Reports</strong> tab for weekly progress reports from your coach. These include at-home drills, nutrition guides, and personalized feedback.
        </div>
      </motion.div>
    </div>
  );
}
