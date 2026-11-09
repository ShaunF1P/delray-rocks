'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, ArrowUpRight, Circle, Type, Eraser, RotateCcw, Download, Crosshair, Minus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = [
  { name: 'Rocks Gold', hex: '#FFD700' },
  { name: 'Neon Green', hex: '#22C55E' },
  { name: 'Electric Blue', hex: '#3B82F6' },
  { name: 'Coral Red', hex: '#EF4444' },
  { name: 'White', hex: '#FFFFFF' },
];

function normalizeBboxToPercent(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) {
    return [38, 44, 72, 56];
  }
  const nums = bbox.map(v => Number(v) || 0);
  const maxVal = Math.max(...nums);
  if (maxVal <= 1.05) {
    return nums.map(v => Math.max(2, Math.min(96, v * 100)));
  }
  if (maxVal > 100) {
    return nums.map(v => Math.max(2, Math.min(96, v / 10)));
  }
  return nums.map(v => Math.max(2, Math.min(96, v)));
}

function interpolateKeyframesForActors(telestratorKeyframes, currentPlayTimeOffset = 0) {
  if (!Array.isArray(telestratorKeyframes) || telestratorKeyframes.length === 0) {
    return [];
  }

  // Group keyframes by player/actor so each tracked player has a smooth trajectory
  const groups = new Map();
  telestratorKeyframes.forEach((kf, idx) => {
    if (!kf) return;
    // Support nested keyframes array if an actor object is passed
    if (Array.isArray(kf.keyframes)) {
      const actorKey = String(kf.player_id || kf.jersey_number || kf.role || `actor-${idx}`);
      if (!groups.has(actorKey)) groups.set(actorKey, []);
      kf.keyframes.forEach(inner => {
        groups.get(actorKey).push({
          ...kf,
          ...inner,
          timestamp_offset: Number(inner.timestamp_offset ?? inner.time_offset ?? inner.timestamp ?? 0),
          bbox: normalizeBboxToPercent(inner.bbox || kf.bbox),
        });
      });
      return;
    }

    const actorKey = String(kf.player_id || kf.jersey_number || kf.role || `actor-${idx}`);
    if (!groups.has(actorKey)) groups.set(actorKey, []);
    groups.get(actorKey).push({
      ...kf,
      timestamp_offset: Number(kf.timestamp_offset ?? kf.time_offset ?? kf.timestamp ?? 0),
      bbox: normalizeBboxToPercent(kf.bbox),
    });
  });

  const t = Number(currentPlayTimeOffset) || 0;
  const results = [];

  groups.forEach((frames, actorKey) => {
    const sorted = [...frames].sort((a, b) => a.timestamp_offset - b.timestamp_offset);
    if (sorted.length === 0) return;

    let currentBbox = sorted[0].bbox;
    let nextBbox = sorted[sorted.length - 1].bbox;
    let activeMeta = sorted[0];

    if (sorted.length === 1) {
      currentBbox = sorted[0].bbox;
      nextBbox = [
        Math.max(10, currentBbox[0] - 4),
        Math.min(88, currentBbox[1] + 8),
        Math.max(20, currentBbox[2] - 4),
        Math.min(92, currentBbox[3] + 8),
      ];
    } else if (t <= sorted[0].timestamp_offset) {
      currentBbox = sorted[0].bbox;
      nextBbox = sorted[1].bbox;
      activeMeta = sorted[0];
    } else if (t >= sorted[sorted.length - 1].timestamp_offset) {
      currentBbox = sorted[sorted.length - 1].bbox;
      const prev = sorted[sorted.length - 2];
      const dx = currentBbox[1] - prev.bbox[1];
      const dy = currentBbox[0] - prev.bbox[0];
      nextBbox = [
        currentBbox[0] + dy * 0.4,
        currentBbox[1] + dx * 0.4,
        currentBbox[2] + dy * 0.4,
        currentBbox[3] + dx * 0.4,
      ];
      activeMeta = sorted[sorted.length - 1];
    } else {
      for (let i = 0; i < sorted.length - 1; i++) {
        const k0 = sorted[i];
        const k1 = sorted[i + 1];
        if (t >= k0.timestamp_offset && t <= k1.timestamp_offset) {
          const span = Math.max(0.001, k1.timestamp_offset - k0.timestamp_offset);
          const alpha = Math.max(0, Math.min(1, (t - k0.timestamp_offset) / span));
          currentBbox = [
            k0.bbox[0] + (k1.bbox[0] - k0.bbox[0]) * alpha,
            k0.bbox[1] + (k1.bbox[1] - k0.bbox[1]) * alpha,
            k0.bbox[2] + (k1.bbox[2] - k0.bbox[2]) * alpha,
            k0.bbox[3] + (k1.bbox[3] - k0.bbox[3]) * alpha,
          ];
          nextBbox = k1.bbox;
          activeMeta = alpha < 0.5 ? k0 : k1;
          break;
        }
      }
    }

    const [ymin, xmin, ymax, xmax] = currentBbox;
    const [nymin, nxmin, nymax, nxmax] = nextBbox;
    const cx = (xmin + xmax) / 2;
    const cy = (ymin + ymax) / 2;
    const feetY = ymax - (ymax - ymin) * 0.08;
    const nextCx = (nxmin + nxmax) / 2;
    const nextFeetY = nymax - (nymax - nymin) * 0.08;

    let vx = nextCx - cx;
    let vy = nextFeetY - feetY;
    const mag = Math.hypot(vx, vy);
    if (mag < 2) {
      vx = 7;
      vy = -2.5;
    } else if (mag > 16) {
      vx = (vx / mag) * 14;
      vy = (vy / mag) * 14;
    }

    const isDefense =
      (activeMeta.role || '').toLowerCase().includes('tackle') ||
      (activeMeta.role || '').toLowerCase().includes('def') ||
      Number(activeMeta.jersey_number) === 9;

    const defaultLabel =
      activeMeta.label ||
      (Number(activeMeta.jersey_number) === 9
        ? `#9 ${activeMeta.player_name || 'L. Muhammad'} | ${activeMeta.position || 'RDE'} | 3-Anchor Lock 96%`
        : `Ball Carrier #${activeMeta.jersey_number ?? 1} ${activeMeta.player_name || ''} | ${activeMeta.role || 'RB'}`);

    results.push({
      key: actorKey,
      jersey_number: activeMeta.jersey_number,
      player_name: activeMeta.player_name,
      role: activeMeta.role || (isDefense ? 'primary_tackler' : 'ball_carrier'),
      label: defaultLabel,
      ymin,
      xmin,
      ymax,
      xmax,
      cx,
      cy,
      feetY,
      targetX: Math.max(5, Math.min(95, cx + vx)),
      targetY: Math.max(8, Math.min(92, feetY + vy)),
      accentColor: isDefense ? '#22C55E' : '#FFD700',
    });
  });

  return results;
}

