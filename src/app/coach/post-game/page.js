'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Brain, Download, ChevronDown, ChevronUp, Trophy, AlertTriangle, TrendingUp, Shield } from 'lucide-react';

export default function PostGamePage() {
  const [gameInfo, setGameInfo] = useState({ opponent: '', score: '', date: new Date().toISOString().split('T')[0] });
  const [callData, setCallData] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  async function generateReport() {
    setLoading(true);
    try {
      // Try to get sideline data from localStorage or paste
      let history = [];
      const stored = localStorage.getItem('delray_sideline_history');
      if (stored) {
        history = JSON.parse(stored);
      } else if (callData) {
        history = JSON.parse(callData);
      }

      if (history.length === 0) {
        alert('No play data found. Use the Sideline module during a game first, or paste play data.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/post-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callHistory: history, gameInfo }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
    } catch (e) { console.error(e); alert('Failed to generate report'); }
    setLoading(false);
  }

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const gradeColor = (grade) => {
    if (!grade) return '#6B7280';
    const g = grade.replace(/[+-]/g, '');
    if (['A'].includes(g)) return '#4ADE80';
    if (['B'].includes(g)) return '#60A5FA';
    if (['C'].includes(g)) return '#FDB913';
    return '#EF4444';
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
          📊 Post-Game Report
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
          Generate an AI-powered game analysis from your sideline data
        </p>
      </div>

      {/* Game Info Form */}
      {!report && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, maxWidth: 600, marginBottom: 20,
          }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 12 }}>Game Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Opponent</label>
              <input className="form-input" placeholder="e.g. Boynton Beach Bears" value={gameInfo.opponent}
                onChange={e => setGameInfo(p => ({ ...p, opponent: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Final Score</label>
              <input className="form-input" placeholder="e.g. 24-6 W" value={gameInfo.score}
                onChange={e => setGameInfo(p => ({ ...p, score: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Game Date</label>
              <input className="form-input" type="date" value={gameInfo.date}
                onChange={e => setGameInfo(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
            Play data is automatically pulled from your last Sideline session
          </div>
          <button onClick={generateReport} disabled={loading}
            style={{
              marginTop: 16, padding: '10px 24px', fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))',
              border: '1px solid rgba(168,85,247,0.4)', borderRadius: 8,
              color: '#A855F7', cursor: loading ? 'wait' : 'pointer', width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <Brain size={16} /> {loading ? 'Generating Report...' : 'Generate Post-Game Report'}
          </button>
        </motion.div>
      )}

      {/* Generated Report */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Headline */}
          <div style={{
            padding: '20px 24px', marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(0,154,68,0.15), rgba(253,185,19,0.08))',
            border: '1px solid rgba(0,154,68,0.2)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 10, color: 'var(--rocks-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {gameInfo.opponent ? `vs ${gameInfo.opponent}` : 'Game Report'} • {gameInfo.date}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{report.headline}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>{report.summary}</div>
          </div>

          {/* Grade Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{
              padding: 16, textAlign: 'center', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Offense</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: gradeColor(report.offenseGrade), marginTop: 4 }}>{report.offenseGrade}</div>
            </div>
            <div style={{
              padding: 16, textAlign: 'center', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Defense Intel</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: gradeColor(report.defenseGrade), marginTop: 4 }}>{report.defenseGrade}</div>
            </div>
          </div>

          {/* Sections */}
          <ReportSection title="🏆 Top Plays" items={report.topPlays} color="#4ADE80" icon={Trophy} expanded={expanded.top} onToggle={() => toggle('top')} />
          <ReportSection title="⚠️ Trouble Spots" items={report.troublePlays} color="#EF4444" icon={AlertTriangle} expanded={expanded.trouble} onToggle={() => toggle('trouble')} />

          {/* Analysis Blocks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 14, background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', marginBottom: 4, textTransform: 'uppercase' }}>🏃 Run Game</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{report.runGameAnalysis}</div>
            </div>
            <div style={{ padding: 14, background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.1)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', marginBottom: 4, textTransform: 'uppercase' }}>🎯 Pass Game</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{report.passGameAnalysis}</div>
            </div>
          </div>

          {/* Opponent Tendencies */}
          <div style={{ padding: 14, marginBottom: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', marginBottom: 4, textTransform: 'uppercase' }}>🛡️ Opponent Tendencies (Save for Scouting)</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{report.opponentTendencies}</div>
          </div>

          <ReportSection title="🔧 Practice Adjustments" items={report.adjustments} color="#FDB913" icon={TrendingUp} expanded={expanded.adj} onToggle={() => toggle('adj')} />
          <ReportSection title="📈 Player Development Focus" items={report.playerDevelopment} color="#A855F7" icon={TrendingUp} expanded={expanded.dev} onToggle={() => toggle('dev')} />

          {/* Next Game Plan */}
          <div style={{ padding: 14, marginBottom: 12, background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(99,102,241,0.06))', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A855F7', marginBottom: 4, textTransform: 'uppercase' }}>🎯 Next Game Plan</div>
            <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.6, fontWeight: 500 }}>{report.nextGamePlan}</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setReport(null)} style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
            }}>← New Report</button>
            <button onClick={generateReport} disabled={loading} style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
              background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7',
            }}>{loading ? 'Regenerating...' : '🔄 Regenerate'}</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ReportSection({ title, items, color, icon: Icon, expanded, onToggle }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', color: '#fff',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1, textAlign: 'left' }}>{title}</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{items.length} items</span>
        {expanded ? <ChevronUp size={14} color="var(--text-dim)" /> : <ChevronDown size={14} color="var(--text-dim)" />}
      </button>
      {expanded !== false && (
        <div style={{ padding: '0 14px 10px' }}>
          {items.map((item, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0 4px 10px', borderLeft: `2px solid ${color}`, marginBottom: 4, lineHeight: 1.4 }}>{item}</div>
          ))}
        </div>
      )}
    </div>
  );
}
