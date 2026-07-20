'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Square, ChevronRight, RotateCcw, Download, Plus, Trash2, 
  Clock, ShieldAlert, Award, FileText, CheckCircle, HelpCircle, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, PageHeader } from '@/components/ui/index';

export default function SidelineSpotter() {
  // Game session states
  const [sessionActive, setSessionActive] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Game timer states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  
  // Active play states
  const [playActive, setPlayActive] = useState(false);
  const [playStartSeconds, setPlayStartSeconds] = useState(0);
  const [playType, setPlayType] = useState('run');
  const [playNotes, setPlayNotes] = useState('');
  const [playJersey, setPlayJersey] = useState('');

  // Logged plays
  const [loggedPlays, setLoggedPlays] = useState([]);
  
  // Scoring
  const [ourScore, setOurScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);

  // References
  const timerIntervalRef = useRef(null);

  // Load active session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dr_sideline_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOpponent(parsed.opponent || '');
        setGameDate(parsed.gameDate || '');
        setElapsedSeconds(parsed.elapsedSeconds || 0);
        setTimerRunning(parsed.timerRunning || false);
        setLoggedPlays(parsed.loggedPlays || []);
        setOurScore(parsed.ourScore || 0);
        setTheirScore(parsed.theirScore || 0);
        setSessionActive(true);
        
        if (parsed.timerRunning) {
          startTimerInterval();
        }
      } catch (e) {
        console.error('Failed to load sideline session', e);
      }
    }
  }, []);

  // Save session state to localStorage on state changes
  useEffect(() => {
    if (sessionActive) {
      const state = {
        opponent,
        gameDate,
        elapsedSeconds,
        timerRunning,
        loggedPlays,
        ourScore,
        theirScore
      };
      localStorage.setItem('dr_sideline_session', JSON.stringify(state));
    } else {
      localStorage.removeItem('dr_sideline_session');
    }
  }, [sessionActive, opponent, gameDate, elapsedSeconds, timerRunning, loggedPlays, ourScore, theirScore]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  function startTimerInterval() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }

  function startSession() {
    if (!opponent.trim()) {
      toast.error('Please enter the opponent name');
      return;
    }
    setSessionActive(true);
    setElapsedSeconds(0);
    setTimerRunning(true);
    setLoggedPlays([]);
    setOurScore(0);
    setTheirScore(0);
    startTimerInterval();
    toast.success('Sideline Spotter session started!');
  }

  function toggleTimer() {
    if (timerRunning) {
      clearInterval(timerIntervalRef.current);
      setTimerRunning(false);
      toast('Timer paused', { icon: '⏸️' });
    } else {
      startTimerInterval();
      setTimerRunning(true);
      toast('Timer resumed', { icon: '▶️' });
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // SNAP: Start recording a play
  function handleSnap() {
    if (!timerRunning) {
      // Auto-resume timer if they hit snap
      startTimerInterval();
      setTimerRunning(true);
    }
    setPlayActive(true);
    setPlayStartSeconds(elapsedSeconds);
    setPlayNotes('');
    setPlayJersey('');
    toast('SNAP! Play under construction...', { icon: '🏈' });
  }

  // WHISTLE: Complete and log the play
  function handleWhistle() {
    if (!playActive) return;
    
    const playEndSeconds = elapsedSeconds;
    const duration = playEndSeconds - playStartSeconds;
    
    // Construct play record
    const playRecord = {
      id: `play-${Date.now()}`,
      index: loggedPlays.length + 1,
      start_seconds: playStartSeconds,
      end_seconds: playEndSeconds,
      duration,
      play_type: playType,
      notes: playNotes.trim() + (playJersey ? ` (Player #${playJersey})` : ''),
      timestamp: new Date().toISOString()
    };

    setLoggedPlays(prev => [...prev, playRecord]);
    setPlayActive(false);
    toast.success(`Play #${playRecord.index} logged! (${duration}s)`);
  }

  function deletePlay(id) {
    setLoggedPlays(prev => prev.filter(p => p.id !== id).map((p, idx) => ({ ...p, index: idx + 1 })));
    toast.success('Play log removed');
  }

  function handleScore(isOurScore, increment) {
    if (isOurScore) {
      setOurScore(prev => Math.max(0, prev + increment));
    } else {
      setTheirScore(prev => Math.max(0, prev + increment));
    }
  }

  function exportLog() {
    if (loggedPlays.length === 0) {
      toast.error('No plays logged yet');
      return;
    }

    const logData = {
      opponent,
      gameDate,
      finalScore: `${ourScore}-${theirScore}`,
      totalLoggedPlays: loggedPlays.length,
      exportedAt: new Date().toISOString(),
      plays: loggedPlays
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sideline_spotter_${opponent.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${gameDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Play Log JSON downloaded!');
  }

  function endSession() {
    if (window.confirm('Are you sure you want to end this game session? Any unsaved logs will be cleared.')) {
      setSessionActive(false);
      setTimerRunning(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setLoggedPlays([]);
      localStorage.removeItem('dr_sideline_session');
      toast.success('Session cleared.');
    }
  }

  return (
    <div>
      <PageHeader 
        title="Sideline Spotter" 
        subtitle="Log snaps, whistles, and play types offline directly on the sideline. Export logs to auto-clip game film later."
      />

      <AnimatePresence mode="wait">
        {!sessionActive ? (
          <motion.div
            key="start-session"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            style={{ maxWidth: 500, margin: '0 auto', padding: 'var(--space-lg)' }}
          >
            <Card style={{ padding: 'var(--space-xl)', background: 'var(--bg-glass-heavy)' }}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                <Clock size={48} color="var(--rocks-gold)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Start New Sideline Session</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Setup your game tracker before the kickoff.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="spotter-opp">Opponent Name</label>
                  <input 
                    id="spotter-opp"
                    className="form-input" 
                    placeholder="e.g. Boca Braves" 
                    value={opponent} 
                    onChange={e => setOpponent(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="spotter-date">Game Date</label>
                  <input 
                    id="spotter-date"
                    type="date" 
                    className="form-input" 
                    value={gameDate} 
                    onChange={e => setGameDate(e.target.value)}
                  />
                </div>

                <Button 
                  variant="primary" 
                  onClick={startSession} 
                  style={{ width: '100%', padding: 14, fontWeight: 700, marginTop: 8 }}
                >
                  Initialize Game Timer
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="active-session"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}
            className="sideline-grid"
          >
            {/* Left Column: Live Control Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Header Info & Scoreboard */}
              <Card style={{ padding: 'var(--space-md)', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--rocks-gold)' }}>
                      vs. {opponent}
                    </h3>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{gameDate}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={endSession} style={{ color: '#ef4444' }}>
                    Reset Session
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 6px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--rocks-green-light)', fontWeight: 700 }}>Rocks</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{ourScore}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button onClick={() => handleScore(true, 1)} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 10 }}>+1</button>
                      <button onClick={() => handleScore(true, 6)} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 10, color: 'var(--rocks-gold)' }}>+6</button>
                      <button onClick={() => handleScore(true, -1)} className="btn btn-ghost btn-sm" style={{ padding: '2px 4px', fontSize: 10 }}>-</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-muted)' }}>VS</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Opponent</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{theirScore}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button onClick={() => handleScore(false, 1)} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 10 }}>+1</button>
                      <button onClick={() => handleScore(false, 6)} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 10, color: 'var(--rocks-gold)' }}>+6</button>
                      <button onClick={() => handleScore(false, -1)} className="btn btn-ghost btn-sm" style={{ padding: '2px 4px', fontSize: 10 }}>-</button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Big Timer Panel */}
              <Card style={{ padding: 'var(--space-md)', textAlign: 'center', background: 'var(--bg-glass-heavy)' }}>
                <div style={{ fontSize: '3rem', fontFamily: 'monospace', fontWeight: 800, color: timerRunning ? 'var(--rocks-green-light)' : 'var(--text-dim)', letterSpacing: '0.05em' }}>
                  {formatTime(elapsedSeconds)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: 8 }}>
                  <Button 
                    variant={timerRunning ? 'secondary' : 'primary'} 
                    size="sm" 
                    onClick={toggleTimer}
                    icon={timerRunning ? <Square size={12} /> : <Play size={12} />}
                  >
                    {timerRunning ? 'Pause Timer' : 'Resume Timer'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (window.confirm('Reset game timer?')) {
                        setElapsedSeconds(0);
                        toast.success('Timer reset');
                      }
                    }}
                    icon={<RotateCcw size={12} />}
                  >
                    Reset
                  </Button>
                </div>
              </Card>

              {/* Live Play Logging Buttons */}
              <Card style={{ padding: 'var(--space-lg)', flex: 1, background: 'var(--bg-glass-heavy)' }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                  Action Controller
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', justifyContent: 'center' }}>
                  {!playActive ? (
                    <motion.button
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSnap}
                      style={{
                        height: 120,
                        borderRadius: 'var(--radius-lg)',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontSize: '1.8rem',
                        fontWeight: 900,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      SNAP (Start Play)
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      {/* Play details input while play is running */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 9 }}>Play Type</label>
                          <select className="form-input" style={{ padding: 6, fontSize: 12 }} value={playType} onChange={e => setPlayType(e.target.value)}>
                            <option value="run">🏈 Run</option>
                            <option value="pass">💨 Pass</option>
                            <option value="penalty">⚠️ Penalty</option>
                            <option value="turnover">🔄 Turnover</option>
                            <option value="special">kick Special Teams</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 9 }}>Jersey Involved</label>
                          <input className="form-input" style={{ padding: 6, fontSize: 12 }} type="number" placeholder="#" value={playJersey} onChange={e => setPlayJersey(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 9 }}>Play Notes</label>
                        <input className="form-input" style={{ padding: 6, fontSize: 12 }} placeholder="e.g. Sweep right, gain of 10" value={playNotes} onChange={e => setPlayNotes(e.target.value)} />
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleWhistle}
                        style={{
                          height: 80,
                          borderRadius: 'var(--radius-lg)',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: '#fff',
                          fontSize: '1.4rem',
                          fontWeight: 900,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(239, 68, 68, 0.3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginTop: 8
                        }}
                      >
                        WHISTLE (End Play)
                      </motion.button>
                      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--rocks-gold)', fontWeight: 600 }}>
                        Started at {formatTime(playStartSeconds)} (Active: {elapsedSeconds - playStartSeconds}s)
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Logged Play History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Card style={{ padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-glass-heavy)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                    Play Log History ({loggedPlays.length})
                  </h4>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={<Download size={14} />} 
                    disabled={loggedPlays.length === 0}
                    onClick={exportLog}
                  >
                    Export Log
                  </Button>
                </div>

                {loggedPlays.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>
                    <FileText size={40} style={{ opacity: 0.2, marginBottom: 8 }} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>No plays logged yet.</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: 4 }}>
                      Hit SNAP when a play begins and WHISTLE when the play ends to populate logs.
                    </span>
                  </div>
                ) : (
                  <div style={{ overflowY: 'auto', maxHeight: 450, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                    {[...loggedPlays].reverse().map((play) => (
                      <div 
                        key={play.id} 
                        style={{ 
                          padding: 10, 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 'var(--text-xs)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, color: 'var(--rocks-gold)' }}>Play #{play.index}</span>
                            <span style={{ fontSize: 10, background: 'rgba(253, 185, 19, 0.1)', color: 'var(--rocks-gold)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700 }}>
                              {play.play_type}
                            </span>
                            <span style={{ color: 'var(--text-dim)' }}>
                              {formatTime(play.start_seconds)} - {formatTime(play.end_seconds)} ({play.duration}s)
                            </span>
                          </div>
                          {play.notes && (
                            <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{play.notes}</div>
                          )}
                        </div>
                        <button 
                          onClick={() => deletePlay(play.id)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                          title="Delete play record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
