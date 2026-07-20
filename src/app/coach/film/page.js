'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Upload, Search, Play, Clock, Grid, List, Eye, Trash2, Brain, FileVideo, CheckCircle, AlertCircle, Loader2, Scissors, SkipBack, SkipForward, Save } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal, EmptyState } from '@/components/ui/index';
import { FootballIcon, StadiumIcon, LightningIcon, TrophyIcon } from '@/components/ui/Icons';
import { createClient } from '@/lib/supabase';
import { trackFilmView, trackFilmUpload, trackFilmAnalysis } from '@/lib/track';
import toast from 'react-hot-toast';
import * as tus from 'tus-js-client';
import { compressVideo } from '@/lib/video-compressor';
import { Thermometer, Wind, Sun, CloudRain, Cloud, CloudLightning, Pause, FileText, Shield, Lock, Unlock, GripVertical } from 'lucide-react';

const FILM_TYPES = [
  { value: 'game', label: 'Game Film', Icon: StadiumIcon, color: 'red' },
  { value: 'practice', label: 'Practice', Icon: FootballIcon, color: 'green' },
  { value: 'drill', label: 'Drill Tape', Icon: LightningIcon, color: 'blue' },
  { value: 'highlight', label: 'Highlight', Icon: TrophyIcon, color: 'gold' },
];

const ANALYSIS_TYPES = [
  { value: 'full_breakdown', label: 'Full Breakdown', desc: 'Formation recognition, play-by-play, tactical trends' },
  { value: 'player_tracking', label: 'Player Tracking', desc: 'Movement analysis, effort metrics, technique' },
  { value: 'highlights', label: 'Highlight Detection', desc: 'Find top plays for social media reels' },
  { value: 'quick_summary', label: 'Quick Summary', desc: 'Score, top performers, areas to improve' },
];

// Grade color mapping
const gradeColors = {
  'A+': '#22c55e', A: '#22c55e', 'A-': '#4ade80',
  'B+': '#84cc16', B: '#a3e635', 'B-': '#bef264',
  'C+': '#facc15', C: '#fbbf24', 'C-': '#f59e0b',
  'D+': '#f97316', D: '#fb923c', 'D-': '#ef4444',
  F: '#dc2626',
};

// Detect section type for icon/color
function sectionMeta(title) {
  const t = title.toLowerCase();
  if (t.includes('penalty') || t.includes('infraction') || t.includes('dead ball')) return { icon: '🚩', accent: '#ef4444' };
  if (t.includes('coaching') || t.includes('recommendation') || t.includes('correction') || t.includes('improvement')) return { icon: '📋', accent: '#f59e0b' };
  if (t.includes('grade') || t.includes('score') || t.includes('rating')) return { icon: '📊', accent: '#8b5cf6' };
  if (t.includes('formation') || t.includes('pre-snap') || t.includes('alignment')) return { icon: '🏈', accent: '#3b82f6' };
  if (t.includes('highlight') || t.includes('standout') || t.includes('player of')) return { icon: '⭐', accent: '#fbbf24' };
  if (t.includes('play-by-play') || t.includes('play ') || t.includes('execution')) return { icon: '▶️', accent: '#06b6d4' };
  if (t.includes('offensive') || t.includes('offense')) return { icon: '🏃', accent: '#009A44' };
  if (t.includes('defensive') || t.includes('defense')) return { icon: '🛡️', accent: '#6366f1' };
  if (t.includes('summary') || t.includes('overview') || t.includes('result') || t.includes('takeaway')) return { icon: '📝', accent: '#009A44' };
  return { icon: '📄', accent: 'var(--text-secondary)' };
}

// Render inline markdown (bold, grades, etc.)
function renderInline(text) {
  if (!text) return null;
  const parts = [];
  let remaining = text;
  let key = 0;

  // Process **bold** markers
  while (remaining.length > 0) {
    const boldStart = remaining.indexOf('**');
    if (boldStart === -1) {
      parts.push(<span key={key++}>{renderGrades(remaining)}</span>);
      break;
    }
    if (boldStart > 0) {
      parts.push(<span key={key++}>{renderGrades(remaining.slice(0, boldStart))}</span>);
    }
    const boldEnd = remaining.indexOf('**', boldStart + 2);
    if (boldEnd === -1) {
      parts.push(<span key={key++}>{renderGrades(remaining.slice(boldStart))}</span>);
      break;
    }
    const boldText = remaining.slice(boldStart + 2, boldEnd);
    parts.push(<strong key={key++} style={{ color: '#fff', fontWeight: 700 }}>{renderGrades(boldText)}</strong>);
    remaining = remaining.slice(boldEnd + 2);
  }
  return parts;
}

// Detect and render grade badges inline
function renderGrades(text) {
  const gradePattern = /\b([A-F][+-]?)\b/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  const testStr = text;
  while ((match = gradePattern.exec(testStr)) !== null) {
    const grade = match[1];
    // Only render as a badge if it matches a grade letter followed by context clues
    const before = testStr.slice(Math.max(0, match.index - 20), match.index).toLowerCase();
    const isGradeContext = before.includes('grade') || before.includes('rating') || before.includes(':') || before.includes('—') || /[:\-–]$/.test(before.trim());
    if (gradeColors[grade] && isGradeContext) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{testStr.slice(lastIndex, match.index)}</span>);
      }
      parts.push(
        <span key={key++} style={{
          display: 'inline-block', padding: '1px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.7rem',
          background: `${gradeColors[grade]}22`, color: gradeColors[grade], border: `1px solid ${gradeColors[grade]}44`,
          marginLeft: 2, marginRight: 2,
        }}>{grade}</span>
      );
      lastIndex = match.index + match[0].length;
    }
  }
  if (lastIndex < testStr.length) {
    parts.push(<span key={key++}>{testStr.slice(lastIndex)}</span>);
  }
  return parts.length > 0 ? parts : text;
}

