'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Send, Edit3, Trash2, Users, Brain, Check, Copy, ChevronDown } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Avatar } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';
import { trackReportGenerated } from '@/lib/track';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [coachNotes, setCoachNotes] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('generate'); // 'generate' | 'drafts'

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('players').select('*').order('jersey_number');
      setPlayers(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function generateReport() {
    if (!selectedPlayer) { toast.error('Select a player first'); return; }
    setGenerating(true);
    try {
      const p = selectedPlayer;
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: `${p.first_name} ${p.last_name}`,
          jerseyNumber: p.jersey_number,
          position: p.position,
          age: p.age || 8,
          attendanceRate: p.attendance_rate || 85,
          evalScores: p.latest_eval || null,
          coachNotes,
          weekNumber,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const draft = {
        id: Date.now(),
        playerId: p.id,
        playerName: `${p.first_name} ${p.last_name}`,
        jerseyNumber: p.jersey_number,
        report: data.report,
        status: 'draft',
        createdAt: new Date().toISOString(),
        weekNumber,
      };
      setDrafts(prev => [draft, ...prev]);
      setActiveReport(draft);
      setTab('drafts');
      toast.success(`Report generated for ${p.first_name}`);
      trackReportGenerated(`${p.first_name} ${p.last_name}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function generateAll() {
    if (!confirm(`Generate reports for all ${players.length} players? This may take a minute.`)) return;
    setGenerating(true);
    let generated = 0;
    for (const p of players) {
      try {
        const res = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: `${p.first_name} ${p.last_name}`,
            jerseyNumber: p.jersey_number, position: p.position,
            age: p.age || 8, attendanceRate: p.attendance_rate || 85,
            evalScores: p.latest_eval || null, coachNotes: '', weekNumber,
          }),
        });
        const data = await res.json();
        if (data.report) {
          const draft = {
            id: Date.now() + Math.random(), playerId: p.id,
            playerName: `${p.first_name} ${p.last_name}`,
            jerseyNumber: p.jersey_number, report: data.report,
            status: 'draft', createdAt: new Date().toISOString(), weekNumber,
          };
          setDrafts(prev => [draft, ...prev]);
          generated++;
        }
      } catch (e) { console.error(`Failed for ${p.first_name}:`, e); }
    }
    toast.success(`Generated ${generated}/${players.length} reports`);
    setTab('drafts');
    setGenerating(false);
  }

  function markSent(id) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'sent' } : d));
    toast.success('Marked as sent');
  }

  function deleteDraft(id) {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (activeReport?.id === id) setActiveReport(null);
    toast.success('Draft deleted');
  }

  function copyReport(text) {
    navigator.clipboard.writeText(text);
    toast.success('Report copied to clipboard');
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading roster...</div>;

  return (
    <div>
      <PageHeader
        title="Parent Reports"
        subtitle="AI-generated weekly development reports — draft, review, then send via GHL"
        breadcrumbs={[{ label: 'Coach', href: '/coach/dashboard' }, { label: 'Parent Reports' }]}
        actions={
          <Badge variant="green" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
            <Brain size={12} style={{ marginRight: 4 }} /> GEMINI PRO
          </Badge>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-xl)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', padding: 4, width: 'fit-content' }}>
        {[{ key: 'generate', label: 'Generate Reports', icon: Brain }, { key: 'drafts', label: `Drafts (${drafts.filter(d => d.status === 'draft').length})`, icon: FileText }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-xs)', border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'rgba(0,154,68,0.15)' : 'transparent',
            color: tab === t.key ? '#009A44' : 'var(--text-secondary)',
            fontWeight: 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 150ms',
          }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'generate' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 'var(--space-xl)' }}>
          {/* Left: Player select + config */}
          <Card>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="var(--rocks-green-light)" /> Select Player
            </h3>

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-lg)' }}>
              {players.map(p => (
                <button key={p.id} onClick={() => setSelectedPlayer(p)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-sm)', border: `2px solid ${selectedPlayer?.id === p.id ? '#009A44' : 'transparent'}`,
                  background: selectedPlayer?.id === p.id ? 'rgba(0,154,68,0.08)' : 'var(--bg-glass)',
                  cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 150ms',
                  color: 'var(--text-primary)',
                }}>
                  <Avatar name={`${p.first_name} ${p.last_name}`} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.first_name} {p.last_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>#{p.jersey_number} · {p.position || 'Multi'}</div>
                  </div>
                  {selectedPlayer?.id === p.id && <Check size={16} color="#009A44" />}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">WEEK #</label>
                <input className="form-input" type="number" min={1} max={20} value={weekNumber} onChange={e => setWeekNumber(parseInt(e.target.value) || 1)} />
              </div>
              <div className="form-group">
                <label className="form-label">PLAYERS</label>
                <div style={{ padding: '0.625rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {players.length} on roster
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
              <label className="form-label">COACH NOTES (optional)</label>
              <textarea className="form-input" value={coachNotes} onChange={e => setCoachNotes(e.target.value)}
                placeholder="Any specific observations about this player this week..."
                rows={3} />
            </div>
          </Card>

          {/* Right: Preview + Actions */}
          <Card>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Report Preview</h3>

            {selectedPlayer ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)' }}>
                  <Avatar name={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} size={48} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{selectedPlayer.first_name} {selectedPlayer.last_name}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)' }}>#{selectedPlayer.jersey_number} · Week {weekNumber}</div>
                  </div>
                </div>

                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                  The AI will generate a personalized report including:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'var(--space-xl)' }}>
                  {['Weekly Highlights', 'Areas to Improve', 'At-Home Drills', 'Nutrition Guide', "Coach's Message"].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <Check size={14} color="var(--rocks-green-light)" /> {item}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button variant="primary" icon={<Brain size={14} />} loading={generating} onClick={generateReport}>
                    Generate Report
                  </Button>
                  <Button variant="ghost" onClick={generateAll}>
                    Generate All Players
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: 'var(--text-sm)' }}>Select a player to generate their weekly report</p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Drafts tab */
        <div style={{ display: 'grid', gridTemplateColumns: activeReport ? 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' : '1fr', gap: 'var(--space-xl)' }}>
          {/* Draft list */}
          <Card style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Drafts</h3>
            {drafts.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '2rem' }}>
                No drafts yet. Generate a report first.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {drafts.map(d => (
                  <button key={d.id} onClick={() => setActiveReport(d)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)', border: `2px solid ${activeReport?.id === d.id ? '#009A44' : 'transparent'}`,
                    background: activeReport?.id === d.id ? 'rgba(0,154,68,0.08)' : 'var(--bg-glass)',
                    cursor: 'pointer', textAlign: 'left', width: '100%', color: 'var(--text-primary)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{d.playerName}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Week {d.weekNumber}</div>
                    </div>
                    <Badge variant={d.status === 'sent' ? 'green' : 'gold'} style={{ fontSize: '0.6rem' }}>
                      {d.status === 'sent' ? 'Sent' : 'Draft'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Report viewer */}
          {activeReport && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{activeReport.playerName} — Week {activeReport.weekNumber}</h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Generated {new Date(activeReport.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="ghost" size="sm" icon={<Copy size={12} />} onClick={() => copyReport(activeReport.report)}>Copy</Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} onClick={() => deleteDraft(activeReport.id)}>Delete</Button>
                    {activeReport.status === 'draft' && (
                      <Button variant="primary" size="sm" icon={<Send size={12} />} onClick={() => markSent(activeReport.id)}>
                        Mark Sent
                      </Button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{
                    __html: activeReport.report
                      .replace(/^# (.*)/gm, '<h2 style="color:var(--text-primary);font-size:1.25rem;margin:1.5rem 0 0.75rem;font-weight:800">$1</h2>')
                      .replace(/^## (.*)/gm, '<h3 style="color:var(--rocks-green-light);font-size:1rem;margin:1.2rem 0 0.5rem;font-weight:700">$1</h3>')
                      .replace(/^### (.*)/gm, '<h4 style="color:var(--rocks-gold);margin:1rem 0 0.4rem;font-size:0.9rem;font-weight:600">$1</h4>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
                      .replace(/^- (.*)/gm, '<div style="padding-left:1rem;margin:0.25rem 0">• $1</div>')
                  }}
                />
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
