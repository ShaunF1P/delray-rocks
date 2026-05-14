'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Plus, Trash2, Clock, GripVertical, Copy, Download } from 'lucide-react';

const DRILL_TEMPLATES = {
  warmup: [
    { name: 'Dynamic Stretching', duration: 5, type: 'warmup' },
    { name: 'High Knees / Butt Kicks', duration: 3, type: 'warmup' },
    { name: 'Form Running', duration: 5, type: 'warmup' },
    { name: 'Bear Crawls / Crab Walks', duration: 4, type: 'warmup' },
  ],
  individual: [
    { name: 'Stance & Start (OL/DL)', duration: 8, type: 'individual' },
    { name: 'Ball Security Gauntlet', duration: 6, type: 'individual' },
    { name: 'Route Running (WR/TE)', duration: 8, type: 'individual' },
    { name: 'Tackling Form (Heads Up)', duration: 8, type: 'individual' },
    { name: 'QB Handoff / Mesh Drill', duration: 6, type: 'individual' },
    { name: 'Blocking Sled / Pad Work', duration: 8, type: 'individual' },
    { name: 'Footwork Ladder', duration: 5, type: 'individual' },
    { name: 'Pass Rush Moves', duration: 6, type: 'individual' },
    { name: 'DB Backpedal / Break', duration: 6, type: 'individual' },
    { name: 'Catching Drill (JUGS)', duration: 6, type: 'individual' },
  ],
  team: [
    { name: 'Inside Run (Team Period)', duration: 10, type: 'team' },
    { name: 'Outside Run (Perimeter)', duration: 10, type: 'team' },
    { name: 'Pass Skeleton', duration: 10, type: 'team' },
    { name: '7-on-7', duration: 12, type: 'team' },
    { name: '11-on-11 Team', duration: 15, type: 'team' },
    { name: 'Goal Line / Short Yardage', duration: 8, type: 'team' },
    { name: 'Red Zone Offense', duration: 10, type: 'team' },
    { name: 'Blitz Pickup', duration: 8, type: 'team' },
  ],
  special: [
    { name: 'Kickoff Coverage', duration: 8, type: 'special' },
    { name: 'Kick Return', duration: 8, type: 'special' },
    { name: 'Punt Formation', duration: 6, type: 'special' },
    { name: 'Punt Return', duration: 6, type: 'special' },
  ],
  conditioning: [
    { name: 'Gassers (Sideline to Sideline)', duration: 5, type: 'conditioning' },
    { name: 'Bear Crawl Sprints', duration: 4, type: 'conditioning' },
    { name: '40-Yard Dashes', duration: 5, type: 'conditioning' },
    { name: 'Cool Down / Team Huddle', duration: 5, type: 'conditioning' },
  ],
};

const TYPE_COLORS = {
  warmup: '#FDB913', individual: '#60A5FA', team: '#4ADE80', special: '#A855F7', conditioning: '#EF4444', custom: '#6B7280',
};

const TEMPLATES = [
  { name: 'Game Week Tuesday', blocks: [
    { name: 'Dynamic Stretching', duration: 5, type: 'warmup' },
    { name: 'Stance & Start (OL/DL)', duration: 8, type: 'individual' },
    { name: 'Route Running (WR/TE)', duration: 8, type: 'individual' },
    { name: 'Inside Run (Team Period)', duration: 12, type: 'team' },
    { name: 'Pass Skeleton', duration: 10, type: 'team' },
    { name: 'Kickoff Coverage', duration: 8, type: 'special' },
    { name: 'Gassers (Sideline to Sideline)', duration: 5, type: 'conditioning' },
  ]},
  { name: 'Game Week Thursday', blocks: [
    { name: 'High Knees / Butt Kicks', duration: 3, type: 'warmup' },
    { name: 'Ball Security Gauntlet', duration: 6, type: 'individual' },
    { name: '11-on-11 Team', duration: 15, type: 'team' },
    { name: 'Red Zone Offense', duration: 10, type: 'team' },
    { name: 'Goal Line / Short Yardage', duration: 8, type: 'team' },
    { name: 'Cool Down / Team Huddle', duration: 5, type: 'conditioning' },
  ]},
];