function StructuredAnalysis({ text }) {
  if (!text) return null;

  // Parse into sections by ## or ** headers
  const lines = text.replace(/\r/g, '').split('\n');
  const sections = [];
  let currentSection = { title: '', lines: [] };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    const boldHeaderMatch = !headerMatch && line.match(/^\*\*(.+?)\*\*\s*$/);

    if (headerMatch || boldHeaderMatch) {
      if (currentSection.title || currentSection.lines.length > 0) {
        sections.push({ ...currentSection });
      }
      currentSection = { title: (headerMatch?.[1] || boldHeaderMatch?.[1]).replace(/\*\*/g, ''), lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }
  if (currentSection.title || currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // If no sections were parsed (unstructured text), fall back to simple display
  if (sections.length <= 1 && !sections[0]?.title) {
    return (
      <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 600, overflow: 'auto', border: '1px solid var(--border)' }}>
        {text}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
      {sections.map((section, i) => {
        const meta = sectionMeta(section.title);
        
        // Clean up leading/trailing empty lines from section.lines to preserve internal indentation
        const activeLines = [...section.lines];
        while (activeLines.length > 0 && !activeLines[0].trim()) {
          activeLines.shift();
        }
        while (activeLines.length > 0 && !activeLines[activeLines.length - 1].trim()) {
          activeLines.pop();
        }

        if (!section.title && activeLines.length === 0) return null;

        return (
          <div key={i} style={{
            background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', overflow: 'hidden',
            flexShrink: 0,
          }}>
            {section.title && (
              <div style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: activeLines.length > 0 ? '1px solid var(--border)' : 'none',
                background: `linear-gradient(135deg, ${meta.accent}08, transparent)`,
              }}>
                <span style={{ fontSize: 16 }}>{meta.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#fff', flex: 1 }}>
                  {section.title}
                </span>
              </div>
            )}
            {activeLines.length > 0 && (
              <div style={{ padding: '12px 16px', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
                {activeLines.map((line, j) => {
                  const lineIndent = line.match(/^(\s*)/)?.[0].length || 0;
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={j} style={{ height: 6 }} />;

                  // Horizontal rules
                  if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                    return (
                      <hr key={j} style={{
                        border: 'none',
                        height: 1,
                        background: 'rgba(255, 255, 255, 0.1)',
                        marginTop: 14,
                        marginBottom: 14,
                      }} />
                    );
                  }

                  // Sub-headings (#### or ##### or ######)
                  const subHeadingMatch = trimmed.match(/^#{4,6}\s+(.*)/);
                  if (subHeadingMatch) {
                    const cleanTitle = subHeadingMatch[1].replace(/^\*\*|\*\*$/g, '');
                    return (
                      <div key={j} style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--rocks-gold)',
                        marginTop: 14,
                        marginBottom: 8,
                        borderBottom: '1px solid rgba(253, 185, 19, 0.15)',
                        paddingBottom: 4,
                        marginLeft: lineIndent * 6,
                      }}>
                        {renderInline(cleanTitle)}
                      </div>
                    );
                  }

                  // Bullet points
                  const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
                  if (bulletMatch) {
                    return (
                      <div key={j} style={{
                        display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4,
                        marginLeft: lineIndent * 6
                      }}>
                        <span style={{ color: meta.accent, fontWeight: 700, flexShrink: 0 }}>•</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{renderInline(bulletMatch[1])}</span>
                      </div>
                    );
                  }

                  // Numbered items
                  const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
                  if (numMatch) {
                    return (
                      <div key={j} style={{
                        display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4,
                        marginLeft: lineIndent * 6
                      }}>
                        <span style={{
                          color: meta.accent, fontWeight: 800, fontSize: '0.65rem', flexShrink: 0,
                          width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `${meta.accent}18`, border: `1px solid ${meta.accent}33`,
                        }}>{numMatch[1]}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{renderInline(numMatch[2])}</span>
                      </div>
                    );
                  }

                  // Sub-headers (lines ending with colon or starting with bold)
                  if (trimmed.endsWith(':') && trimmed.length < 80) {
                    return (
                      <div key={j} style={{
                        fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, marginBottom: 4,
                        fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.02em',
                        marginLeft: lineIndent * 6
                      }}>
                        {renderInline(trimmed)}
                      </div>
                    );
                  }

                  return (
                    <div key={j} style={{ color: 'var(--text-secondary)', marginBottom: 2, marginLeft: lineIndent * 6 }}>
                      {renderInline(trimmed)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FilmRoomPage() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisType, setAnalysisType] = useState('full_breakdown');
  const [speedMode, setSpeedMode] = useState('pro');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [showClipTrimmer, setShowClipTrimmer] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [clipTitle, setClipTitle] = useState('');
  const [savingClip, setSavingClip] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const progressTimerRef = useRef(null);
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', film_type: 'game', opponent: '',
    film_date: new Date().toISOString().split('T')[0],
  });
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [shouldCompress, setShouldCompress] = useState(true);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [tusUpload, setTusUpload] = useState(null);
  const [sidelineLog, setSidelineLog] = useState(null);
  const [importedLogName, setImportedLogName] = useState('');
  const [activeRightTab, setActiveRightTab] = useState('analysis');
  const sidelineInputRef = useRef(null);
  const fullscreenContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [dragStartToolbar, setDragStartToolbar] = useState({ x: 0, y: 0 });
  const [isToolbarLocked, setIsToolbarLocked] = useState(true);

  useEffect(() => {
    if (!isDraggingToolbar) return;

    const handleMouseMove = (e) => {
      setToolbarPos({
        x: e.clientX - dragStartToolbar.x,
        y: e.clientY - dragStartToolbar.y
      });
    };

    const handleMouseUp = () => {
      setIsDraggingToolbar(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingToolbar, dragStartToolbar]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      if (v.paused) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = fullscreenContainerRef.current;
    if (!container) return;

    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    ) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      const container = fullscreenContainerRef.current;
      setIsFullscreen(
        document.fullscreenElement === container ||
        document.webkitFullscreenElement === container ||
        document.mozFullScreenElement === container ||
        document.msFullscreenElement === container
      );
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [containerNode, setContainerNode] = useState(null);
  const videoContainerRef = useCallback((node) => {
    setContainerNode(node);
  }, []);

  const handleWheel = useCallback((e) => {
    const zoomFactor = 0.15;
    setZoom(prevZoom => {
      const newZoom = e.deltaY < 0 ? prevZoom + zoomFactor : prevZoom - zoomFactor;
      return Math.max(1, Math.min(4, newZoom));
    });
  }, []);

  useEffect(() => {
    if (!containerNode) return;

    const handleNativeWheel = (e) => {
      e.preventDefault();
      handleWheel(e);
    };

    containerNode.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      containerNode.removeEventListener('wheel', handleNativeWheel);
    };
  }, [containerNode, handleWheel]);

  const handleMouseDown = (e) => {
    if (zoom > 1 && !isDrawingMode) {
      // Ignore click if it falls in the bottom 50px (area where native video controls are rendered)
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      if (clickY > rect.height - 50) {
        return;
      }
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && zoom > 1 && !isDrawingMode) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawTool, setDrawTool] = useState('free');
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDrawing = (e) => {
    if (!isDrawingMode) return;
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getMousePos(e);
    isDrawingRef.current = true;
    lastPosRef.current = pos;
    if (drawTool === 'circle') {
      canvasRef.current.savedState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getMousePos(e);
    ctx.strokeStyle = drawColor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    if (drawTool === 'free') {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
    } else if (drawTool === 'circle') {
      if (canvasRef.current.savedState) {
        ctx.putImageData(canvasRef.current.savedState, 0, 0);
      }
      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      ctx.beginPath();
      ctx.arc(lastPosRef.current.x, lastPosRef.current.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const initCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth || video.clientWidth || 800;
      canvas.height = video.videoHeight || video.clientHeight || 450;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const loadFilms = useCallback(async () => {
    const supabase = createClient();
    let query = supabase.from('game_films').select('*').order('film_date', { ascending: false });
    if (filterType !== 'all') query = query.eq('film_type', filterType);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data } = await query;
    setFilms(data || []);
    setLoading(false);
  }, [filterType, search]);

  useEffect(() => { loadFilms(); }, [loadFilms]);

  function handleFileSelect(file) {
    if (!file) return;
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
      toast.error('Please upload a video file (MP4, MOV, AVI, WebM)');
      return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2GB');
      return;
    }
    setSelectedFile(file);
    if (!uploadForm.title) {
      setUploadForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') }));
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  async function fetchWeather(dateStr) {
    try {
      const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=26.4615&longitude=-80.0728&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,wind_speed_10m_max,weather_code&timezone=auto`);
      const data = await res.json();
      if (data && data.daily) {
        const temp = data.daily.temperature_2m_max?.[0];
        const wind = data.daily.wind_speed_10m_max?.[0];
        const code = data.daily.weather_code?.[0];
        return { temp, wind, code };
      }
    } catch (e) {
      console.warn('Failed to fetch weather data:', e);
    }
    return null;
  }

  function toggleTusUpload() {
    if (!tusUpload) return;
    if (uploadPaused) {
      tusUpload.start();
      setUploadPaused(false);
      toast.success('Upload resumed');
    } else {
      tusUpload.abort();
      setUploadPaused(true);
      toast.success('Upload paused');
    }
  }

  function handleSidelineLogImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportedLogName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setSidelineLog(json);
        toast.success(`Sideline Log loaded: ${json.plays?.length || 0} plays detected`);
      } catch (err) {
        toast.error('Failed to parse Sideline Log JSON');
        setImportedLogName('');
      }
    };
    reader.readAsText(file);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile && !uploadForm.video_url) {
      toast.error('Please select a video file or provide a URL');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setEstimatedTime(0);
    const supabase = createClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        toast.error('You must be logged in to upload. Please refresh and log in again.');
        setUploading(false);
        return;
      }
      const token = session.access_token;

      let fileToUpload = selectedFile;

      // 1. Client-side Video Compression
      if (selectedFile && shouldCompress) {
        setCompressing(true);
        setCompressionProgress(0);
        try {
          const compressed = await compressVideo(selectedFile, {
            onProgress: (pct) => setCompressionProgress(pct),
          });
          fileToUpload = compressed.blob;
          // Modify filename
          const ext = compressed.name.split('.').pop();
          fileToUpload.name = `${selectedFile.name.replace(/\.[^.]+$/, '')}-compressed.${ext}`;
        } catch (compressErr) {
          console.warn('Compression failed or bypassed, uploading original:', compressErr.message);
        } finally {
          setCompressing(false);
        }
      }

      let videoUrl = '';

      if (fileToUpload) {
        const ext = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        toast.loading(`Uploading ${(fileToUpload.size / (1024 * 1024)).toFixed(0)}MB...`, { id: 'upload-progress' });

        // TUS Upload wrapped in a Promise
        videoUrl = await new Promise((resolve, reject) => {
          let lastBytes = 0;
          let lastTime = Date.now();

          const upload = new tus.Upload(fileToUpload, {
            endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              authorization: `Bearer ${token}`,
              'x-upsert': 'true',
            },
            metadata: {
              bucketName: 'game-films',
              objectName: fileName,
              contentType: fileToUpload.type,
            },
            chunkSize: 6 * 1024 * 1024,
            onError: (err) => {
              console.error('TUS upload error:', err);
              reject(err);
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const pct = Math.round((bytesUploaded / bytesTotal) * 100);
              setUploadProgress(pct);

              const currentTime = Date.now();
              const timeDiff = (currentTime - lastTime) / 1000;
              if (timeDiff > 0.5) {
                const bytesDiff = bytesUploaded - lastBytes;
                const speed = bytesDiff / timeDiff;
                const remainingBytes = bytesTotal - bytesUploaded;
                const remainingTime = speed > 0 ? remainingBytes / speed : 0;

                setUploadSpeed(speed);
                setEstimatedTime(remainingTime);

                lastBytes = bytesUploaded;
                lastTime = currentTime;
              }
            },
            onSuccess: () => {
              const { data: urlData } = supabase.storage.from('game-films').getPublicUrl(fileName);
              resolve(urlData.publicUrl);
            },
          });

          setTusUpload(upload);
          setUploadPaused(false);
          upload.start();
        });
      }

      // 2. Fetch Historical Weather Data
      toast.loading('Fetching weather metrics...', { id: 'upload-progress' });
      const weatherData = await fetchWeather(uploadForm.film_date);

      // 3. Save Film Record (with sideline spotter & weather payload + resilience fallback)
      toast.loading('Saving film record...', { id: 'upload-progress' });

      const filmPayload = {
        ...uploadForm,
        video_url: videoUrl || uploadForm.video_url,
        duration_seconds: fileToUpload ? Math.round(fileToUpload.size / 50000) : null,
        sideline_log: sidelineLog || null,
        weather: weatherData || null,
      };

      let { error: insertError } = await supabase.from('game_films').insert(filmPayload);

      // Self-healing database columns check
      if (insertError && insertError.message.includes('column') && (insertError.message.includes('sideline_log') || insertError.message.includes('weather'))) {
        console.warn('Database missing sideline_log or weather columns, encoding payload inside description...');
        
        let encodedDesc = uploadForm.description || '';
        if (sidelineLog) {
          encodedDesc += `\n\n__SIDELINE_LOG__:${JSON.stringify(sidelineLog)}`;
        }
        if (weatherData) {
          encodedDesc += `\n\n__WEATHER__:${JSON.stringify(weatherData)}`;
        }

        const fallbackPayload = {
          ...uploadForm,
          description: encodedDesc,
          video_url: videoUrl || uploadForm.video_url,
          duration_seconds: fileToUpload ? Math.round(fileToUpload.size / 50000) : null,
        };
        const { error: fallbackError } = await supabase.from('game_films').insert(fallbackPayload);
        insertError = fallbackError;
      }

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }

      setUploadProgress(100);
      toast.success('Film uploaded successfully! 🏈', { id: 'upload-progress' });
      trackFilmUpload(uploadForm.title);
      
      setTimeout(() => {
        setShowUpload(false);
        setSelectedFile(null);
        setSidelineLog(null);
        setImportedLogName('');
        setUploadProgress(0);
        setTusUpload(null);
        setUploadForm({ title: '', description: '', film_type: 'game', opponent: '', film_date: new Date().toISOString().split('T')[0] });
        loadFilms();
      }, 500);

    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Upload failed', { id: 'upload-progress' });
    } finally {
      setUploading(false);
    }
  }

  const FILM_API = 'https://delray-film-service-489554556909.us-east1.run.app';

  // Simulated progress bar — accelerates through stages
  function startProgressSimulation() {
    setAnalysisProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Logarithmic curve: fast start, slows down, never reaches 95% until done
      // ~30% at 15s, ~50% at 30s, ~70% at 60s, ~85% at 120s, ~92% at 180s
      const pct = Math.min(92, 100 * (1 - Math.exp(-elapsed / 60)));
      setAnalysisProgress(Math.round(pct));
    }, 500);
  }

  function stopProgressSimulation(completed = true) {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    if (completed) {
      setAnalysisProgress(100);
      setTimeout(() => setAnalysisProgress(0), 3000);
    } else {
      setAnalysisProgress(0);
    }
  }

  // Poll for background analysis results every 10 seconds
  useEffect(() => {
    const processingFilms = films.filter(f => f.ai_status === 'processing');
    if (processingFilms.length === 0) return;

    // Start progress if we're viewing a processing film
    if (selectedFilm && processingFilms.some(f => f.id === selectedFilm.id) && !progressTimerRef.current) {
      startProgressSimulation();
    }

    const interval = setInterval(async () => {
      let updated = false;
      for (const film of processingFilms) {
        try {
          const res = await fetch(`${FILM_API}/status/${film.id}`);
          const data = await res.json();
          if (data.ai_status === 'complete' || data.ai_status === 'failed') {
            updated = true;
            setFilms(prev => prev.map(f => f.id === film.id
              ? { ...f, ...data }
              : f));
            setSelectedFilm(prev => prev?.id === film.id ? { ...prev, ...data } : prev);
            if (data.ai_status === 'complete') {
              stopProgressSimulation(true);
              toast.success(`Analysis complete: ${film.title} 🏈`);
              if (selectedFilm?.id === film.id) setAnalysis(data.ai_analysis);
            } else {
              stopProgressSimulation(false);
              toast.error(`Analysis failed for ${film.title}`);
            }
          }
        } catch {}
      }
      if (updated) loadFilms();
    }, 10000);

    return () => clearInterval(interval);
  }, [films, selectedFilm, loadFilms]);

  async function runAnalysis(film, forceRerun = false) {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const supabase = createClient();

      // Check for cached analysis first (unless force re-run)
      if (!forceRerun && film.ai_analysis && film.ai_analysis_type === analysisType && film.ai_status !== 'failed') {
        setAnalysis(film.ai_analysis);
        toast.success('Loaded saved analysis', { id: 'analysis-progress' });
        setAnalyzing(false);
        return;
      }

      // Fetch roster for player identification
      const { data: rosterData } = await supabase
        .from('players')
        .select('first_name, last_name, jersey_number, position')
        .order('jersey_number');
      const roster = (rosterData || []).map(p => ({
        jersey: p.jersey_number,
        name: `${p.first_name} ${p.last_name}`,
        position: p.position,
      }));

      // Fire-and-forget: send to Cloud Run, returns immediately
      const res = await fetch(`${FILM_API}/analyze-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filmId: film.id,
          videoUrl: film.video_url,
          clipStart: film.clip_start_seconds,
          clipEnd: film.clip_end_seconds,
          filmType: film.film_type,
          opponent: film.opponent,
          analysisType,
          roster,
          speedMode,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update local state to show processing status
      setFilms(prev => prev.map(f => f.id === film.id
        ? { ...f, ai_status: 'processing' }
        : f));
      setSelectedFilm(prev => prev ? { ...prev, ai_status: 'processing' } : prev);
      startProgressSimulation();

      toast.success('Analysis started! You can navigate away — results will appear when ready. 🏈', { id: 'analysis-progress' });
      trackFilmAnalysis(film.title);

    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(err.message || 'Failed to start analysis', { id: 'analysis-progress' });
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteFilm(id) {
    const supabase = createClient();
    await supabase.from('game_films').delete().eq('id', id);
    toast.success('Film removed');
    loadFilms();
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function openClipTrimmer() {
    const video = videoRef.current;
    if (video) {
      setClipStart(Math.floor(video.currentTime));
      setClipEnd(Math.min(Math.floor(video.currentTime) + 30, Math.floor(video.duration)));
    } else {
      setClipStart(0);
      setClipEnd(30);
    }
    setClipTitle('');
    setShowClipTrimmer(true);
  }

  function setStartToCurrent() {
    const video = videoRef.current;
    if (video) setClipStart(Math.floor(video.currentTime));
  }

  function setEndToCurrent() {
    const video = videoRef.current;
    if (video) setClipEnd(Math.floor(video.currentTime));
  }

  function previewClip() {
    const video = videoRef.current;
    if (video) {
      video.currentTime = clipStart;
      video.play();
      const checkEnd = setInterval(() => {
        if (video.currentTime >= clipEnd) {
          video.pause();
          clearInterval(checkEnd);
        }
      }, 100);
    }
  }

  async function saveClip() {
    if (!clipTitle.trim()) { toast.error('Give your clip a title'); return; }
    if (clipEnd <= clipStart) { toast.error('End time must be after start time'); return; }
    setSavingClip(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('game_films').insert({
        title: clipTitle,
        description: `Clip from ${formatTime(clipStart)} to ${formatTime(clipEnd)} of ${selectedFilm.title}`,
        film_type: 'drill',
        opponent: selectedFilm.opponent,
        film_date: selectedFilm.film_date,
        video_url: selectedFilm.video_url,
        parent_film_id: selectedFilm.id,
        clip_start_seconds: clipStart,
        clip_end_seconds: clipEnd,
      });
      if (error) throw error;
      toast.success(`Clip saved: ${formatTime(clipStart)} → ${formatTime(clipEnd)}`);
      setShowClipTrimmer(false);
      loadFilms();
    } catch (err) {
      toast.error(err.message || 'Failed to save clip');
    } finally {
      setSavingClip(false);
    }
  }

  const typeConfig = (type) => FILM_TYPES.find(t => t.value === type) || FILM_TYPES[0];
  const formatSize = (bytes) => bytes > 1024*1024 ? `${(bytes/1024/1024).toFixed(1)} MB` : `${(bytes/1024).toFixed(0)} KB`;

  function parsePlaysFromFilm(film) {
    if (!film) return [];
    
    // 1. Check sideline log first
    let sidelineLogData = film.sideline_log;
    if (!sidelineLogData && film.description && film.description.includes('__SIDELINE_LOG__:')) {
      try {
        const match = film.description.match(/__SIDELINE_LOG__:(.*)$/m);
        if (match) {
          const parsed = JSON.parse(match[1]);
          sidelineLogData = parsed.plays || parsed;
        }
      } catch (e) {
        console.error('Failed to parse sideline log fallback', e);
      }
    }
    if (Array.isArray(sidelineLogData) && sidelineLogData.length > 0) {
      return sidelineLogData.map(p => ({
        index: p.index,
        title: p.notes || `Play ${p.index} (${p.play_type})`,
        start: p.start_seconds,
        end: p.end_seconds,
        source: 'sideline'
      }));
    }

    // 2. Parse from AI analysis text
    const plays = [];
    if (film.ai_analysis) {
      const lines = film.ai_analysis.split('\n');
      let idx = 1;
      for (const line of lines) {
        const match = line.match(/(?:\[|\()?(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?(?:\]|\))?/);
        if (match) {
          const startMin = parseInt(match[1], 10);
          const startSec = parseInt(match[2], 10);
          const startTotal = startMin * 60 + startSec;
          
          let endTotal = startTotal + 15;
          if (match[3] && match[4]) {
            const endMin = parseInt(match[3], 10);
            const endSec = parseInt(match[4], 10);
            endTotal = endMin * 60 + endSec;
          }

          let playTitle = line.replace(match[0], '').replace(/^[-*•\s\d.]+\s*/, '').trim();
          if (playTitle.length > 80) playTitle = playTitle.substring(0, 77) + '...';
          
          plays.push({
            index: idx++,
            title: playTitle || `Play at ${match[1]}:${match[2]}`,
            start: startTotal,
            end: endTotal,
            source: 'ai'
          });
        }
      }
    }
    return plays;
  }

  return (
    <div>
      <PageHeader title="Film Room" subtitle="AI-powered game film library and play analysis"
        actions={<Button variant="primary" icon={<Upload size={16} />} onClick={() => setShowUpload(true)}>Upload Film</Button>}
      />

      {/* Toolbar */}
      <Card style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search films..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <select className="form-input" style={{ width: 'auto', minWidth: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {FILM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <button onClick={() => setView('grid')} style={{ padding: '0.5rem', background: view === 'grid' ? 'var(--bg-glass)' : 'transparent', border: 'none', cursor: 'pointer', color: view === 'grid' ? 'var(--rocks-green-light)' : 'var(--text-dim)' }}><Grid size={16} /></button>
            <button onClick={() => setView('list')} style={{ padding: '0.5rem', background: view === 'list' ? 'var(--bg-glass)' : 'transparent', border: 'none', cursor: 'pointer', color: view === 'list' ? 'var(--rocks-green-light)' : 'var(--text-dim)' }}><List size={16} /></button>
          </div>
        </div>
      </Card>

      {/* Film Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading film library...</div>
      ) : films.length === 0 ? (
        <EmptyState icon={<Film size={48} />} title="No films yet"
          description="Upload your first game or practice film to get started with AI analysis."
          action={<Button variant="primary" icon={<Upload size={16} />} onClick={() => setShowUpload(true)}>Upload Film</Button>}
        />
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {films.map((film, i) => {
            const cfg = typeConfig(film.film_type);
            return (
              <motion.div key={film.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => { setSelectedFilm(film); setAnalysis(film.ai_analysis || null); if (film.ai_analysis_type) setAnalysisType(film.ai_analysis_type); trackFilmView(film.title); }}>
                  <div style={{ height: 180, background: 'linear-gradient(135deg, rgba(16,107,58,0.1), rgba(0,154,68,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', position: 'relative' }}>
                    {film.thumbnail_url ? (
                      <img src={film.thumbnail_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                    ) : <cfg.Icon size={48} color={`var(--${cfg.color})`} />}
                    {film.video_url && (
                      <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', background: film.ai_status === 'processing' ? 'rgba(202,138,4,0.9)' : film.ai_analysis ? 'rgba(16,107,58,0.9)' : 'rgba(100,100,100,0.8)', borderRadius: 'var(--radius-full)', fontSize: '0.6rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {film.ai_status === 'processing' ? <><Loader2 size={10} className="spin" /> Analyzing...</> : film.ai_analysis ? <><CheckCircle size={10} /> Analyzed</> : <><Brain size={10} /> AI Ready</>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 4 }}>{film.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                        <Badge variant={cfg.color}>{cfg.label}</Badge>
                        {film.film_date && <span><Clock size={10} /> {new Date(film.film_date).toLocaleDateString()}</span>}
                      </div>
                      {film.opponent && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 4 }}>vs {film.opponent}</div>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteFilm(film.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {films.map((film) => {
              const cfg = typeConfig(film.film_type);
              return (
                <div key={film.id} onClick={() => { setSelectedFilm(film); setAnalysis(film.ai_analysis || null); if (film.ai_analysis_type) setAnalysisType(film.ai_analysis_type); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'rgba(16,107,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><cfg.Icon size={20} color={`var(--${cfg.color})`} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{film.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{film.opponent && `vs ${film.opponent} · `}{film.film_date && new Date(film.film_date).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={cfg.color}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Upload Modal with Drag & Drop */}
      <AnimatePresence>
        {showUpload && (
          <Modal isOpen={showUpload} onClose={() => { setShowUpload(false); setSelectedFile(null); }} title="Upload Game Film">
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--rocks-green-light)' : selectedFile ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-xl)',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 200ms',
                  background: dragOver ? 'rgba(16,107,58,0.08)' : selectedFile ? 'rgba(16,107,58,0.04)' : 'transparent',
                }}
              >
                <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                  onChange={e => handleFileSelect(e.target.files[0])} />
                {selectedFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={32} color="var(--green)" />
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{formatSize(selectedFile.size)}</div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <FileVideo size={40} color="var(--text-dim)" />
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Drop video file here or click to browse</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>MP4, MOV, AVI, WebM — up to 2GB</div>
                  </div>
                )}
              </div>

              {/* Compression & Upload Progress UI */}
              {compressing && (
                <div style={{ padding: 'var(--space-sm)', background: 'rgba(253, 185, 19, 0.05)', border: '1px solid rgba(253, 185, 19, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--rocks-gold)' }}>Compressing video (native browser WebCodecs)...</span>
                    <span>{compressionProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${compressionProgress}%` }} style={{ height: '100%', background: 'var(--rocks-gold)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              )}

              {uploading && !compressing && (
                <div style={{ padding: 'var(--space-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{uploadPaused ? 'Upload paused' : 'Uploading via resumable TUS...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 8 }}>
                    <motion.div animate={{ width: `${uploadProgress}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #106B3A, #009A44)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                  
                  {!uploadPaused && uploadSpeed > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
                      <span>Speed: {(uploadSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
                      <span>Est. Time: {estimatedTime > 60 ? `${Math.floor(estimatedTime / 60)}m ${Math.round(estimatedTime % 60)}s` : `${Math.round(estimatedTime)}s`}</span>
                    </div>
                  )}

                  {tusUpload && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Button variant="secondary" size="sm" type="button" onClick={toggleTusUpload}>
                        {uploadPaused ? 'Resume Upload' : 'Pause Upload'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedFile && !uploading && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '0.25rem 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={shouldCompress} onChange={e => setShouldCompress(e.target.checked)} style={{ width: 14, height: 14 }} />
                    Compress video before uploading (recommended for microSD cards)
                  </label>
                </div>
              )}

              {/* Sideline Spotter Log Import */}
              {!uploading && (
                <div style={{ padding: 'var(--space-sm)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>Sideline Spotter Play Log</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Import game timestamps to auto-split clips</div>
                    </div>
                    <div>
                      <input type="file" ref={sidelineInputRef} accept=".json" style={{ display: 'none' }} onChange={handleSidelineLogImport} />
                      <Button variant="secondary" size="sm" type="button" icon={<FileText size={12} />} onClick={() => sidelineInputRef.current?.click()}>
                        {importedLogName ? 'Change Log' : 'Select Log'}
                      </Button>
                    </div>
                  </div>
                  {importedLogName && (
                    <div style={{ fontSize: '10px', color: 'var(--rocks-gold)', fontWeight: 600, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Loaded: {importedLogName} ({sidelineLog?.plays?.length || 0} plays)</span>
                      <button type="button" onClick={() => { setSidelineLog(null); setImportedLogName(''); }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 10 }}>Remove</button>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" required value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="Week 3 vs Eagles" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Film Type</label>
                  <select className="form-input" value={uploadForm.film_type} onChange={e => setUploadForm(f => ({ ...f, film_type: e.target.value }))}>
                    {FILM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Opponent</label>
                  <input className="form-input" value={uploadForm.opponent} onChange={e => setUploadForm(f => ({ ...f, opponent: e.target.value }))} placeholder="Eagles" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={uploadForm.film_date} onChange={e => setUploadForm(f => ({ ...f, film_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Coach notes..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => { setShowUpload(false); setSelectedFile(null); }}>Cancel</Button>
                <Button variant="primary" type="submit" icon={uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Film'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Film Viewer + AI Analysis Modal */}
      <AnimatePresence>
        {selectedFilm && (
          <Modal isOpen={!!selectedFilm} onClose={() => { setSelectedFilm(null); setAnalysis(null); setZoom(1); setPanX(0); setPanY(0); setPlaybackSpeed(1.0); setIsDrawingMode(false); }} title={selectedFilm.title} size="xl">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: 'var(--space-xl)' }}>
              {/* Left Column: Video Player, Trimmer, Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {selectedFilm.video_url ? (
                  <div 
                    ref={fullscreenContainerRef}
                    style={isFullscreen ? {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#000',
                      width: '100%',
                      height: '100%',
                      padding: '20px',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      position: 'relative'
                    } : {
                      position: 'relative'
                    }}
                  >
                    <style dangerouslySetInnerHTML={{ __html: `
                      video::-webkit-media-controls-fullscreen-button {
                        display: none !important;
                      }
                      video::-webkit-media-controls-toggle-closed-captions-button {
                        display: none !important;
                      }
                    ` }} />
                    <div 
                      ref={videoContainerRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      style={{ 
                        position: 'relative', 
                        borderRadius: isFullscreen ? 0 : 'var(--radius-md)', 
                        overflow: 'hidden', 
                        background: '#000', 
                        width: '100%', 
                        height: isFullscreen ? 'calc(100% - 100px)' : 'auto',
                        maxHeight: isFullscreen ? 'none' : 400,
                        cursor: zoom > 1 && !isDrawingMode ? (isPanning ? 'grabbing' : 'grab') : 'default',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <video ref={videoRef}
                        src={selectedFilm.clip_start_seconds != null
                          ? `${selectedFilm.video_url}#t=${selectedFilm.clip_start_seconds},${selectedFilm.clip_end_seconds}`
                          : selectedFilm.video_url}
                        controls 
                        controlsList="nofullscreen"
                        onLoadedMetadata={initCanvas}
                        onDragStart={(e) => e.preventDefault()}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          toggleFullscreen();
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        style={{ 
                          width: '100%', 
                          height: isFullscreen ? '100%' : 'auto',
                          maxHeight: isFullscreen ? 'none' : 400, 
                          objectFit: 'contain',
                          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`, 
                          transformOrigin: 'center center',
                          transition: 'transform 0.1s ease'
                        }}
                        onTimeUpdate={() => {
                          const v = videoRef.current;
                          if (v && selectedFilm.clip_end_seconds != null && v.currentTime >= selectedFilm.clip_end_seconds) {
                            v.pause();
                            v.currentTime = selectedFilm.clip_start_seconds;
                          }
                        }}
                      />
                      <canvas
                        ref={canvasRef}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: 'calc(100% - 50px)',
                          pointerEvents: isDrawingMode ? 'auto' : 'none',
                          cursor: isDrawingMode ? 'crosshair' : 'default',
                          zIndex: 10,
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={endDrawing}
                        onMouseLeave={endDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={endDrawing}
                      />
                    </div>

                    {/* Telestrator, Speed & Zoom Tool Bar */}
                    <div style={
                      !isToolbarLocked
                        ? {
                            position: 'absolute',
                            bottom: 16,
                            left: '50%',
                            transform: `translate(calc(-50% + ${toolbarPos.x}px), ${toolbarPos.y}px)`,
                            zIndex: 100,
                            background: 'rgba(15, 23, 42, 0.95)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            width: '90%',
                            maxWidth: 800,
                            borderRadius: 'var(--radius-md)',
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                          }
                        : isFullscreen
                        ? {
                            position: 'absolute',
                            bottom: 16,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 100,
                            background: 'rgba(15, 23, 42, 0.95)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            width: '90%',
                            maxWidth: 800,
                            borderRadius: 'var(--radius-md)',
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                          }
                        : {
                            marginTop: 12,
                            padding: 12,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                          }
                    }>
                      {/* Row 1: Telestrator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {!isToolbarLocked && (
                          <div
                            onMouseDown={(e) => {
                              setIsDraggingToolbar(true);
                              setDragStartToolbar({
                                x: e.clientX - toolbarPos.x,
                                y: e.clientY - toolbarPos.y
                              });
                            }}
                            style={{
                              cursor: isDraggingToolbar ? 'grabbing' : 'grab',
                              padding: '4px 2px',
                              color: 'var(--text-dim)',
                              display: 'flex',
                              alignItems: 'center',
                              userSelect: 'none'
                            }}
                            title="Drag to move panel"
                          >
                            <GripVertical size={16} />
                          </div>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>PLAYBACK:</span>
                        <button
                          onClick={togglePlay}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: isPlaying ? 'rgba(16, 107, 58, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            color: isPlaying ? 'var(--rocks-green-light)' : '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                          {isPlaying ? 'Pause' : 'Play'}
                        </button>

                        <button
                          onClick={() => {
                            setIsToolbarLocked(!isToolbarLocked);
                            if (!isToolbarLocked) {
                              setToolbarPos({ x: 0, y: 0 });
                            }
                          }}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: !isToolbarLocked ? 'var(--rocks-gold)' : 'rgba(255,255,255,0.2)',
                            background: !isToolbarLocked ? 'rgba(253,185,19,0.15)' : 'none',
                            color: !isToolbarLocked ? 'var(--rocks-gold)' : '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={isToolbarLocked ? 'Unlock Panel to drag' : 'Lock Panel in place'}
                        >
                          {isToolbarLocked ? <Lock size={12} /> : <Unlock size={12} />}
                          {isToolbarLocked ? 'Unlock Panel' : 'Lock Panel'}
                        </button>

                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginLeft: 12 }}>TELESTRATOR:</span>
                        <button
                          onClick={() => {
                            setIsDrawingMode(!isDrawingMode);
                            if (videoRef.current) videoRef.current.pause(); // Pause video when drawing is enabled
                          }}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: isDrawingMode ? 'var(--rocks-gold)' : 'rgba(255,255,255,0.2)',
                            background: isDrawingMode ? 'rgba(253,185,19,0.15)' : 'none',
                            color: isDrawingMode ? 'var(--rocks-gold)' : '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Shield size={12} /> {isDrawingMode ? 'Drawing: ON' : 'Draw/Write'}
                        </button>

                        {isDrawingMode && (
                          <>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => setDrawTool('free')}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: drawTool === 'free' ? 'rgba(255,255,255,0.1)' : 'none',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  fontSize: 11,
                                  cursor: 'pointer'
                                }}
                              >
                                Pen
                              </button>
                              <button
                                onClick={() => setDrawTool('circle')}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: drawTool === 'circle' ? 'rgba(255,255,255,0.1)' : 'none',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  fontSize: 11,
                                  cursor: 'pointer'
                                }}
                              >
                                Circle
                              </button>
                            </div>

                            {/* Color Selectors */}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {['#ef4444', '#eab308', '#22c55e', '#ffffff'].map(color => (
                                <button
                                  key={color}
                                  onClick={() => setDrawColor(color)}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: color,
                                    border: drawColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)',
                                    cursor: 'pointer'
                                  }}
                                  title={color}
                                />
                              ))}
                            </div>

                            <button
                              onClick={clearCanvas}
                              style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginLeft: 'auto'
                              }}
                            >
                              Clear
                            </button>
                          </>
                        )}
                      </div>

                      {/* Row 2: Speed and Zoom */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
                        {/* Speed Selection */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>SPEED:</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[0.25, 0.5, 1.0, 1.5, 2.0].map(speed => (
                              <button
                                key={speed}
                                onClick={() => handleSpeedChange(speed)}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  background: playbackSpeed === speed ? 'var(--rocks-green-light)' : 'rgba(255,255,255,0.05)',
                                  color: '#fff',
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Zoom Selection */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>ZOOM:</span>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button
                              onClick={() => setZoom(z => Math.max(1, z - 0.25))}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 'var(--radius-xs)',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 700
                              }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: 11, fontWeight: 600, width: 36, textAlign: 'center' }}>{zoom.toFixed(2)}x</span>
                            <button
                              onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 'var(--radius-xs)',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 700
                              }}
                            >
                              +
                            </button>

                            {zoom > 1 && (
                              <button
                                onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                  background: 'rgba(255,255,255,0.1)',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  fontSize: 10,
                                  cursor: 'pointer'
                                }}
                              >
                                Reset
                              </button>
                            )}

                            <button
                              onClick={toggleFullscreen}
                              style={{
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-xs)',
                                background: isFullscreen ? 'rgba(253,185,19,0.15)' : 'rgba(255,255,255,0.1)',
                                border: '1px solid',
                                borderColor: isFullscreen ? 'var(--rocks-gold)' : 'rgba(255,255,255,0.2)',
                                color: isFullscreen ? 'var(--rocks-gold)' : '#fff',
                                fontSize: 10,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Panning controls */}
                      {zoom > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>PAN VIDEO:</span>
                          <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Horizontal:</span>
                            <input
                              type="range"
                              min="-200"
                              max="200"
                              value={panX}
                              onChange={(e) => setPanX(Number(e.target.value))}
                              style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>Vertical:</span>
                            <input
                              type="range"
                              min="-200"
                              max="200"
                              value={panY}
                              onChange={(e) => setPanY(Number(e.target.value))}
                              style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Clip indicator for virtual clips */}
                    {selectedFilm.clip_start_seconds != null && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(253,185,19,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(253,185,19,0.3)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Scissors size={12} color="var(--rocks-gold)" />
                        <span>Clip: {formatTime(selectedFilm.clip_start_seconds)} → {formatTime(selectedFilm.clip_end_seconds)}</span>
                        <button onClick={() => { const v = videoRef.current; if (v) { v.currentTime = selectedFilm.clip_start_seconds; v.play(); }}} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--rocks-green-light)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }}>▶ Play Clip</button>
                      </div>
                    )}

                    {/* Clip Trimmer Panel */}
                    <AnimatePresence>
                      {showClipTrimmer && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          style={{ marginTop: 12, padding: '16px', background: 'linear-gradient(135deg, rgba(16,107,58,0.06), rgba(253,185,19,0.04))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,107,58,0.25)', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 12, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                            <Scissors size={16} color="var(--rocks-gold)" /> Create Clip
                          </div>

                          {/* Timeline visualization */}
                          <div style={{ position: 'relative', height: 32, background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', marginBottom: 12, overflow: 'hidden' }}>
                            <div style={{
                              position: 'absolute', top: 0, bottom: 0,
                              left: `${(clipStart / (videoRef.current?.duration || 1)) * 100}%`,
                              width: `${((clipEnd - clipStart) / (videoRef.current?.duration || 1)) * 100}%`,
                              background: 'linear-gradient(90deg, rgba(16,107,58,0.5), rgba(0,154,68,0.5))',
                              borderRadius: 'var(--radius-sm)',
                              border: '2px solid var(--rocks-green-light)',
                            }} />
                            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${(clipStart / (videoRef.current?.duration || 1)) * 100}%`, fontSize: 10, color: '#fff', fontWeight: 700, padding: '0 4px' }}>{formatTime(clipStart)}</div>
                            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${(clipEnd / (videoRef.current?.duration || 1)) * 100}%`, fontSize: 10, color: '#fff', fontWeight: 700, padding: '0 4px' }}>{formatTime(clipEnd)}</div>
                          </div>

                          {/* Time controls */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Start Time</label>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input type="number" min={0} max={clipEnd - 1} value={clipStart} onChange={e => setClipStart(Number(e.target.value))}
                                  className="form-input" style={{ flex: 1, fontSize: 'var(--text-xs)' }} />
                                <button onClick={setStartToCurrent} title="Set to current video time" style={{ padding: '4px 8px', background: 'rgba(16,107,58,0.2)', border: '1px solid rgba(16,107,58,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--rocks-green-light)', fontSize: 10 }}>
                                  <SkipBack size={12} /> Now
                                </button>
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>End Time</label>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input type="number" min={clipStart + 1} value={clipEnd} onChange={e => setClipEnd(Number(e.target.value))}
                                  className="form-input" style={{ flex: 1, fontSize: 'var(--text-xs)' }} />
                                <button onClick={setEndToCurrent} title="Set to current video time" style={{ padding: '4px 8px', background: 'rgba(16,107,58,0.2)', border: '1px solid rgba(16,107,58,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--rocks-green-light)', fontSize: 10 }}>
                                  <SkipForward size={12} /> Now
                                </button>
                              </div>
                            </div>
                          </div>

                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginBottom: 8 }}>Duration: {formatTime(clipEnd - clipStart)} ({clipEnd - clipStart}s)</div>

                          {/* Clip title */}
                          <input className="form-input" placeholder="Clip title (e.g., Play 3 - Inside Dive)" value={clipTitle} onChange={e => setClipTitle(e.target.value)}
                            style={{ marginBottom: 12, fontSize: 'var(--text-xs)' }} />

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="secondary" size="sm" icon={<Play size={12} />} onClick={previewClip}>Preview</Button>
                            <Button variant="primary" size="sm" icon={savingClip ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
                              onClick={saveClip} disabled={savingClip}>
                              {savingClip ? 'Saving...' : 'Save Clip'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowClipTrimmer(false)}>Cancel</Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div style={{ height: 300, background: 'linear-gradient(135deg, rgba(16,107,58,0.1), rgba(0,0,0,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', flexDirection: 'column', gap: '1rem' }}>
                    <Film size={64} color="var(--text-dim)" />
                    <span style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>No video file attached</span>
                  </div>
                )}

                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>{selectedFilm.title}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Type</span>
                      <Badge variant={typeConfig(selectedFilm.film_type).color}>{typeConfig(selectedFilm.film_type).label}</Badge>
                    </div>
                    {selectedFilm.opponent && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}><span style={{ color: 'var(--text-dim)' }}>Opponent</span><span style={{ fontWeight: 600 }}>{selectedFilm.opponent}</span></div>}
                    {selectedFilm.film_date && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}><span style={{ color: 'var(--text-dim)' }}>Date</span><span>{new Date(selectedFilm.film_date).toLocaleDateString()}</span></div>}
                    
                    {/* Weather Widget */}
                    {(() => {
                      let weather = selectedFilm.weather;
                      if (!weather && selectedFilm.description && selectedFilm.description.includes('__WEATHER__:')) {
                        try {
                          const match = selectedFilm.description.match(/__WEATHER__:(.*)$/m);
                          if (match) weather = JSON.parse(match[1]);
                        } catch (e) {}
                      }
                      if (!weather) return null;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)', marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Game Conditions</span>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Thermometer size={14} color="var(--rocks-gold)" />
                              <span>{weather.temp}°C</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Wind size={14} color="var(--rocks-green-light)" />
                              <span>{weather.wind} km/h</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {weather.code >= 51 ? (
                                <CloudRain size={14} color="#60a5fa" />
                              ) : weather.code >= 1 ? (
                                <Cloud size={14} color="#94a3b8" />
                              ) : (
                                <Sun size={14} color="var(--rocks-gold)" />
                              )}
                              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                                {weather.code >= 95 ? 'T-Storm' : weather.code >= 51 ? 'Rain' : weather.code >= 1 ? 'Overcast' : 'Clear'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const displayDescription = selectedFilm.description
                        ? selectedFilm.description
                            .replace(/__SIDELINE_LOG__:[\s\S]*$/, '')
                            .replace(/__WEATHER__:[\s\S]*$/, '')
                            .trim()
                        : '';
                      if (!displayDescription) return null;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-sm)', marginTop: 8 }}>
                          <span style={{ color: 'var(--text-dim)' }}>Notes</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{displayDescription}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" icon={<Scissors size={14} />} size="sm" onClick={openClipTrimmer}>Create Clip</Button>
                    <Button variant="ghost" icon={<Trash2 size={14} />} size="sm" onClick={() => { deleteFilm(selectedFilm.id); setSelectedFilm(null); }}>Delete</Button>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Analysis view / controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Tab Header Selector */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 16 }}>
                  <button 
                    type="button"
                    onClick={() => setActiveRightTab('analysis')} 
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeRightTab === 'analysis' ? '2px solid var(--rocks-green-light)' : '2px solid transparent',
                      color: activeRightTab === 'analysis' ? 'var(--rocks-green-light)' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    AI Analysis
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveRightTab('plays')} 
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeRightTab === 'plays' ? '2px solid var(--rocks-green-light)' : '2px solid transparent',
                      color: activeRightTab === 'plays' ? 'var(--rocks-green-light)' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Play Index ({parsePlaysFromFilm(selectedFilm).length})
                  </button>
                </div>

                {activeRightTab === 'analysis' ? (
                  analysis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Brain size={20} color="var(--rocks-green-light)" />
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                            AI Analysis — {ANALYSIS_TYPES.find(t => t.value === analysisType)?.label || 'Analysis'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)} title="Show options">
                            ⚙️ Settings
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => runAnalysis(selectedFilm, true)} disabled={analyzing} title="Re-run analysis">
                            🔄 Re-run
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setShowCorrectionInput(!showCorrectionInput)} title="Correct analysis" style={{ color: showCorrectionInput ? 'var(--rocks-gold)' : undefined }}>
                            ✍️ Correct
                          </Button>
                        </div>
                      </div>

                      {/* Progress if analyzing/processing */}
                      {selectedFilm.ai_status === 'processing' && (
                        <div style={{ padding: '12px', background: 'rgba(253,185,19,0.05)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                              <Loader2 size={12} className="spin" /> Updating analysis...
                            </span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 700 }}>
                              {analysisProgress}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              width: `${analysisProgress}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--rocks-gold), #f59e0b)',
                            borderRadius: 99,
                            transition: 'width 0.5s ease-out',
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Coach Correction Input */}
                    {showCorrectionInput && (
                      <div style={{ padding: 10, background: 'rgba(253,185,19,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(253,185,19,0.2)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 600, marginBottom: 6 }}>
                          ✍️ Coach Correction
                        </div>
                        <textarea
                          value={correctionText}
                          onChange={(e) => setCorrectionText(e.target.value)}
                          placeholder="Tell the AI what it got wrong, e.g.: 'This was a run play, not a pass. #11 with the red guardian cap blocked for the RB who ran right.'"
                          style={{
                            width: '100%', minHeight: 60, padding: 8, fontSize: 'var(--text-xs)',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                            resize: 'vertical', fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <Button variant="primary" size="sm" style={{ fontSize: '0.65rem', padding: '4px 10px', background: 'var(--rocks-gold)', color: '#000' }}
                            disabled={!correctionText.trim() || selectedFilm.ai_status === 'processing'}
                            onClick={async () => {
                              try {
                                await fetch(`${FILM_API}/correct`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    filmId: selectedFilm.id,
                                    correction: correctionText,
                                    videoUrl: selectedFilm.video_url,
                                    clipStart: selectedFilm.clip_start_seconds,
                                    clipEnd: selectedFilm.clip_end_seconds,
                                    filmType: selectedFilm.film_type,
                                    opponent: selectedFilm.opponent,
                                    speedMode,
                                  }),
                                });
                                setFilms(prev => prev.map(f => f.id === selectedFilm.id ? { ...f, ai_status: 'processing' } : f));
                                setSelectedFilm(prev => prev ? { ...prev, ai_status: 'processing' } : prev);
                                startProgressSimulation();
                                setShowCorrectionInput(false);
                                setCorrectionText('');
                                toast.success('Correction submitted — re-analyzing now...', { id: 'correction' });
                              } catch {
                                toast.error('Failed to submit correction');
                              }
                            }}>
                            Submit Correction
                          </Button>
                          <Button variant="ghost" size="sm" style={{ fontSize: '0.65rem', padding: '4px 10px' }}
                            onClick={() => { setShowCorrectionInput(false); setCorrectionText(''); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <StructuredAnalysis text={analysis} />
                  </div>
                ) : (
                  /* Trigger settings panel */
                  <div style={{ padding: 'var(--space-md)', background: 'linear-gradient(135deg, rgba(16,107,58,0.08), rgba(253,185,19,0.04))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,107,58,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-sm)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                      <Brain size={16} color="var(--rocks-green-light)" /> AI Film Analysis
                    </div>

                    {selectedFilm.clip_start_seconds != null ? (
                      <div style={{ padding: '8px 12px', background: 'rgba(253,185,19,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(253,185,19,0.3)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Scissors size={12} color="var(--rocks-gold)" />
                        <span><strong>Clip Analysis</strong> — Deep single-play breakdown ({formatTime(selectedFilm.clip_start_seconds)} → {formatTime(selectedFilm.clip_end_seconds)})</span>
                      </div>
                    ) : (
                      <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Analysis Type</label>
                        <select className="form-input" value={analysisType} onChange={e => setAnalysisType(e.target.value)} style={{ fontSize: 'var(--text-xs)' }}>
                          {ANALYSIS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Speed Mode Toggle */}
                    <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Accuracy Mode</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => setSpeedMode('flash')} style={{
                          flex: 1, padding: '6px 8px', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer',
                          borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                          background: speedMode === 'flash' ? 'rgba(253,185,19,0.2)' : 'transparent',
                          borderColor: speedMode === 'flash' ? 'var(--rocks-gold)' : 'var(--border)',
                          color: speedMode === 'flash' ? 'var(--rocks-gold)' : 'var(--text-dim)',
                        }}>⚡ Fast (Quick Look)</button>
                        <button type="button" onClick={() => setSpeedMode('pro')} style={{
                          flex: 1, padding: '6px 8px', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer',
                          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                          background: speedMode === 'pro' ? 'rgba(16,107,58,0.2)' : 'transparent',
                          borderColor: speedMode === 'pro' ? 'var(--rocks-green-light)' : 'var(--border)',
                          color: speedMode === 'pro' ? 'var(--rocks-green-light)' : 'var(--text-dim)',
                        }}>🎯 Accurate (Recommended)</button>
                      </div>
                    </div>

                    {/* Status indicator */}
                    {selectedFilm.ai_status === 'processing' && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <Loader2 size={12} className="spin" /> Analyzing film...
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 700 }}>
                            {analysisProgress}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            width: `${analysisProgress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--rocks-gold), #f59e0b)',
                            borderRadius: 99,
                            transition: 'width 0.5s ease-out',
                          }} />
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 3 }}>
                          {analysisProgress < 30 ? 'Preparing video...' : analysisProgress < 60 ? 'Running AI analysis...' : analysisProgress < 90 ? 'Generating report...' : 'Almost done...'}
                        </div>
                      </div>
                    )}
                    {selectedFilm.ai_status === 'failed' && (
                      <div style={{ fontSize: 'var(--text-xs)', color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={12} /> Analysis failed — try again
                      </div>
                    )}
                    {selectedFilm.ai_analysis && selectedFilm.ai_status !== 'processing' && selectedFilm.ai_status !== 'failed' && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-green-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Saved analysis available ({selectedFilm.ai_analysis_type ? ANALYSIS_TYPES.find(t => t.value === selectedFilm.ai_analysis_type)?.label : 'Full Breakdown'})
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      <Button variant="primary" size="sm" icon={analyzing || selectedFilm.ai_status === 'processing' ? <Loader2 size={14} className="spin" /> : <Brain size={14} />}
                        onClick={() => runAnalysis(selectedFilm)} disabled={analyzing || selectedFilm.ai_status === 'processing'} style={{ flex: 1 }}>
                        {analyzing ? 'Starting...' : selectedFilm.ai_status === 'processing' ? `Analyzing ${analysisProgress}%` : 'Run AI Analysis'}
                      </Button>
                      {selectedFilm.ai_analysis && selectedFilm.ai_status !== 'processing' && (
                        <Button variant="secondary" size="sm" onClick={() => setAnalysis(selectedFilm.ai_analysis)} style={{ flex: 1 }}>
                          View AI Report
                        </Button>
                      )}
                    </div>
                  </div>
                  ) ) : (
                  /* Suggested Plays / Clips Tab */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      Select a play to jump to its timestamp and load it into the clip trimmer.
                    </div>
                    
                    {parsePlaysFromFilm(selectedFilm).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 'var(--space-xl)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-dim)' }}>
                        No plays detected in this film yet. Log plays on the sideline or run AI analysis to auto-populate.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 450, overflowY: 'auto', paddingRight: 4 }}>
                        {parsePlaysFromFilm(selectedFilm).map((play) => (
                          <div 
                            key={play.index} 
                            style={{ 
                              padding: 12, 
                              background: 'var(--bg-glass)', 
                              border: '1px solid var(--border)', 
                              borderRadius: 'var(--radius-sm)', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center' 
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 800, color: 'var(--rocks-gold)', fontSize: 'var(--text-xs)' }}>Play #{play.index}</span>
                                <Badge variant={play.source === 'sideline' ? 'green' : 'purple'} style={{ fontSize: '9px', padding: '1px 4px' }}>
                                  {play.source === 'sideline' ? 'Sideline' : 'AI'}
                                </Badge>
                              </div>
                              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>{play.title}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                Time: {formatTime(play.start)} - {formatTime(play.end)} ({play.end - play.start}s)
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 4 }}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                style={{ padding: '4px 8px', fontSize: 10 }}
                                onClick={() => {
                                  const video = videoRef.current;
                                  if (video) {
                                    video.currentTime = play.start;
                                    video.play();
                                  }
                                }}
                              >
                                Seek
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                style={{ padding: '4px 8px', fontSize: 10 }}
                                onClick={() => {
                                  const video = videoRef.current;
                                  if (video) {
                                    video.currentTime = play.start;
                                  }
                                  setClipStart(Math.max(0, play.start - 5));
                                  setClipEnd(play.end + 10);
                                  setClipTitle(play.title);
                                  setShowClipTrimmer(true);
                                  toast.success(`Trimmer loaded with Play #${play.index}`);
                                }}
                              >
                                Trim
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
