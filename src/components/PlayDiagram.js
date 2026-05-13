'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FORMATION_POSITIONS = {
  'Beast T-Formation': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:62,role:'skill'},FB:{x:50,y:70,role:'skill'},
    HB:{x:42,y:75,role:'skill'},TB:{x:58,y:75,role:'skill'},
    TE:{x:74,y:55,role:'line'},WR:{x:15,y:55,role:'skill'},
  },
  'Beast I-Formation': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:62,role:'skill'},FB:{x:50,y:70,role:'skill'},TB:{x:50,y:78,role:'skill'},
    TE:{x:74,y:55,role:'line'},WR1:{x:15,y:55,role:'skill'},WR2:{x:85,y:55,role:'skill'},
  },
  'Beast Single Back': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:62,role:'skill'},RB:{x:50,y:72,role:'skill'},TE:{x:74,y:55,role:'line'},
    WR1:{x:12,y:55,role:'skill'},WR2:{x:88,y:55,role:'skill'},SLOT:{x:78,y:50,role:'skill'},
  },
  'Beast Strongman': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:62,role:'skill'},FB:{x:50,y:70,role:'skill'},TB:{x:50,y:78,role:'skill'},
    TE:{x:74,y:55,role:'line'},TE2:{x:26,y:55,role:'line'},
  },
  'Beast Air Raid': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:65,role:'skill'},RB:{x:56,y:65,role:'skill'},
    WR1:{x:8,y:55,role:'skill'},WR2:{x:92,y:55,role:'skill'},
    WR3:{x:22,y:52,role:'skill'},WR4:{x:78,y:52,role:'skill'},
  },
  'Shotgun Spread': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:65,role:'skill'},RB:{x:56,y:65,role:'skill'},
    WR1:{x:8,y:55,role:'skill'},WR2:{x:92,y:55,role:'skill'},
    SLOT:{x:22,y:52,role:'skill'},WR3:{x:78,y:52,role:'skill'},
  },
  'Wing-T': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:62,role:'skill'},FB:{x:50,y:70,role:'skill'},
    HB:{x:38,y:68,role:'skill'},WB:{x:72,y:52,role:'skill'},
    TE:{x:74,y:55,role:'line'},WR:{x:15,y:55,role:'skill'},
  },
  'Power I': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:62,role:'skill'},FB:{x:50,y:70,role:'skill'},TB:{x:50,y:78,role:'skill'},
    TE:{x:74,y:55,role:'line'},WR:{x:15,y:55,role:'skill'},
  },
  'Wishbone': {
    C:{x:50,y:55,role:'line'},LG:{x:42,y:55,role:'line'},RG:{x:58,y:55,role:'line'},
    LT:{x:34,y:55,role:'line'},RT:{x:66,y:55,role:'line'},
    QB:{x:50,y:62,role:'skill'},FB:{x:50,y:70,role:'skill'},
    HB:{x:40,y:76,role:'skill'},TB:{x:60,y:76,role:'skill'},
    TE:{x:74,y:55,role:'line'},
  },
  '4-2-5 Ring of Fire': {
    DT1:{x:44,y:48,role:'line'},DT2:{x:56,y:48,role:'line'},
    DE1:{x:32,y:48,role:'line'},DE2:{x:68,y:48,role:'line'},
    LB1:{x:42,y:40,role:'skill'},LB2:{x:58,y:40,role:'skill'},
    CB1:{x:12,y:42,role:'skill'},CB2:{x:88,y:42,role:'skill'},
    FS:{x:50,y:28,role:'skill'},SS:{x:65,y:33,role:'skill'},NB:{x:35,y:33,role:'skill'},
  },
  '6-2 Savage': {
    DT1:{x:44,y:48,role:'line'},DT2:{x:56,y:48,role:'line'},
    DE1:{x:32,y:48,role:'line'},DE2:{x:68,y:48,role:'line'},
    DL5:{x:38,y:48,role:'line'},DL6:{x:62,y:48,role:'line'},
    LB1:{x:44,y:38,role:'skill'},LB2:{x:56,y:38,role:'skill'},
    CB1:{x:15,y:42,role:'skill'},CB2:{x:85,y:42,role:'skill'},FS:{x:50,y:28,role:'skill'},
  },
  '4-4 Reaper': {
    DT1:{x:44,y:48,role:'line'},DT2:{x:56,y:48,role:'line'},
    DE:{x:32,y:48,role:'line'},DE2:{x:68,y:48,role:'line'},
    ILB:{x:44,y:38,role:'skill'},ILB2:{x:56,y:38,role:'skill'},
    OLB:{x:30,y:38,role:'skill'},OLB2:{x:70,y:38,role:'skill'},
    CB:{x:12,y:42,role:'skill'},CB2:{x:88,y:42,role:'skill'},FS:{x:50,y:28,role:'skill'},
  },
};

