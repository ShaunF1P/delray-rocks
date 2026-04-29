'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Play, Pause, RotateCcw, Brain, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, Button, Badge, PageHeader } from '@/components/ui/index';
import toast from 'react-hot-toast';

const DRILL_TYPES = [
  { value: 'tackling', label: 'Tackling Form', desc: 'Head-up wrap tackle technique' },
  { value: 'throwing', label: 'Throwing Mechanics', desc: 'QB arm slot and follow-through' },
  { value: 'stance', label: '3-Point Stance', desc: 'Lineman stance and first step' },
  { value: 'running', label: 'Running Form', desc: 'Knee drive, lean, arm pump' },
  { value: 'catching', label: 'Catching Mechanics', desc: 'Hand positioning and tuck' },
  { value: 'backpedal', label: 'Backpedal / Coverage', desc: 'Hip turn and transition' },
];

// MediaPipe Pose landmark indices
const POSE = {
  NOSE: 0, LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14, LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24, LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

const SKELETON_CONNECTIONS = [
  [POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER],
  [POSE.LEFT_SHOULDER, POSE.LEFT_ELBOW], [POSE.LEFT_ELBOW, POSE.LEFT_WRIST],
  [POSE.RIGHT_SHOULDER, POSE.RIGHT_ELBOW], [POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST],
  [POSE.LEFT_SHOULDER, POSE.LEFT_HIP], [POSE.RIGHT_SHOULDER, POSE.RIGHT_HIP],
  [POSE.LEFT_HIP, POSE.RIGHT_HIP],
  [POSE.LEFT_HIP, POSE.LEFT_KNEE], [POSE.LEFT_KNEE, POSE.LEFT_ANKLE],
  [POSE.RIGHT_HIP, POSE.RIGHT_KNEE], [POSE.RIGHT_KNEE, POSE.RIGHT_ANKLE],
];

function calcAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

export default function FormAnalysisPage() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [drillType, setDrillType] = useState('tackling');
  const [playerName, setPlayerName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [poseLoaded, setPoseLoaded] = useState(false);
  const [poseLoading, setPoseLoading] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [angles, setAngles] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);

  // Load MediaPipe
  const loadPose = useCallback(async () => {
    if (poseLandmarkerRef.current) { setPoseLoaded(true); return; }
    setPoseLoading(true);
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const { PoseLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      setPoseLoaded(true);
      toast.success('MediaPipe Pose AI loaded');
    } catch (err) {
      console.error('MediaPipe load error:', err);
      toast.error('Failed to load Pose AI model');
    } finally {
      setPoseLoading(false);
    }
  }, []);

  // Handle file selection
  function handleFile(file) {
    if (!file || !file.type.startsWith('video/')) {
      toast.error('Please select a video file'); return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error('Max 200MB for form analysis clips'); return;
    }
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setLandmarks(null); setAngles(null); setAiReport(null);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // Pose detection loop
  function startPoseDetection() {
    if (!poseLandmarkerRef.current || !videoRef.current) return;
    setIsAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let lastTime = -1;

    function detect() {
      if (video.paused || video.ended) { setIsAnalyzing(false); return; }
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const result = poseLandmarkerRef.current.detectForVideo(video, performance.now());
        if (result.landmarks && result.landmarks.length > 0) {
          const lm = result.landmarks[0];
          setLandmarks(lm);
          drawSkeleton(ctx, lm, canvas.width, canvas.height);
          computeAngles(lm);
        }
      }
      animFrameRef.current = requestAnimationFrame(detect);
    }
    detect();
  }

  function drawSkeleton(ctx, lm, w, h) {
    // Draw connections
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00FF88';
    ctx.shadowBlur = 8;
    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      if (lm[a] && lm[b] && lm[a].visibility > 0.5 && lm[b].visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(lm[a].x * w, lm[a].y * h);
        ctx.lineTo(lm[b].x * w, lm[b].y * h);
        ctx.stroke();
      }
    });
    // Draw joints
    ctx.shadowBlur = 0;
    Object.values(POSE).forEach(idx => {
      if (lm[idx] && lm[idx].visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(lm[idx].x * w, lm[idx].y * h, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#FDB913';
        ctx.fill();
        ctx.strokeStyle = '#106B3A';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  function computeAngles(lm) {
    const a = {};
    if (lm[POSE.LEFT_SHOULDER] && lm[POSE.LEFT_ELBOW] && lm[POSE.LEFT_WRIST])
      a['Left Elbow'] = calcAngle(lm[POSE.LEFT_SHOULDER], lm[POSE.LEFT_ELBOW], lm[POSE.LEFT_WRIST]);
    if (lm[POSE.RIGHT_SHOULDER] && lm[POSE.RIGHT_ELBOW] && lm[POSE.RIGHT_WRIST])
      a['Right Elbow'] = calcAngle(lm[POSE.RIGHT_SHOULDER], lm[POSE.RIGHT_ELBOW], lm[POSE.RIGHT_WRIST]);
    if (lm[POSE.LEFT_HIP] && lm[POSE.LEFT_KNEE] && lm[POSE.LEFT_ANKLE])
      a['Left Knee'] = calcAngle(lm[POSE.LEFT_HIP], lm[POSE.LEFT_KNEE], lm[POSE.LEFT_ANKLE]);
    if (lm[POSE.RIGHT_HIP] && lm[POSE.RIGHT_KNEE] && lm[POSE.RIGHT_ANKLE])
      a['Right Knee'] = calcAngle(lm[POSE.RIGHT_HIP], lm[POSE.RIGHT_KNEE], lm[POSE.RIGHT_ANKLE]);
    if (lm[POSE.LEFT_SHOULDER] && lm[POSE.LEFT_HIP] && lm[POSE.LEFT_KNEE])
      a['Left Hip'] = calcAngle(lm[POSE.LEFT_SHOULDER], lm[POSE.LEFT_HIP], lm[POSE.LEFT_KNEE]);
    if (lm[POSE.RIGHT_SHOULDER] && lm[POSE.RIGHT_HIP] && lm[POSE.RIGHT_KNEE])
      a['Right Hip'] = calcAngle(lm[POSE.RIGHT_SHOULDER], lm[POSE.RIGHT_HIP], lm[POSE.RIGHT_KNEE]);
    if (lm[POSE.NOSE] && lm[POSE.LEFT_SHOULDER] && lm[POSE.LEFT_HIP])
      a['Torso Lean'] = calcAngle(lm[POSE.NOSE], lm[POSE.LEFT_SHOULDER], lm[POSE.LEFT_HIP]);
    setAngles(a);
  }

  // AI coaching report
  async function getAICoaching() {
    if (!angles || Object.keys(angles).length === 0) {
      toast.error('Play the video first to capture pose data'); return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/form-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angles, drillType, playerName, position: '' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiReport(data.analysis);
      toast.success('AI coaching report generated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  return (
    <div>
      <PageHeader
        title="Form Analysis"
        subtitle="AI-powered biomechanical coaching — MediaPipe Pose + Gemini"
        breadcrumbs={[{ label: 'Coach', href: '/coach/dashboard' }, { label: 'Form Analysis' }]}
        actions={
          <Badge variant="purple" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
            <Brain size={12} style={{ marginRight: 4 }} /> MEDIAPIPE AI
          </Badge>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: videoUrl ? '2fr 1fr' : '1fr', gap: 'var(--space-xl)' }}>
        {/* Left: Video + Canvas */}
        <div>
          {!videoUrl ? (
            <Card style={{ padding: 'var(--space-2xl)' }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('form-video-input').click()}
                style={{
                  border: `2px dashed ${dragOver ? '#009A44' : 'var(--border-light)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 200ms',
                  background: dragOver ? 'rgba(0,154,68,0.05)' : 'transparent',
                }}
              >
                <Activity size={48} color="var(--rocks-green-light)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 8 }}>
                  Upload a Drill Clip
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
                  Drop a short video of a player performing a drill. The AI will overlay a skeletal wireframe and analyze their form.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  MP4, MOV, WebM — up to 200MB
                </p>
                <input id="form-video-input" type="file" accept="video/*" hidden
                  onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              </div>

              {/* Drill type selector */}
              <div style={{ marginTop: 'var(--space-xl)' }}>
                <label className="form-label">DRILL TYPE</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {DRILL_TYPES.map(d => (
                    <button key={d.value} onClick={() => setDrillType(d.value)}
                      style={{
                        padding: '0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        border: `2px solid ${drillType === d.value ? '#009A44' : 'var(--border)'}`,
                        background: drillType === d.value ? 'rgba(0,154,68,0.1)' : 'var(--bg-glass)',
                        color: drillType === d.value ? '#009A44' : 'var(--text-secondary)',
                        textAlign: 'left', transition: 'all 150ms',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{d.label}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 2 }}>{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card style={{ overflow: 'hidden' }}>
              {/* Video + skeleton overlay */}
              <div style={{ position: 'relative', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <video ref={videoRef} src={videoUrl} controls
                  style={{ width: '100%', maxHeight: 500, display: 'block' }}
                  onPlay={() => { setIsPlaying(true); if (poseLoaded) startPoseDetection(); }}
                  onPause={() => { setIsPlaying(false); if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }}
                  onLoadedMetadata={() => loadPose()}
                />
                <canvas ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                />
                {/* Status badge */}
                <div style={{
                  position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8,
                }}>
                  {poseLoading && (
                    <Badge variant="gold" style={{ fontSize: '0.6rem' }}>Loading Pose AI...</Badge>
                  )}
                  {poseLoaded && (
                    <Badge variant="green" style={{ fontSize: '0.6rem' }}>
                      <CheckCircle size={10} style={{ marginRight: 3 }} /> Pose AI Active
                    </Badge>
                  )}
                  {isAnalyzing && (
                    <Badge variant="purple" style={{ fontSize: '0.6rem' }}>
                      <Activity size={10} style={{ marginRight: 3 }} /> Tracking...
                    </Badge>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div style={{ padding: 'var(--space-md)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: 4 }}>DRILL TYPE</label>
                  <select className="form-input" value={drillType} onChange={e => setDrillType(e.target.value)}>
                    {DRILL_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: 4 }}>PLAYER NAME</label>
                  <input className="form-input" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Optional" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: 20 }}>
                  <Button variant="ghost" icon={<RotateCcw size={14} />}
                    onClick={() => { setVideoUrl(null); setVideoFile(null); setLandmarks(null); setAngles(null); setAiReport(null); }}>
                    New Clip
                  </Button>
                  <Button variant="primary" icon={<Brain size={14} />}
                    loading={aiLoading} onClick={getAICoaching}
                    disabled={!angles}>
                    Get AI Coaching
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Angle data + AI report */}
        {videoUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Live angles */}
            <Card>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="var(--rocks-green-light)" /> Joint Angles
              </h3>
              {angles && Object.keys(angles).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(angles).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{key}</span>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', fontFamily: 'monospace', color: val < 90 ? 'var(--amber)' : val > 170 ? 'var(--red)' : 'var(--green)' }}>
                        {val}°
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
                  Play the video to begin pose tracking. Joint angles will appear here in real-time.
                </p>
              )}
            </Card>

            {/* AI Report */}
            <AnimatePresence>
              {aiReport && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <Card highlight>
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Brain size={16} color="var(--purple)" /> AI Coaching Report
                    </h3>
                    <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: aiReport.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>').replace(/^### (.*)/gm, '<h4 style="color:var(--rocks-gold);margin:1rem 0 0.5rem;font-size:0.9rem">$1</h4>').replace(/^## (.*)/gm, '<h3 style="color:var(--rocks-green-light);margin:1.2rem 0 0.5rem">$1</h3>').replace(/^# (.*)/gm, '<h2 style="color:var(--text-primary);margin:1.5rem 0 0.75rem">$1</h2>') }}
                    />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
