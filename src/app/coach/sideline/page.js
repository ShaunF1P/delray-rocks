'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, Target, Shield, Zap, Check, Undo2, Trash2, ThumbsUp, ThumbsDown, Minus, RotateCcw, Brain, Eye } from 'lucide-react';

const OPP_DEFENSES = [
  { key: '4-4', label: '4-4', color: '#EF4444' },
  { key: '5-3', label: '5-3', color: '#F97316' },
  { key: '6-2', label: '6-2', color: '#EAB308' },
  { key: '4-2-5', label: '4-2-5', color: '#60A5FA' },
  { key: 'blitz', label: 'Blitz', color: '#EC4899' },
  { key: 'stack', label: 'Stack Box', color: '#A855F7' },
  { key: 'zone', label: 'Zone', color: '#14B8A6' },
  { key: 'man', label: 'Man', color: '#F43F5E' },
  { key: 'spread', label: 'Spread', color: '#6366F1' },
  { key: 'unknown', label: '???', color: '#6B7280' },
];

export default function SidelinePage() {
  const [formations, setFormations] = useState([]);
  const [plays, setPlays] = useState([]);
  const [side, setSide] = useState('offense');
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [gameState, setGameState] = useState({ quarter: 1, down: 1, distance: 10, yardLine: 35 });
  const [callHistory, setCallHistory] = useState([]);
  const [lastCall, setLastCall] = useState(null);
  const [activeGameFilmId, setActiveGameFilmId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [taggingIndex, setTaggingIndex] = useState(null);
  const [intel, setIntel] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [showIntel, setShowIntel] = useState(false);

  useEffect(() => {
    loadData();
    loadActiveGame();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const [fRes, pRes] = await Promise.all([
      supabase.from('playbook_formations').select('*').order('sort_order'),
      supabase.from('playbook_plays').select('*').order('sort_order'),
    ]);
    if (fRes.data) setFormations(fRes.data);
    if (pRes.data) setPlays(pRes.data);
  }

  async function loadActiveGame() {
    const supabase = createClient();
    const { data } = await supabase
      .from('game_films')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (data) setActiveGameFilmId(data.id);
  }

  async function callPlay(play) {
    const call = {
      game_film_id: activeGameFilmId,
      play_id: play.id,
      called_at: new Date().toISOString(),
      quarter: gameState.quarter,
      down: gameState.down,
      distance: gameState.distance,
      yard_line: gameState.yardLine,
    };

    let dbId = null;
    if (activeGameFilmId) {
      const supabase = createClient();
      const { data } = await supabase.from('play_calls').insert(call).select('id').single();
      if (data) dbId = data.id;
    }

    const historyEntry = { ...call, play, time: new Date(), dbId, result: null, oppDefense: null };
    setLastCall(historyEntry);
    setCallHistory(prev => [historyEntry, ...prev]);
    setConfirmUndo(false);

    // Auto-advance down
    setGameState(prev => ({
      ...prev,
      down: prev.down < 4 ? prev.down + 1 : 1,
      distance: prev.down < 4 ? Math.max(1, prev.distance - 4) : 10,
    }));
  }

  async function undoLastCall() {
    if (callHistory.length === 0) return;
    const removed = callHistory[0];

    // Delete from DB if it was saved
    if (removed.dbId) {
      const supabase = createClient();
      await supabase.from('play_calls').delete().eq('id', removed.dbId);
    }

    // Restore game state
    setGameState({
      quarter: removed.quarter,
      down: removed.down,
      distance: removed.distance,
      yardLine: removed.yard_line,
    });

    setCallHistory(prev => prev.slice(1));
    setLastCall(callHistory.length > 1 ? callHistory[1] : null);
    setConfirmUndo(false);
  }

  async function deleteHistoryItem(index) {
    const item = callHistory[index];
    if (item.dbId) {
      const supabase = createClient();
      await supabase.from('play_calls').delete().eq('id', item.dbId);
    }
    setCallHistory(prev => prev.filter((_, i) => i !== index));
    if (index === 0) setLastCall(callHistory.length > 1 ? callHistory[1] : null);
  }

  function markResult(index, result) {
    setCallHistory(prev => prev.map((c, i) => i === index ? { ...c, result } : c));
  }

  function tagDefense(index, defKey) {
    setCallHistory(prev => prev.map((c, i) => i === index ? { ...c, oppDefense: defKey } : c));
    setTaggingIndex(null);
  }

  async function getIntel() {
    setLoadingIntel(true);
    setShowIntel(true);
    try {
      const res = await fetch('/api/game-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callHistory }),
      });
      const data = await res.json();
      if (data.analysis) setIntel(data.analysis);
    } catch (e) { console.error(e); }
    setLoadingIntel(false);
  }

  const filteredFormations = formations.filter(f => f.side === side);
  const filteredPlays = selectedFormation
    ? plays.filter(p => p.formation_id === selectedFormation.id)
    : [];

  const runPlays = filteredPlays.filter(p => p.play_type === 'run');
  const passPlays = filteredPlays.filter(p => ['pass', 'trick'].includes(p.play_type));
  const defPlays = filteredPlays.filter(p => ['zone', 'man', 'blitz'].includes(p.play_type));

  // Stats
  const totalCalls = callHistory.length;
  const successCalls = callHistory.filter(c => c.result === 'success').length;
  const failCalls = callHistory.filter(c => c.result === 'fail').length;
  const successRate = totalCalls > 0 ? Math.round((successCalls / (successCalls + failCalls || 1)) * 100) : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a1628 0%, #0d1117 100%)',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: 100,
    }}>
      {/* Header — Game State */}
      <div style={{
        background: 'rgba(0,0,0,0.6)',
        borderBottom: '2px solid rgba(0,154,68,0.3)',
        padding: '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#009A44', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            🏈 Sideline Play Caller
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {totalCalls > 0 && (
              <span style={{ fontSize: 10, color: successRate >= 60 ? '#4ADE80' : successRate >= 40 ? '#FDB913' : '#EF4444', fontWeight: 600 }}>
                {successRate}% success
              </span>
            )}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {totalCalls} plays
            </span>
          </div>
        </div>

        {/* Down & Distance */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1,
            background: 'rgba(0,154,68,0.15)',
            border: '1px solid rgba(0,154,68,0.3)',
            borderRadius: 8,
            padding: '8px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
              {gameState.down === 1 ? '1st' : gameState.down === 2 ? '2nd' : gameState.down === 3 ? '3rd' : '4th'}
              <span style={{ color: 'rgba(255,255,255,0.5)', margin: '0 4px' }}>&</span>
              {gameState.distance}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Ball on {gameState.yardLine} yard line • Q{gameState.quarter}
            </div>
          </div>
        </div>

        {/* Game State Controls */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {[1,2,3,4].map(q => (
            <button key={q} onClick={() => setGameState(p => ({ ...p, quarter: q }))}
              style={{
                flex: 1, padding: '4px', fontSize: 11, fontWeight: 600, border: '1px solid',
                borderRadius: 4, cursor: 'pointer',
                background: gameState.quarter === q ? 'rgba(0,154,68,0.3)' : 'rgba(255,255,255,0.05)',
                borderColor: gameState.quarter === q ? '#009A44' : 'rgba(255,255,255,0.1)',
                color: gameState.quarter === q ? '#4ADE80' : 'rgba(255,255,255,0.5)',
              }}>Q{q}</button>
          ))}
          <button onClick={() => setGameState(p => ({ ...p, down: 1, distance: 10 }))}
            style={{
              padding: '4px 8px', fontSize: 11, fontWeight: 600, border: '1px solid rgba(253,185,19,0.3)',
              borderRadius: 4, cursor: 'pointer', background: 'rgba(253,185,19,0.15)', color: '#FDB913',
            }}>
            1st & 10
          </button>
          <button onClick={() => setGameState(p => ({ ...p, yardLine: Math.min(50, p.yardLine + 10) }))}
            style={{
              padding: '4px 8px', fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
            }}>
            +10yd
          </button>
        </div>
      </div>

      {/* Side Toggle (Offense/Defense) */}
      <div style={{ display: 'flex', gap: 0, margin: '12px 16px 0' }}>
        {['offense', 'defense'].map(s => (
          <button key={s} onClick={() => { setSide(s); setSelectedFormation(null); }}
            style={{
              flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, border: '1px solid',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
              borderRadius: s === 'offense' ? '8px 0 0 8px' : '0 8px 8px 0',
              background: side === s ? (s === 'offense' ? 'rgba(0,154,68,0.25)' : 'rgba(239,68,68,0.25)') : 'rgba(255,255,255,0.03)',
              borderColor: side === s ? (s === 'offense' ? '#009A44' : '#EF4444') : 'rgba(255,255,255,0.1)',
              color: side === s ? '#fff' : 'rgba(255,255,255,0.4)',
            }}>
            {s === 'offense' ? '⚔️' : '🛡️'} {s}
          </button>
        ))}
      </div>

      {/* Last Call Banner with UNDO */}
      <AnimatePresence>
        {lastCall && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              margin: '12px 16px 0',
              padding: '8px 12px',
              background: 'rgba(0,154,68,0.15)',
              border: '1px solid rgba(0,154,68,0.3)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
            <Check size={14} color="#4ADE80" />
            <span style={{ fontSize: 12, color: '#4ADE80', fontWeight: 600, flex: 1 }}>
              Called: {lastCall.play.name}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {new Date(lastCall.called_at).toLocaleTimeString()}
            </span>
            {/* Undo button */}
            {!confirmUndo ? (
              <button onClick={() => setConfirmUndo(true)} style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 5, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 600, color: '#EF4444',
              }}>
                <Undo2 size={10} /> Undo
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={undoLastCall} style={{
                  background: 'rgba(239,68,68,0.3)', border: '1px solid #EF4444',
                  borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                }}>Yes, undo</button>
                <button onClick={() => setConfirmUndo(false)} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
                  fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                }}>Cancel</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div style={{ padding: '12px 16px' }}>
        <AnimatePresence mode="wait">
          {!selectedFormation ? (
            /* FORMATION SELECTOR */
            <motion.div key="formations" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Select Formation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {filteredFormations.map(f => (
                  <motion.button
                    key={f.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedFormation(f)}
                    style={{
                      padding: '16px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                      {f.name.replace('Beast ', '')}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                      {f.description?.substring(0, 60)}...
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: side === 'offense' ? '#4ADE80' : '#EF4444', fontWeight: 600 }}>
                      {plays.filter(p => p.formation_id === f.id).length} plays →
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* PLAY SELECTOR (Madden-style drill-down) */
            <motion.div key="plays" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setSelectedFormation(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  marginBottom: 10, padding: 0,
                }}>
                <ChevronLeft size={14} /> Back to Formations
              </button>

              <div style={{
                padding: '10px 14px',
                background: side === 'offense' ? 'rgba(0,154,68,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${side === 'offense' ? 'rgba(0,154,68,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 8,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{selectedFormation.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{selectedFormation.description}</div>
              </div>

              {/* Run Plays */}
              {runPlays.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Zap size={12} /> RUN PLAYS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 14 }}>
                    {runPlays.map(p => (
                      <PlayCard key={p.id} play={p} onCall={callPlay} color="#4ADE80" />
                    ))}
                  </div>
                </>
              )}

              {/* Pass Plays */}
              {passPlays.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Target size={12} /> PASS PLAYS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 14 }}>
                    {passPlays.map(p => (
                      <PlayCard key={p.id} play={p} onCall={callPlay} color="#60A5FA" />
                    ))}
                  </div>
                </>
              )}

              {/* Defensive Plays */}
              {defPlays.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={12} /> DEFENSIVE CALLS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 14 }}>
                    {defPlays.map(p => (
                      <PlayCard key={p.id} play={p} onCall={callPlay} color="#EF4444" />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Play History with Results Tracker */}
      {callHistory.length > 0 && (
        <div style={{
          margin: '0 16px',
          padding: '10px 14px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Play History
              <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>
                {successCalls}W / {failCalls}L / {totalCalls - successCalls - failCalls - callHistory.filter(c => c.result === 'neutral').length} ungraded
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setShowHistory(!showHistory)} style={{
                padding: '2px 8px', fontSize: 9, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)',
              }}>{showHistory ? 'Collapse' : `Show All (${totalCalls})`}</button>
            </div>
          </div>

          {(showHistory ? callHistory : callHistory.slice(0, 5)).map((c, i) => (
            <div key={i}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {/* Result dot */}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: c.result === 'success' ? '#4ADE80' : c.result === 'fail' ? '#EF4444' : c.result === 'neutral' ? '#FDB913' : 'rgba(255,255,255,0.15)',
                }} />

                {/* Play info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>Q{c.quarter}</span>
                    {c.play.name}
                  </div>
                </div>

                {/* Opponent defense tag */}
                <button onClick={() => setTaggingIndex(taggingIndex === i ? null : i)} title="Tag opponent defense"
                  style={{
                    padding: '1px 6px', fontSize: 9, fontWeight: 600, borderRadius: 3, cursor: 'pointer', flexShrink: 0,
                    background: c.oppDefense ? `${(OPP_DEFENSES.find(d => d.key === c.oppDefense)?.color || '#6B7280')}22` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${c.oppDefense ? (OPP_DEFENSES.find(d => d.key === c.oppDefense)?.color || '#6B7280') + '44' : 'rgba(255,255,255,0.08)'}`,
                    color: c.oppDefense ? OPP_DEFENSES.find(d => d.key === c.oppDefense)?.color || '#fff' : 'rgba(255,255,255,0.3)',
                  }}>
                  <Eye size={8} style={{ marginRight: 2, verticalAlign: 'middle' }} />
                  {c.oppDefense ? OPP_DEFENSES.find(d => d.key === c.oppDefense)?.label : 'Tag'}
                </button>

                {/* Down */}
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {c.down === 1 ? '1st' : c.down === 2 ? '2nd' : c.down === 3 ? '3rd' : '4th'}&{c.distance}
                </div>

                {/* Result + delete buttons */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => markResult(i, 'success')} style={{
                    width: 20, height: 20, borderRadius: 3, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: c.result === 'success' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.04)',
                  }}><ThumbsUp size={9} color={c.result === 'success' ? '#4ADE80' : 'rgba(255,255,255,0.2)'} /></button>
                  <button onClick={() => markResult(i, 'fail')} style={{
                    width: 20, height: 20, borderRadius: 3, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: c.result === 'fail' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.04)',
                  }}><ThumbsDown size={9} color={c.result === 'fail' ? '#EF4444' : 'rgba(255,255,255,0.2)'} /></button>
                  <button onClick={() => deleteHistoryItem(i)} style={{
                    width: 20, height: 20, borderRadius: 3, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                  }}><Trash2 size={8} color="rgba(255,255,255,0.12)" /></button>
                </div>
              </div>

              {/* Expandable defense tag picker */}
              {taggingIndex === i && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', padding: '6px 0 4px 12px' }}>
                  {OPP_DEFENSES.map(d => (
                    <button key={d.key} onClick={() => tagDefense(i, d.key)}
                      style={{
                        padding: '3px 8px', fontSize: 9, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                        background: c.oppDefense === d.key ? `${d.color}33` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${c.oppDefense === d.key ? d.color : 'rgba(255,255,255,0.08)'}`,
                        color: d.color,
                      }}>{d.label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Coach Intel Button */}
          {callHistory.length >= 3 && (
            <button onClick={getIntel} disabled={loadingIntel}
              style={{
                marginTop: 8, width: '100%', padding: '8px', fontSize: 11, fontWeight: 700,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: 6, color: '#A855F7', cursor: loadingIntel ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                letterSpacing: '0.03em',
              }}>
              <Brain size={14} /> {loadingIntel ? 'Analyzing...' : 'Get Coach Intel'} — {callHistory.filter(c => c.oppDefense).length}/{callHistory.length} tagged
            </button>
          )}

          {/* Reset game button */}
          {callHistory.length > 3 && (
            <button onClick={() => { if (confirm('Reset all play history for this game?')) { setCallHistory([]); setLastCall(null); setIntel(null); } }}
              style={{
                marginTop: 4, width: '100%', padding: '5px', fontSize: 10, fontWeight: 600,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 5, color: 'rgba(239,68,68,0.5)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
              <RotateCcw size={10} /> Reset Game
            </button>
          )}
        </div>
      )}

      {/* COACH INTEL PANEL */}
      <AnimatePresence>
        {showIntel && intel && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              margin: '12px 16px', padding: '14px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: 12,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#A855F7', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={16} /> Coach Intel
              </div>
              <button onClick={() => setShowIntel(false)} style={{
                padding: '2px 8px', fontSize: 9, background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              }}>Close</button>
            </div>

            {/* Summary */}
            <div style={{
              fontSize: 12, color: '#fff', lineHeight: 1.5, padding: '8px 10px', marginBottom: 10,
              background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 8,
            }}>{intel.summary}</div>

            {/* Defense Tendencies */}
            {intel.defTendencies?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', marginBottom: 4, textTransform: 'uppercase' }}>🛡️ Their Tendencies</div>
                {intel.defTendencies.map((t, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.7)', padding: '4px 8px', marginBottom: 3,
                    background: 'rgba(239,68,68,0.06)', borderRadius: 4, borderLeft: '2px solid #EF4444',
                  }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{t.look}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>({t.frequency})</span>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{t.situations}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {intel.recommendations?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', marginBottom: 4, textTransform: 'uppercase' }}>✅ Recommended Plays</div>
                {intel.recommendations.map((r, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.7)', padding: '4px 8px', marginBottom: 3,
                    background: 'rgba(74,222,128,0.06)', borderRadius: 4, borderLeft: '2px solid #4ADE80',
                  }}>
                    <span style={{ fontWeight: 700, color: '#4ADE80' }}>{r.play}</span> — {r.why}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>When: {r.when}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Alerts */}
            {intel.alerts?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#FDB913', marginBottom: 4, textTransform: 'uppercase' }}>⚠️ Alerts</div>
                {intel.alerts.map((a, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: '#FDB913', padding: '4px 8px', marginBottom: 3,
                    background: 'rgba(253,185,19,0.06)', borderRadius: 4, borderLeft: '2px solid #FDB913',
                  }}>{a}</div>
                ))}
              </div>
            )}

            {/* Patterns */}
            {intel.patterns?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', marginBottom: 4, textTransform: 'uppercase' }}>📊 Patterns Detected</div>
                {intel.patterns.map((p, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2, paddingLeft: 8, borderLeft: '2px solid rgba(96,165,250,0.3)' }}>{p}</div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayCard({ play, onCall, color }) {
  const [showDetail, setShowDetail] = useState(false);
  const dirIcon = play.direction === 'right' ? '→' : play.direction === 'left' ? '←' : play.direction === 'middle' ? '↑' : '⟷';

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => onCall(play)}
      onContextMenu={(e) => { e.preventDefault(); setShowDetail(!showDetail); }}
      style={{
        padding: '10px',
        background: `rgba(255,255,255,0.03)`,
        border: `1px solid rgba(255,255,255,0.08)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 100ms',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
          {play.name.replace('Beast ', '')}
        </div>
        <div style={{ fontSize: 14, opacity: 0.5 }}>{dirIcon}</div>
      </div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.2 }}>
        {play.description?.substring(0, 50)}
      </div>
      {play.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
          {play.tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: 8, padding: '1px 4px', borderRadius: 3,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
            }}>{t}</span>
          ))}
        </div>
      )}
    </motion.button>
  );
}
