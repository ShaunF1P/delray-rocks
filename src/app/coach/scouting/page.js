'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Brain, Shield, Target, Zap, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const GEMINI_KEY_CLIENT = null; // Uses server-side API

export default function ScoutingPage() {
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pastReports, setPastReports] = useState([]);

  async function generateScoutingReport() {
    if (!opponent.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scouting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponent, notes }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setPastReports(prev => [{ opponent, date: new Date().toLocaleDateString(), report: data.report }, ...prev]);
      }
    } catch (e) { console.error(e); toast.error('Failed to generate report. Try again.'); }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={24} color="#FDB913" /> Pregame Scouting
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
          AI-generated game plan based on opponent intel
        </p>
      </div>

      {/* Input */}
      {!report && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, maxWidth: 700,
          }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 12 }}>Opponent Intel</div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Opponent Team Name *</label>
            <input className="form-input" placeholder="e.g. Boynton Beach Bears" value={opponent}
              onChange={e => setOpponent(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Scouting Notes (what you know about them)</label>
            <textarea className="form-input" rows={5} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Include anything you've observed:
• What defense do they usually run? (4-4, 5-3, etc.)
• Do they blitz a lot?
• Fast or slow linebackers?
• Any film notes from QwikCut?
• Previous game scores
• Key players to watch (#12 is fast, #55 blitzes every play)
• Any weaknesses you've noticed" />
          </div>
          <button onClick={generateScoutingReport} disabled={loading || !opponent.trim()}
            style={{
              width: '100%', padding: '10px 24px', fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(253,185,19,0.2), rgba(234,179,8,0.2))',
              border: '1px solid rgba(253,185,19,0.3)', borderRadius: 8,
              color: '#FDB913', cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: !opponent.trim() ? 0.5 : 1,
            }}>
            <Brain size={16} /> {loading ? 'Generating Scouting Report...' : 'Generate Scouting Report'}
          </button>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && !report && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            padding: 40, textAlign: 'center', maxWidth: 600,
            background: 'rgba(253,185,19,0.04)', border: '1px solid rgba(253,185,19,0.1)', borderRadius: 12,
          }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏈</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#FDB913', marginBottom: 4 }}>Analyzing Opponent Intel...</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Building game plan against {opponent}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#FDB913' }} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Report */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px', marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(253,185,19,0.12), rgba(234,179,8,0.05))',
            border: '1px solid rgba(253,185,19,0.2)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 10, color: '#FDB913', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Scouting Report
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>
              vs {opponent}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>{report.overview}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* Their Defense */}
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginBottom: 8, textTransform: 'uppercase' }}>
                <Shield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Expected Defense
              </div>
              {report.expectedDefense?.map((d, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid rgba(239,68,68,0.3)', lineHeight: 1.4 }}>{d}</div>
              ))}
            </div>

            {/* Their Offense */}
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.1)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', marginBottom: 8, textTransform: 'uppercase' }}>
                <Zap size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Expected Offense
              </div>
              {report.expectedOffense?.map((d, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid rgba(96,165,250,0.3)', lineHeight: 1.4 }}>{d}</div>
              ))}
            </div>
          </div>

          {/* Game Plan */}
          <div style={{ padding: 14, marginBottom: 12, borderRadius: 10, background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', marginBottom: 8, textTransform: 'uppercase' }}>
              <Target size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Our Game Plan
            </div>
            {report.gamePlan?.map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: '#fff', marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid #4ADE80', lineHeight: 1.5, fontWeight: 500 }}>{p}</div>
            ))}
          </div>

          {/* Key Matchups */}
          {report.keyMatchups?.length > 0 && (
            <div style={{ padding: 14, marginBottom: 12, borderRadius: 10, background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#A855F7', marginBottom: 8, textTransform: 'uppercase' }}>🔑 Key Matchups</div>
              {report.keyMatchups.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid rgba(168,85,247,0.3)', lineHeight: 1.4 }}>{m}</div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {report.warnings?.length > 0 && (
            <div style={{ padding: 14, marginBottom: 12, borderRadius: 10, background: 'rgba(253,185,19,0.04)', border: '1px solid rgba(253,185,19,0.1)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FDB913', marginBottom: 8, textTransform: 'uppercase' }}>
                <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Watch Out For
              </div>
              {report.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: '#FDB913', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid rgba(253,185,19,0.3)', lineHeight: 1.4 }}>{w}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setReport(null)} style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
            }}>← New Report</button>
          </div>
        </motion.div>
      )}

      {/* Past Reports */}
      {pastReports.length > 1 && !report && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase' }}>Previous Reports</div>
          {pastReports.map((pr, i) => (
            <button key={i} onClick={() => { setOpponent(pr.opponent); setReport(pr.report); }}
              style={{
                display: 'block', width: '100%', padding: '8px 12px', marginBottom: 4, textAlign: 'left',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, cursor: 'pointer', color: '#fff', fontSize: 12,
              }}>
              <span style={{ fontWeight: 600 }}>vs {pr.opponent}</span>
              <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: 10 }}>{pr.date}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
