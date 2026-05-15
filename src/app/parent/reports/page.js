'use client';

import { useState, useEffect } from 'react';
import { getUserWithProfile } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { FileText, Brain, ChevronDown, ChevronUp } from 'lucide-react';

export default function ParentReportsPage() {
  const [children, setChildren] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { user } = await getUserWithProfile();
    if (!user) return;

    // Try to get reports from localStorage (coach-generated drafts)
    try {
      const stored = localStorage.getItem('delray_parent_reports');
      if (stored) {
        const allReports = JSON.parse(stored);
        // Filter for this parent's children
        setReports(allReports.filter(r => r.status === 'sent'));
      }
    } catch (e) {}

    // Get children for on-demand generation
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data: kids } = await supabase
      .from('players')
      .select('*, evaluations(effort, discipline, coachability, notes, created_at)')
      .ilike('guardian_email', user.email)
      .order('first_name');

    if (kids) setChildren(kids);
    setLoading(false);
  }

  async function requestReport(child) {
    setGenerating(child.id);
    try {
      const evals = child.evaluations || [];
      const latest = evals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: `${child.first_name} ${child.last_name}`,
          jerseyNumber: child.jersey_number, position: child.position,
          age: 8, attendanceRate: 85,
          evalScores: latest ? { effort: latest.effort, discipline: latest.discipline, coachability: latest.coachability } : null,
          coachNotes: latest?.notes || '', weekNumber: Math.ceil((Date.now() - new Date('2026-01-01')) / (7 * 24 * 60 * 60 * 1000)),
        }),
      });
      const data = await res.json();
      if (data.report) {
        setReports(prev => [{
          id: Date.now(),
          playerName: `${child.first_name} ${child.last_name}`,
          report: data.report,
          createdAt: new Date().toISOString(),
        }, ...prev]);
      }
    } catch (e) { console.error(e); }
    setGenerating(null);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: 32, marginBottom: 12 }}>📄</motion.div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading reports...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={24} color="#A855F7" /> Weekly Reports
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
          AI-generated development reports for your child
        </p>
      </div>

      {/* Generate Report Buttons */}
      {children.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase' }}>
            Generate a New Report
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {children.map(child => (
              <button key={child.id} onClick={() => requestReport(child)}
                disabled={generating === child.id}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.15))',
                  border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7',
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: generating ? 0.5 : 1,
                }}>
                <Brain size={14} />
                {generating === child.id ? 'Generating...' : `Generate for ${child.first_name}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Animation */}
      {generating && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            padding: 30, textAlign: 'center', marginBottom: 16,
            background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)', borderRadius: 12,
          }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#A855F7', marginBottom: 4 }}>Creating Report...</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>This takes about 10 seconds</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#A855F7' }} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Reports List */}
      {reports.length === 0 && !generating ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>No Reports Yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            Click the button above to generate your child's weekly development report.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{
                borderRadius: 12, overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
              <button onClick={() => setExpanded(p => ({ ...p, [r.id]: !p[r.id] }))}
                style={{
                  width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#fff',
                }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.playerName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                {expanded[r.id] ? <ChevronUp size={16} color="var(--text-dim)" /> : <ChevronDown size={16} color="var(--text-dim)" />}
              </button>
              {expanded[r.id] && (
                <div style={{
                  padding: '0 20px 20px',
                  fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                  <div className="markdown-report" style={{ whiteSpace: 'pre-wrap' }}>
                    {r.report}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
