'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Minus, RotateCcw, Clock, Trophy } from 'lucide-react';
import { Card, Button, Badge, PageHeader } from '@/components/ui/index';
import { GameLogIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

export default function LiveGamePage() {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [quarter, setQuarter] = useState(1);
  const [isLive, setIsLive] = useState(false);
  const [gameLog, setGameLog] = useState([]);
  const [opponent, setOpponent] = useState('Visitor');

  function addScore(team, points) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    if (team === 'home') {
      setHomeScore(s => s + points);
      setGameLog(l => [{ time: timestamp, text: `Rocks +${points} (Q${quarter})`, type: 'home' }, ...l]);
    } else {
      setAwayScore(s => s + points);
      setGameLog(l => [{ time: timestamp, text: `${opponent} +${points} (Q${quarter})`, type: 'away' }, ...l]);
    }
  }

  function resetGame() {
    if (!confirm('Reset the scoreboard?')) return;
    setHomeScore(0); setAwayScore(0); setQuarter(1); setGameLog([]); setIsLive(false);
    toast.success('Scoreboard reset');
  }

  return (
    <div>
      <PageHeader title="Live Game" subtitle={isLive ? `Q${quarter} — In Progress` : 'Ready to start'}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant={isLive ? 'danger' : 'primary'} icon={isLive ? <Clock size={16} /> : <Zap size={16} />}
              onClick={() => { setIsLive(!isLive); toast.success(isLive ? 'Game paused' : 'Game started!'); }}>
              {isLive ? 'Pause' : 'Go Live'}
            </Button>
            <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={resetGame}>Reset</Button>
          </div>
        }
      />

      {/* Opponent Input */}
      {!isLive && (
        <Card style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label className="form-label">Opponent Name</label>
            <input className="form-input" value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="e.g. Boca Jets" />
          </div>
        </Card>
      )}

      {/* Scoreboard */}
      <Card style={{ padding: 'var(--space-2xl)', marginBottom: 'var(--space-xl)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {isLive && <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>LIVE</span>
        </div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(2rem, 6vw, 6rem)' }}>
          {/* Home */}
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#009A44', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>ROCKS</div>
            <motion.div key={homeScore} initial={{ scale: 1.2 }} animate={{ scale: 1 }} style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 900, lineHeight: 1, color: '#009A44' }}>
              {homeScore}
            </motion.div>
          </div>

          {/* Quarter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Quarter</div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>{quarter}</div>
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: 8 }}>
              {[1,2,3,4].map(q => (
                <button key={q} onClick={() => setQuarter(q)} style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: quarter === q ? '#009A44' : 'var(--bg-glass)',
                  color: quarter === q ? 'white' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: 'var(--text-xs)',
                }}>{q}</button>
              ))}
            </div>
          </div>

          {/* Away */}
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{opponent.toUpperCase()}</div>
            <motion.div key={awayScore} initial={{ scale: 1.2 }} animate={{ scale: 1 }} style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 900, lineHeight: 1 }}>
              {awayScore}
            </motion.div>
          </div>
        </div>

        {/* Score Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontWeight: 600 }}>ROCKS</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="primary" size="sm" onClick={() => addScore('home', 6)}>+6 TD</Button>
              <Button variant="secondary" size="sm" onClick={() => addScore('home', 1)}>+1 XP</Button>
              <Button variant="secondary" size="sm" onClick={() => addScore('home', 2)}>+2 PT</Button>
              <Button variant="ghost" size="sm" onClick={() => setHomeScore(s => Math.max(0, s - 1))}><Minus size={14} /></Button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontWeight: 600 }}>{opponent.toUpperCase()}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="danger" size="sm" onClick={() => addScore('away', 6)}>+6 TD</Button>
              <Button variant="secondary" size="sm" onClick={() => addScore('away', 1)}>+1 XP</Button>
              <Button variant="secondary" size="sm" onClick={() => addScore('away', 2)}>+2 PT</Button>
              <Button variant="ghost" size="sm" onClick={() => setAwayScore(s => Math.max(0, s - 1))}><Minus size={14} /></Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Game Log */}
      {gameLog.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><GameLogIcon size={18} color="var(--rocks-green-light)" /> Game Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {gameLog.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: entry.type === 'home' ? 'rgba(16,107,58,0.06)' : 'rgba(239,68,68,0.06)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 80 }}>{entry.time}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: entry.type === 'home' ? '#009A44' : 'var(--text-secondary)' }}>{entry.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
