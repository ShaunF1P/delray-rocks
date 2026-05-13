'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Default formation positions (x, y on 0-100 scale)
const FORMATION_POSITIONS = {
  // Offense
  'Beast T-Formation': {
    C: { x: 50, y: 55, role: 'line' }, LG: { x: 42, y: 55, role: 'line' }, RG: { x: 58, y: 55, role: 'line' },
    LT: { x: 34, y: 55, role: 'line' }, RT: { x: 66, y: 55, role: 'line' },
    QB: { x: 50, y: 62, role: 'skill' }, FB: { x: 50, y: 70, role: 'skill' },
    HB: { x: 42, y: 75, role: 'skill' }, TB: { x: 58, y: 75, role: 'skill' },
    TE: { x: 74, y: 55, role: 'line' }, WR: { x: 15, y: 55, role: 'skill' },
  },
  'Beast I-Formation': {
    C: { x: 50, y: 55, role: 'line' }, LG: { x: 42, y: 55, role: 'line' }, RG: { x: 58, y: 55, role: 'line' },
    LT: { x: 34, y: 55, role: 'line' }, RT: { x: 66, y: 55, role: 'line' },
    QB: { x: 50, y: 62, role: 'skill' }, FB: { x: 50, y: 70, role: 'skill' },
    TB: { x: 50, y: 78, role: 'skill' },
    TE: { x: 74, y: 55, role: 'line' }, WR1: { x: 15, y: 55, role: 'skill' }, WR2: { x: 85, y: 55, role: 'skill' },
  },
  'Beast Single Back': {
    C: { x: 50, y: 55, role: 'line' }, LG: { x: 42, y: 55, role: 'line' }, RG: { x: 58, y: 55, role: 'line' },
    LT: { x: 34, y: 55, role: 'line' }, RT: { x: 66, y: 55, role: 'line' },
    QB: { x: 50, y: 62, role: 'skill' }, RB: { x: 50, y: 72, role: 'skill' },
    TE: { x: 74, y: 55, role: 'line' },
    WR1: { x: 12, y: 55, role: 'skill' }, WR2: { x: 88, y: 55, role: 'skill' }, SLOT: { x: 78, y: 50, role: 'skill' },
  },
  'Shotgun Spread': {
    C: { x: 50, y: 55, role: 'line' }, LG: { x: 42, y: 55, role: 'line' }, RG: { x: 58, y: 55, role: 'line' },
    LT: { x: 34, y: 55, role: 'line' }, RT: { x: 66, y: 55, role: 'line' },
    QB: { x: 50, y: 65, role: 'skill' }, RB: { x: 56, y: 65, role: 'skill' },
    WR1: { x: 8, y: 55, role: 'skill' }, WR2: { x: 92, y: 55, role: 'skill' },
    SLOT: { x: 22, y: 52, role: 'skill' }, WR3: { x: 78, y: 52, role: 'skill' },
  },
  'Wing-T': {
    C: { x: 50, y: 55, role: 'line' }, LG: { x: 42, y: 55, role: 'line' }, RG: { x: 58, y: 55, role: 'line' },
    LT: { x: 34, y: 55, role: 'line' }, RT: { x: 66, y: 55, role: 'line' },
    QB: { x: 50, y: 62, role: 'skill' }, FB: { x: 50, y: 70, role: 'skill' },
    HB: { x: 38, y: 68, role: 'skill' }, WB: { x: 72, y: 52, role: 'skill' },
    TE: { x: 74, y: 55, role: 'line' }, WR: { x: 15, y: 55, role: 'skill' },
  },
  // Defense
  '4-2-5 Ring of Fire': {
    DT1: { x: 44, y: 48, role: 'line' }, DT2: { x: 56, y: 48, role: 'line' },
    DE1: { x: 32, y: 48, role: 'line' }, DE2: { x: 68, y: 48, role: 'line' },
    LB1: { x: 42, y: 40, role: 'skill' }, LB2: { x: 58, y: 40, role: 'skill' },
    CB1: { x: 12, y: 42, role: 'skill' }, CB2: { x: 88, y: 42, role: 'skill' },
    FS: { x: 50, y: 28, role: 'skill' }, SS: { x: 65, y: 33, role: 'skill' },
    NB: { x: 35, y: 33, role: 'skill' },
  },
  '6-2 Savage': {
    DT1: { x: 44, y: 48, role: 'line' }, DT2: { x: 56, y: 48, role: 'line' },
    DE1: { x: 32, y: 48, role: 'line' }, DE2: { x: 68, y: 48, role: 'line' },
    DL5: { x: 38, y: 48, role: 'line' }, DL6: { x: 62, y: 48, role: 'line' },
    LB1: { x: 44, y: 38, role: 'skill' }, LB2: { x: 56, y: 38, role: 'skill' },
    CB1: { x: 15, y: 42, role: 'skill' }, CB2: { x: 85, y: 42, role: 'skill' },
    FS: { x: 50, y: 28, role: 'skill' },
  },
};