export default function PracticePlanPage() {
  const [blocks, setBlocks] = useState([]);
  const [practiceDate, setPracticeDate] = useState(new Date().toISOString().split('T')[0]);
  const [practiceName, setPracticeName] = useState('');
  const [showDrills, setShowDrills] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customDuration, setCustomDuration] = useState(10);

  const totalMinutes = blocks.reduce((sum, b) => sum + b.duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  function addBlock(drill) {
    setBlocks(prev => [...prev, { ...drill, id: Date.now() + Math.random() }]);
    setShowDrills(null);
  }

  function removeBlock(index) {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  }

  function updateDuration(index, duration) {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, duration: Math.max(1, parseInt(duration) || 1) } : b));
  }

  function addCustom() {
    if (!customName) return;
    addBlock({ name: customName, duration: customDuration, type: 'custom' });
    setCustomName('');
    setCustomDuration(10);
  }

  function loadTemplate(template) {
    setBlocks(template.blocks.map(b => ({ ...b, id: Date.now() + Math.random() })));
    setPracticeName(template.name);
  }

  function moveBlock(index, direction) {
    const newBlocks = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    setBlocks(newBlocks);
  }

  // Calculate running clock
  let runningTime = 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardCheck size={24} color="#009A44" /> Practice Planner
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
            Build structured practice plans with time blocks
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#4ADE80' }}>
            {hours > 0 ? `${hours}h ` : ''}{mins}m
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Total Duration</div>
        </div>
      </div>

      {/* Practice Info */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input className="form-input" placeholder="Practice Name (e.g. Game Week Tuesday)" value={practiceName}
          onChange={e => setPracticeName(e.target.value)} style={{ flex: 2 }} />
        <input className="form-input" type="date" value={practiceDate} onChange={e => setPracticeDate(e.target.value)} style={{ flex: 1 }} />
      </div>

      {/* Templates */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', alignSelf: 'center', marginRight: 4 }}>Templates:</span>
        {TEMPLATES.map(t => (
          <button key={t.name} onClick={() => loadTemplate(t)} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
            background: 'rgba(0,154,68,0.1)', border: '1px solid rgba(0,154,68,0.2)', color: '#4ADE80',
          }}>{t.name}</button>
        ))}
      </div>

      {/* Practice Blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {blocks.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>No blocks yet. Add drills or load a template.</div>
          </div>
        )}

        <AnimatePresence>
          {blocks.map((block, i) => {
            const startMin = blocks.slice(0, i).reduce((s, b) => s + b.duration, 0);
            const startTime = `${Math.floor(startMin / 60)}:${String(startMin % 60).padStart(2, '0')}`;
            const color = TYPE_COLORS[block.type] || '#6B7280';

            return (
              <motion.div key={block.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${color}`, borderRadius: 8,
                }}>
                {/* Reorder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <button onClick={() => moveBlock(i, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, fontSize: 10 }}>▲</button>
                  <button onClick={() => moveBlock(i, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, fontSize: 10 }}>▼</button>
                </div>

                {/* Time marker */}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', width: 32, textAlign: 'center', fontWeight: 600 }}>{startTime}</div>

                {/* Drill info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{block.name}</div>
                  <div style={{ fontSize: 9, color, fontWeight: 600, textTransform: 'uppercase' }}>{block.type}</div>
                </div>

                {/* Duration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} color="var(--text-dim)" />
                  <input type="number" value={block.duration} onChange={e => updateDuration(i, e.target.value)}
                    style={{
                      width: 36, padding: '2px 4px', fontSize: 12, fontWeight: 700, textAlign: 'center',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 4, color: '#fff',
                    }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>min</span>
                </div>

                {/* Delete */}
                <button onClick={() => removeBlock(i)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                }}>
                  <Trash2 size={12} color="rgba(239,68,68,0.5)" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add Drill Section */}
      <div style={{
        padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 8 }}>Add Drill</div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {Object.entries(DRILL_TEMPLATES).map(([cat]) => (
            <button key={cat} onClick={() => setShowDrills(showDrills === cat ? null : cat)} style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              background: showDrills === cat ? `${TYPE_COLORS[cat]}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showDrills === cat ? TYPE_COLORS[cat] : 'rgba(255,255,255,0.08)'}`,
              color: showDrills === cat ? TYPE_COLORS[cat] : 'rgba(255,255,255,0.4)',
              textTransform: 'capitalize',
            }}>{cat}</button>
          ))}
        </div>

        {/* Drill options */}
        {showDrills && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginBottom: 10 }}>
            {DRILL_TEMPLATES[showDrills].map(drill => (
              <button key={drill.name} onClick={() => addBlock(drill)} style={{
                padding: '6px 10px', fontSize: 11, fontWeight: 500, borderRadius: 6, cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', textAlign: 'left',
              }}>
                {drill.name} <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>({drill.duration}m)</span>
              </button>
            ))}
          </div>
        )}

        {/* Custom drill */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="form-input" placeholder="Custom drill name..." value={customName}
            onChange={e => setCustomName(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} />
          <input type="number" value={customDuration} onChange={e => setCustomDuration(parseInt(e.target.value) || 1)}
            style={{
              width: 50, padding: '6px', fontSize: 12, textAlign: 'center',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, color: '#fff',
            }} />
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>min</span>
          <button onClick={addCustom} style={{
            padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
            background: 'rgba(0,154,68,0.15)', border: '1px solid rgba(0,154,68,0.3)', color: '#4ADE80',
          }}><Plus size={12} /> Add</button>
        </div>
      </div>
    </div>
  );
}