export default function TelestratorCanvas({
  videoRef,
  isEnabled = false,
  onClose,
  telestratorKeyframes = [],
  currentPlayTimeOffset = 0,
  aiSpotlightEnabled = true,
  onToggleAiSpotlight,
}) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('arrow'); // 'pen' | 'arrow' | 'halo' | 'line' | 'text'
  const [color, setColor] = useState('#FFD700');
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [internalSpotlightEnabled, setInternalSpotlightEnabled] = useState(aiSpotlightEnabled);

  useEffect(() => {
    setInternalSpotlightEnabled(aiSpotlightEnabled);
  }, [aiSpotlightEnabled]);

  const effectiveSpotlight = onToggleAiSpotlight ? aiSpotlightEnabled : internalSpotlightEnabled;

  const handleToggleSpotlight = () => {
    const next = !effectiveSpotlight;
    setInternalSpotlightEnabled(next);
    if (onToggleAiSpotlight) {
      onToggleAiSpotlight(next);
    }
  };

  const interpolatedSpotlights = useMemo(
    () => interpolateKeyframesForActors(telestratorKeyframes, currentPlayTimeOffset),
    [telestratorKeyframes, currentPlayTimeOffset]
  );

  // Resize canvas to match video dimensions
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef?.current;
    if (!canvas || !video) return;

    const rect = video.getBoundingClientRect();
    canvas.width = rect.width || 800;
    canvas.height = rect.height || 450;

    // Restore previous state if history exists
    if (history.length > 0) {
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = history[history.length - 1];
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  }, [videoRef, history]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize, isEnabled]);

  // Save state to undo history
  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev, canvas.toDataURL()]);
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
      y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (!isEnabled) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    if (canvas) {
      setSnapshot(canvas.toDataURL());
    }

    if (tool === 'pen') {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e) => {
    if (!isDrawing || !isEnabled) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (tool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'arrow' || tool === 'halo' || tool === 'line') {
      if (snapshot) {
        const img = new Image();
        img.src = snapshot;
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          if (tool === 'arrow') {
            drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y, color, strokeWidth);
          } else if (tool === 'halo') {
            drawHalo(ctx, startPos.x, startPos.y, coords.x, coords.y, color, strokeWidth);
          } else if (tool === 'line') {
            drawLine(ctx, startPos.x, startPos.y, coords.x, coords.y, color, strokeWidth);
          }
        };
      }
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (tool === 'text') {
      const coords = getCanvasCoords(e);
      const text = prompt('Enter Coaching Annotation:');
      if (text) {
        ctx.font = `bold ${strokeWidth * 3 + 12}px sans-serif`;
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(text, coords.x, coords.y);
      }
    }

    saveState();
  };

  const drawLine = (ctx, fromx, fromy, tox, toy, lineColor, width) => {
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.restore();
  };

  const drawArrow = (ctx, fromx, fromy, tox, toy, arrowColor, width) => {
    const headlen = width * 3;
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawHalo = (ctx, fromx, fromy, tox, toy, haloColor, width) => {
    const radius = Math.sqrt(Math.pow(tox - fromx, 2) + Math.pow(toy - fromy, 2));
    ctx.save();
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = width;
    ctx.shadowColor = haloColor;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(fromx, fromy, Math.max(15, radius), 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = haloColor + '22';
    ctx.fill();
    ctx.restore();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const handleUndo = () => {
    if (history.length <= 1) {
      handleClear();
      return;
    }
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = newHistory[newHistory.length - 1];
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
  };

  const exportAnnotatedSnapshot = () => {
    const video = videoRef?.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      toast.error('Video frame unavailable for export');
      return;
    }

    try {
      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = video.videoWidth || canvas.width;
      mergedCanvas.height = video.videoHeight || canvas.height;
      const ctx = mergedCanvas.getContext('2d');

      ctx.drawImage(video, 0, 0, mergedCanvas.width, mergedCanvas.height);
      ctx.drawImage(canvas, 0, 0, mergedCanvas.width, mergedCanvas.height);

      const link = document.createElement('a');
      link.download = `telestrator-breakdown-${Date.now()}.png`;
      link.href = mergedCanvas.toDataURL('image/png');
      link.click();
      toast.success('Annotated coaching frame exported!');
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
  };

  const hasKeyframes = interpolatedSpotlights.length > 0;
  if (!isEnabled && !hasKeyframes) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30, overflow: 'hidden' }}>
      {/* Auto-Keyframed AI Player Spotlight Overlay */}
      {effectiveSpotlight && hasKeyframes && (
        <div
          data-testid="ai-telestrator-spotlight"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 25,
          }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <marker id="ai-vector-arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#22C55E" />
              </marker>
              <marker id="ai-vector-arrow-gold" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#FFD700" />
              </marker>
            </defs>

            {interpolatedSpotlights.map((actor) => {
              const rx = Math.max(4.5, (actor.xmax - actor.xmin) * 0.65);
              const ry = Math.max(2.2, rx * 0.42);
              const isGreen = actor.accentColor === '#22C55E';
              return (
                <g key={actor.key}>
                  {/* Outer Pulsing Spotlight Ring at Feet/Lower Torso */}
                  <ellipse
                    cx={actor.cx}
                    cy={actor.feetY}
                    rx={rx * 1.25}
                    ry={ry * 1.25}
                    fill="none"
                    stroke={actor.accentColor}
                    strokeWidth="0.45"
                    strokeDasharray="1.5 1"
                    opacity="0.75"
                  />
                  {/* Inner High-Visibility Spotlight Ring */}
                  <ellipse
                    cx={actor.cx}
                    cy={actor.feetY}
                    rx={rx}
                    ry={ry}
                    fill={`${actor.accentColor}26`}
                    stroke={actor.accentColor}
                    strokeWidth="0.75"
                  />
                  {/* Subtle Bounding Box Target Frame */}
                  <rect
                    x={actor.xmin}
                    y={actor.ymin}
                    width={Math.max(4, actor.xmax - actor.xmin)}
                    height={Math.max(8, actor.ymax - actor.ymin)}
                    rx="1"
                    fill="none"
                    stroke={actor.accentColor}
                    strokeWidth="0.35"
                    strokeDasharray="2 1.5"
                    opacity="0.65"
                  />
                  {/* Directional Pursuit / Motion Vector Arrow */}
                  <line
                    x1={actor.cx}
                    y1={actor.feetY}
                    x2={actor.targetX}
                    y2={actor.targetY}
                    stroke={actor.accentColor}
                    strokeWidth="0.85"
                    markerEnd={isGreen ? 'url(#ai-vector-arrow-green)' : 'url(#ai-vector-arrow-gold)'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating Pill Tags for Tracked Players */}
          {interpolatedSpotlights.map((actor) => (
            <div
              key={`pill-${actor.key}`}
              style={{
                position: 'absolute',
                left: `${Math.max(8, Math.min(84, actor.cx))}%`,
                top: `${Math.max(6, actor.ymin - 7)}%`,
                transform: 'translateX(-50%)',
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.92)',
                border: `1.5px solid ${actor.accentColor}`,
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: actor.accentColor,
                  display: 'inline-block',
                }}
              />
              <span>{actor.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Compact AI Spotlight Toggle Pill when full drawing bar is closed */}
      {!isEnabled && hasKeyframes && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            pointerEvents: 'auto',
            zIndex: 35,
          }}
        >
          <button
            type="button"
            data-testid="toggle-ai-spotlight-btn"
            onClick={handleToggleSpotlight}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: effectiveSpotlight ? 'rgba(34, 197, 94, 0.22)' : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${effectiveSpotlight ? '#22C55E' : 'rgba(255,255,255,0.2)'}`,
              color: effectiveSpotlight ? '#4ADE80' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              backdropFilter: 'blur(8px)',
            }}
            title="Toggle Auto-Keyframed AI Player Spotlight"
          >
            <Crosshair size={13} />
            AI Spotlight: {effectiveSpotlight ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {isEnabled && (
        <>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
              cursor: tool === 'pen' ? 'crosshair' : tool === 'arrow' ? 'nwse-resize' : 'default',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          <div
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-full)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              flexWrap: 'wrap',
              maxWidth: '96%',
            }}
          >
            <div style={{ display: 'flex', gap: '0.25rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                data-testid="toggle-ai-spotlight-btn"
                onClick={handleToggleSpotlight}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: effectiveSpotlight ? 'rgba(34, 197, 94, 0.25)' : 'transparent',
                  color: effectiveSpotlight ? '#4ADE80' : '#fff',
                  border: effectiveSpotlight ? '1px solid #22C55E' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
                title="Toggle AI Player Spotlight"
              >
                <Crosshair size={15} /> AI Spotlight
              </button>
              <button
                type="button"
                onClick={() => setTool('arrow')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: tool === 'arrow' ? 'var(--rocks-gold)' : 'transparent',
                  color: tool === 'arrow' ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title="Route Arrow Tool"
              >
                <ArrowUpRight size={15} /> Route Arrow
              </button>
              <button
                type="button"
                onClick={() => setTool('halo')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: tool === 'halo' ? 'var(--rocks-gold)' : 'transparent',
                  color: tool === 'halo' ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title="Spotlight Halo Tool"
              >
                <Circle size={15} /> Spotlight Ring
              </button>
              <button
                type="button"
                onClick={() => setTool('line')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: tool === 'line' ? 'var(--rocks-gold)' : 'transparent',
                  color: tool === 'line' ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title="Blocking Line Tool"
              >
                <Minus size={15} /> Line
              </button>
              <button
                type="button"
                onClick={() => setTool('pen')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: tool === 'pen' ? 'var(--rocks-gold)' : 'transparent',
                  color: tool === 'pen' ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title="Freehand Pen Tool"
              >
                <Pencil size={15} /> Draw
              </button>
              <button
                type="button"
                onClick={() => setTool('text')}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: tool === 'text' ? 'var(--rocks-gold)' : 'transparent',
                  color: tool === 'text' ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title="Text Annotation Tool"
              >
                <Type size={15} /> Text
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c.hex,
                    border: color === c.hex ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transform: color === c.hex ? 'scale(1.25)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                  title={c.name}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleUndo}
                style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                title="Undo"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                title="Clear Canvas"
              >
                <Eraser size={16} />
              </button>
              <button
                type="button"
                onClick={exportAnnotatedSnapshot}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--rocks-gold)',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
                title="Export Annotated PNG Frame"
              >
                <Download size={15} /> Export PNG
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.25rem' }}
                  title="Close Telestrator"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