const ROUTE_PATHS = {
  'go':(x,y)=>[{x,y:y-30}],
  'slant':(x,y,d)=>[{x:x+(d||1)*12,y:y-15}],
  'out':(x,y,d)=>[{x,y:y-10},{x:x+(d||1)*15,y:y-10}],
  'in':(x,y,d)=>[{x,y:y-10},{x:x-(d||1)*15,y:y-10}],
  'curl':(x,y)=>[{x,y:y-12},{x,y:y-10}],
  'post':(x,y,d)=>[{x,y:y-10},{x:x+(d||1)*10,y:y-25}],
  'corner':(x,y,d)=>[{x,y:y-10},{x:x+(d||1)*15,y:y-25}],
  'flat':(x,y,d)=>[{x:x+(d||1)*12,y:y-2}],
  'seam':(x,y)=>[{x,y:y-25}],
  'hitch':(x,y)=>[{x,y:y-6},{x,y:y-4}],
  'screen':(x,y,d)=>[{x:x+(d||1)*8,y:y+3}],
  'block':(x,y)=>[{x,y:y-3}],
  'pull_right':(x,y)=>[{x:x+6,y},{x:x+12,y:y-5}],
  'pull_left':(x,y)=>[{x:x-6,y},{x:x-12,y:y-5}],
  'run_right':(x,y)=>[{x:x+5,y:y-3},{x:x+15,y:y-8}],
  'run_left':(x,y)=>[{x:x-5,y:y-3},{x:x-15,y:y-8}],
  'run_middle':(x,y)=>[{x,y:y-5},{x,y:y-15}],
  'handoff':(x,y)=>[{x,y:y-2}],
  'kick_out':(x,y,d)=>[{x:x+(d||1)*10,y:y-6}],
  'lead':(x,y)=>[{x,y:y-8}],
  'blitz_a':(x,y)=>[{x,y:y+10}],
  'blitz_b':(x,y,d)=>[{x:x+(d||1)*5,y:y+10}],
  'zone_drop':(x,y)=>[{x,y:y-8}],
  'backpedal':(x,y)=>[{x,y:y-10}],
};

function inferRoute(posKey, assignment) {
  if (!assignment) return null;
  const a = assignment.toLowerCase();
  if (a.includes('go route')||a.includes('sprint to edge')) return 'go';
  if (a.includes('slant')) return 'slant';
  if (a.includes('out route')||a.includes('comeback')) return 'out';
  if (a.includes('crossing')||a.includes('in route')||a.includes('cross')) return 'in';
  if (a.includes('curl')) return 'curl';
  if (a.includes('post')) return 'post';
  if (a.includes('corner route')) return 'corner';
  if (a.includes('flat')||a.includes('leak')) return 'flat';
  if (a.includes('seam')) return 'seam';
  if (a.includes('hitch')) return 'hitch';
  if (a.includes('screen')||a.includes('dump')) return 'screen';
  if (a.includes('pull')&&a.includes('right')) return 'pull_right';
  if (a.includes('pull')&&a.includes('left')) return 'pull_left';
  if (a.includes('pull')&&a.includes('lead')) return 'pull_right';
  if ((a.includes('run')&&a.includes('right'))||(a.includes('take handoff')&&a.includes('right'))) return 'run_right';
  if ((a.includes('run')&&a.includes('left'))||(a.includes('take handoff')&&a.includes('left'))) return 'run_left';
  if (a.includes('take handoff')||(a.includes('hit')&&a.includes('gap'))) return 'run_middle';
  if (a.includes('hand off')||a.includes('fake')||a.includes('snap')) return 'handoff';
  if (a.includes('kick out')) return 'kick_out';
  if (a.includes('lead block')||a.includes('lead on')) return 'lead';
  if (a.includes('block')||a.includes('drive')||a.includes('down block')||a.includes('zone step')||a.includes('wedge')||a.includes('double team')||a.includes('seal')) return 'block';
  if (a.includes('blitz')&&a.includes('a-gap')) return 'blitz_a';
  if (a.includes('blitz')&&a.includes('b-gap')) return 'blitz_b';
  if (a.includes('zone')||a.includes('hook')||a.includes('drop')) return 'zone_drop';
  if (a.includes('deep')||a.includes('backpedal')||a.includes('man')) return 'backpedal';
  if (a.includes('rush')) return 'blitz_a';
  return null;
}