// Route path generators (relative movements from player position)
const ROUTE_PATHS = {
  'go': (x, y) => [{ x, y: y - 30 }],
  'slant': (x, y, dir) => [{ x: x + (dir || 1) * 12, y: y - 15 }],
  'out': (x, y, dir) => [{ x, y: y - 10 }, { x: x + (dir || 1) * 15, y: y - 10 }],
  'in': (x, y, dir) => [{ x, y: y - 10 }, { x: x - (dir || 1) * 15, y: y - 10 }],
  'curl': (x, y) => [{ x, y: y - 12 }, { x, y: y - 10 }],
  'post': (x, y, dir) => [{ x, y: y - 10 }, { x: x + (dir || 1) * 10, y: y - 25 }],
  'corner': (x, y, dir) => [{ x, y: y - 10 }, { x: x + (dir || 1) * 15, y: y - 25 }],
  'flat': (x, y, dir) => [{ x: x + (dir || 1) * 12, y: y - 2 }],
  'seam': (x, y) => [{ x, y: y - 25 }],
  'hitch': (x, y) => [{ x, y: y - 6 }, { x, y: y - 4 }],
  'screen': (x, y, dir) => [{ x: x + (dir || 1) * 8, y: y + 3 }],
  'block': (x, y) => [{ x, y: y - 3 }],
  'pull_right': (x, y) => [{ x: x + 6, y }, { x: x + 12, y: y - 5 }],
  'pull_left': (x, y) => [{ x: x - 6, y }, { x: x - 12, y: y - 5 }],
  'run_right': (x, y) => [{ x: x + 5, y: y - 3 }, { x: x + 15, y: y - 8 }],
  'run_left': (x, y) => [{ x: x - 5, y: y - 3 }, { x: x - 15, y: y - 8 }],
  'run_middle': (x, y) => [{ x, y: y - 5 }, { x, y: y - 15 }],
  'handoff': (x, y) => [{ x, y: y - 2 }],
  'kick_out': (x, y, dir) => [{ x: x + (dir || 1) * 10, y: y - 6 }],
  'lead': (x, y) => [{ x, y: y - 8 }],
  'blitz_a': (x, y) => [{ x, y: y + 10 }],
  'blitz_b': (x, y, dir) => [{ x: x + (dir || 1) * 5, y: y + 10 }],
  'zone_drop': (x, y) => [{ x, y: y - 8 }],
  'backpedal': (x, y) => [{ x, y: y - 10 }],
};

export default function PlayDiagram({
  formationName = 'Beast T-Formation',
  play = null,
  isDefense = false,
  width = 400,
  height = 300,
  playerOverrides = {},
  showAssignments = true,
  animated = true,
  onPlayerClick = null,
}) {
  const [animStep, setAnimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const positions = FORMATION_POSITIONS[formationName] || FORMATION_POSITIONS['Beast T-Formation'];

  function startAnimation() {
    setIsPlaying(true);
    setAnimStep(0);
    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= 20) {
        clearInterval(intervalRef.current);
        setIsPlaying(false);
      }
    }, 150);
  }

  function stopAnimation() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setAnimStep(0);
  }

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  // Build route for each player based on their assignment text
  function inferRoute(posKey, assignment) {
    if (!assignment) return null;
    const a = assignment.toLowerCase();
    if (a.includes('go route') || a.includes('sprint to edge')) return 'go';
    if (a.includes('slant')) return 'slant';
    if (a.includes('out route') || a.includes('comeback')) return 'out';
    if (a.includes('crossing') || a.includes('in route') || a.includes('cross')) return 'in';
    if (a.includes('curl')) return 'curl';
    if (a.includes('post')) return 'post';
    if (a.includes('corner route')) return 'corner';
    if (a.includes('flat') || a.includes('leak')) return 'flat';
    if (a.includes('seam')) return 'seam';
    if (a.includes('hitch')) return 'hitch';
    if (a.includes('screen') || a.includes('dump')) return 'screen';
    if (a.includes('pull') && a.includes('right')) return 'pull_right';
    if (a.includes('pull') && a.includes('left')) return 'pull_left';
    if (a.includes('pull') && a.includes('lead')) return 'pull_right';
    if (a.includes('run') && a.includes('right') || a.includes('take handoff') && a.includes('right')) return 'run_right';
    if (a.includes('run') && a.includes('left') || a.includes('take handoff') && a.includes('left')) return 'run_left';
    if (a.includes('take handoff') || a.includes('hit') && a.includes('gap')) return 'run_middle';
    if (a.includes('hand off') || a.includes('fake') || a.includes('snap')) return 'handoff';
    if (a.includes('kick out')) return 'kick_out';
    if (a.includes('lead block') || a.includes('lead on')) return 'lead';
    if (a.includes('block') || a.includes('drive') || a.includes('down block') || a.includes('zone step') || a.includes('wedge') || a.includes('double team') || a.includes('seal')) return 'block';
    if (a.includes('blitz') && a.includes('a-gap')) return 'blitz_a';
    if (a.includes('blitz') && a.includes('b-gap')) return 'blitz_b';
    if (a.includes('zone') || a.includes('hook') || a.includes('drop')) return 'zone_drop';
    if (a.includes('deep') || a.includes('backpedal') || a.includes('man')) return 'backpedal';
    if (a.includes('rush')) return 'blitz_a';
    return null;
  }

  const dir = play?.direction === 'right' ? 1 : play?.direction === 'left' ? -1 : 1;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox="0 0 100 100" width={width} height={height}
        style={{ background: '#1a472a', borderRadius: 8, border: '2px solid rgba(255,255,255,0.1)' }}>
        {/* Field lines */}
        <line x1="0" y1="52" x2="100" y2="52" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        <line x1="0" y1="42" x2="100" y2="42" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" strokeDasharray="2,2" />
        <line x1="0" y1="32" x2="100" y2="32" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" strokeDasharray="2,2" />
        <line x1="0" y1="62" x2="100" y2="62" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" strokeDasharray="2,2" />
        <line x1="0" y1="72" x2="100" y2="72" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" strokeDasharray="2,2" />
        {/* Hash marks */}
        {[20,30,40,50,60,70,80].map(x => (
          <g key={x}>
            <line x1={x} y1="50" x2={x} y2="54" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
          </g>
        ))}
        {/* LOS label */}
        <text x="3" y="51" fill="rgba(255,255,255,0.15)" fontSize="2.5" fontWeight="700">LOS</text>

        {/* Players and routes */}
        {Object.entries(positions).map(([posKey, pos]) => {
          const override = playerOverrides[posKey] || {};
          const assignment = play?.assignments?.[posKey] || '';
          const routeType = inferRoute(posKey, assignment);
          const routeGen = routeType ? ROUTE_PATHS[routeType] : null;
          const routePoints = routeGen ? routeGen(pos.x, pos.y, dir) : [];

          const playerColor = isDefense ? '#EF4444' : '#4ADE80';
          const lineColor = isDefense ? '#EF4444' : '#FDB913';

          return (
            <g key={posKey}>
              {/* Route line (animated) */}
              {routePoints.length > 0 && showAssignments && (
                <motion.path
                  d={`M ${pos.x} ${pos.y} ${routePoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="0.6"
                  strokeDasharray={pos.role === 'line' ? '1,1' : 'none'}
                  initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 0.7 }}
                  animate={animated ? { pathLength: isPlaying ? 1 : 0, opacity: isPlaying ? 0.8 : 0.5 } : { pathLength: 1, opacity: 0.7 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  markerEnd="url(#arrowhead)"
                />
              )}

              {/* Player dot */}
              <circle
                cx={pos.x} cy={pos.y} r={isDefense ? 2.2 : 2.5}
                fill={isDefense ? 'transparent' : playerColor}
                stroke={playerColor}
                strokeWidth={isDefense ? '0.6' : '0.4'}
                style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                onClick={() => onPlayerClick?.(posKey, pos)}
              />
              {/* X for defense */}
              {isDefense && (
                <>
                  <line x1={pos.x - 1.5} y1={pos.y - 1.5} x2={pos.x + 1.5} y2={pos.y + 1.5} stroke={playerColor} strokeWidth="0.5" />
                  <line x1={pos.x + 1.5} y1={pos.y - 1.5} x2={pos.x - 1.5} y2={pos.y + 1.5} stroke={playerColor} strokeWidth="0.5" />
                </>
              )}

              {/* Position/Jersey label */}
              <text x={pos.x} y={pos.y + (isDefense ? -3.5 : 5.5)}
                fill="#fff" fontSize="2.2" fontWeight="700" textAnchor="middle"
                style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
                {override.jersey || override.name || posKey}
              </text>
            </g>
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M 0 0 L 4 2 L 0 4 Z" fill={isDefense ? '#EF4444' : '#FDB913'} />
          </marker>
        </defs>
      </svg>

      {/* Play button */}
      {animated && play?.assignments && Object.keys(play.assignments).length > 0 && (
        <button onClick={isPlaying ? stopAnimation : startAnimation}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 28, height: 28, borderRadius: '50%',
            background: isPlaying ? 'rgba(239,68,68,0.8)' : 'rgba(0,154,68,0.8)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff',
          }}>
          {isPlaying ? '⏹' : '▶'}
        </button>
      )}
    </div>
  );
}