export default function PlayDiagram({
  formationName = 'Beast T-Formation', play = null, isDefense = false,
  width = 400, height = 300, playerOverrides = {}, showAssignments = true, animated = true,
}) {
  const [mode, setMode] = useState('routes'); // 'routes' or 'motion'
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1 for motion mode
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const animRef = useRef(null);

  const positions = FORMATION_POSITIONS[formationName] || FORMATION_POSITIONS['Beast T-Formation'];
  const dir = play?.direction === 'right' ? 1 : play?.direction === 'left' ? -1 : 1;
  const hasAssignments = play?.assignments && Object.keys(play.assignments).length > 0;
  const noFilter = selectedPositions.size === 0;

  function togglePosition(posKey) {
    setSelectedPositions(prev => {
      const next = new Set(prev);
      next.has(posKey) ? next.delete(posKey) : next.add(posKey);
      return next;
    });
  }

  function startAnim() {
    setIsPlaying(true); setProgress(0);
    const start = Date.now();
    const dur = mode === 'motion' ? 2500 : 1500;
    function tick() {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / dur);
      setProgress(p);
      if (p < 1) { animRef.current = requestAnimationFrame(tick); }
      else { setIsPlaying(false); }
    }
    animRef.current = requestAnimationFrame(tick);
  }

  function stopAnim() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsPlaying(false); setProgress(0);
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  // Interpolate position along route
  function getMotionPos(startX, startY, routePoints, t) {
    if (!routePoints.length || t <= 0) return { x: startX, y: startY };
    const allPts = [{ x: startX, y: startY }, ...routePoints];
    const segCount = allPts.length - 1;
    const segProgress = t * segCount;
    const segIdx = Math.min(Math.floor(segProgress), segCount - 1);
    const segT = segProgress - segIdx;
    const from = allPts[segIdx], to = allPts[segIdx + 1];
    return { x: from.x + (to.x - from.x) * segT, y: from.y + (to.y - from.y) * segT };
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox="0 0 100 100" width={width} height={height}
        style={{ background: '#1a472a', borderRadius: 8, border: '2px solid rgba(255,255,255,0.1)' }}>
        {/* Field */}
        <line x1="0" y1="52" x2="100" y2="52" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        {[32,42,62,72].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" strokeDasharray="2,2" />)}
        {[20,30,40,50,60,70,80].map(x => <line key={x} x1={x} y1="50" x2={x} y2="54" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />)}
        <text x="3" y="51" fill="rgba(255,255,255,0.12)" fontSize="2.5" fontWeight="700">LOS</text>

        <defs>
          <marker id="ah" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0 0L4 2L0 4Z" fill={isDefense ? '#EF4444' : '#FDB913'} />
          </marker>
          <filter id="glow"><feGaussianBlur stdDeviation="1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {Object.entries(positions).map(([posKey, pos]) => {
          const assignment = play?.assignments?.[posKey] || '';
          const routeType = inferRoute(posKey, assignment);
          const routePoints = routeType ? (ROUTE_PATHS[routeType]?.(pos.x, pos.y, dir) || []) : [];
          const isSelected = noFilter || selectedPositions.has(posKey);
          const dimmed = !isSelected;
          const pColor = isDefense ? '#EF4444' : '#4ADE80';
          const lColor = isDefense ? '#EF4444' : '#FDB913';
          const override = playerOverrides[posKey] || {};

          // In motion mode, calculate current dot position
          const motionPos = (mode === 'motion' && isPlaying && isSelected && routePoints.length > 0)
            ? getMotionPos(pos.x, pos.y, routePoints, progress)
            : null;

          const dotX = motionPos ? motionPos.x : pos.x;
          const dotY = motionPos ? motionPos.y : pos.y;

          return (
            <g key={posKey} opacity={dimmed ? 0.2 : 1} style={{ transition: 'opacity 200ms' }}>
              {/* Route trail */}
              {routePoints.length > 0 && showAssignments && isSelected && (
                <>
                  {/* Ghost trail in motion mode */}
                  {mode === 'motion' && isPlaying && (
                    <path
                      d={`M ${pos.x} ${pos.y} ${routePoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                      fill="none" stroke={lColor} strokeWidth="0.3" strokeDasharray="1,1" opacity="0.3"
                    />
                  )}
                  {/* Route line (static or animated path draw) */}
                  {mode === 'routes' && (
                    <motion.path
                      d={`M ${pos.x} ${pos.y} ${routePoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                      fill="none" stroke={lColor} strokeWidth="0.6"
                      strokeDasharray={pos.role === 'line' ? '1,1' : 'none'}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: isPlaying ? 1 : 0, opacity: isPlaying ? 0.8 : 0.4 }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      markerEnd="url(#ah)"
                    />
                  )}
                </>
              )}

              {/* Player dot */}
              <circle
                cx={dotX} cy={dotY} r={isDefense ? 2.2 : 2.8}
                fill={isDefense ? 'transparent' : (isSelected && !dimmed ? pColor : pColor)}
                stroke={isSelected ? (dimmed ? pColor : '#fff') : pColor}
                strokeWidth={isSelected && !dimmed ? '0.6' : '0.4'}
                style={{ cursor: 'pointer', transition: motionPos ? 'none' : 'all 200ms' }}
                onClick={() => togglePosition(posKey)}
                filter={isSelected && !dimmed && isPlaying ? 'url(#glow)' : undefined}
              />
              {/* X marker for defense */}
              {isDefense && (
                <>
                  <line x1={dotX-1.5} y1={dotY-1.5} x2={dotX+1.5} y2={dotY+1.5} stroke={pColor} strokeWidth="0.5" />
                  <line x1={dotX+1.5} y1={dotY-1.5} x2={dotX-1.5} y2={dotY+1.5} stroke={pColor} strokeWidth="0.5" />
                </>
              )}

              {/* Label */}
              <text x={dotX} y={dotY + (isDefense ? -3.5 : 5.5)}
                fill={isSelected && !dimmed ? '#fff' : 'rgba(255,255,255,0.4)'}
                fontSize={isSelected && !dimmed ? '2.5' : '2'} fontWeight="700" textAnchor="middle">
                {override.jersey || override.name || posKey}
              </text>

              {/* Selection ring */}
              {isSelected && !noFilter && (
                <circle cx={pos.x} cy={pos.y} r="4" fill="none" stroke="#FDB913" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.5" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Controls */}
      {animated && hasAssignments && (
        <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Mode toggle */}
          <button onClick={() => { stopAnim(); setMode(mode === 'routes' ? 'motion' : 'routes'); }}
            style={{
              padding: '3px 8px', fontSize: 9, fontWeight: 700, borderRadius: 4, cursor: 'pointer',
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#FDB913',
              letterSpacing: '0.03em',
            }}>
            {mode === 'routes' ? '🏃 Motion' : '📐 Routes'}
          </button>
          {/* Play/stop */}
          <button onClick={isPlaying ? stopAnim : startAnim}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: isPlaying ? 'rgba(239,68,68,0.8)' : 'rgba(0,154,68,0.8)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#fff',
            }}>
            {isPlaying ? '⏹' : '▶'}
          </button>
        </div>
      )}

      {/* Clear selection */}
      {selectedPositions.size > 0 && (
        <button onClick={() => setSelectedPositions(new Set())}
          style={{
            position: 'absolute', top: 6, right: 6, padding: '2px 8px', fontSize: 9, fontWeight: 600,
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4,
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          }}>
          Clear ({selectedPositions.size})
        </button>
      )}
    </div>
  );
}
