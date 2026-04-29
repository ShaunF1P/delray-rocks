'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Upload, Search, Play, Clock, Grid, List, Eye, Trash2, Brain, FileVideo, CheckCircle, AlertCircle, Loader2, Scissors, SkipBack, SkipForward, Save } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal, EmptyState } from '@/components/ui/index';
import { FootballIcon, StadiumIcon, LightningIcon, TrophyIcon } from '@/components/ui/Icons';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

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
  const [speedMode, setSpeedMode] = useState('flash');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [showClipTrimmer, setShowClipTrimmer] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [clipTitle, setClipTitle] = useState('');
  const [savingClip, setSavingClip] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', film_type: 'game', opponent: '',
    film_date: new Date().toISOString().split('T')[0],
  });

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

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile && !uploadForm.video_url) {
      toast.error('Please select a video file or provide a URL');
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    const supabase = createClient();
    let videoUrl = '';

    try {
      // Check auth state
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload. Please refresh and log in again.');
        return;
      }

      if (selectedFile) {
        setUploadProgress(15);
        toast.loading(`Uploading ${(selectedFile.size / (1024 * 1024)).toFixed(0)}MB...`, { id: 'upload-progress' });

        const ext = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('game-films')
          .upload(fileName, selectedFile, { contentType: selectedFile.type, upsert: false });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }
        setUploadProgress(70);
        toast.loading('Saving film record...', { id: 'upload-progress' });

        const { data: urlData } = supabase.storage.from('game-films').getPublicUrl(fileName);
        videoUrl = urlData.publicUrl;
      }

      setUploadProgress(85);
      const { error } = await supabase.from('game_films').insert({
        ...uploadForm,
        video_url: videoUrl,
        duration_seconds: selectedFile ? Math.round(selectedFile.size / 50000) : null,
      });

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      setUploadProgress(100);
      toast.success('Film uploaded successfully! 🏈', { id: 'upload-progress' });
      setTimeout(() => {
        setShowUpload(false);
        setSelectedFile(null);
        setUploadProgress(0);
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

  async function runAnalysis(film, forceRerun = false) {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const supabase = createClient();

      // Check for cached analysis first (unless force re-run)
      if (!forceRerun && film.ai_analysis && film.ai_analysis_type === analysisType) {
        setAnalysis(film.ai_analysis);
        toast.success('Loaded saved analysis', { id: 'analysis-progress' });
        setAnalyzing(false);
        return;
      }

      // Step 1: Fetch roster for player identification
      const { data: rosterData } = await supabase
        .from('players')
        .select('first_name, last_name, jersey_number, position')
        .order('jersey_number');
      const roster = (rosterData || []).map(p => ({
        jersey: p.jersey_number,
        name: `${p.first_name} ${p.last_name}`,
        position: p.position,
      }));

      // Step 2: Server downloads + trims (for clips) + uploads to Google
      const isClip = film.clip_start_seconds != null;
      toast.loading(isClip
        ? `Trimming clip (${formatTime(film.clip_start_seconds)}-${formatTime(film.clip_end_seconds)}) and uploading...`
        : 'Uploading video to AI engine...', { id: 'analysis-progress' });

      const uploadRes = await fetch('/api/film/init-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: film.video_url,
          clipStart: film.clip_start_seconds,
          clipEnd: film.clip_end_seconds,
        }),
      });
      const uploadData = await uploadRes.json();
      if (uploadData.error) throw new Error(uploadData.error);

      // Step 3: Run Gemini analysis with roster + speed mode
      toast.loading(isClip
        ? `AI deep-analyzing clip (${formatTime(film.clip_start_seconds)}-${formatTime(film.clip_end_seconds)})...`
        : `AI analyzing game film (${speedMode})...`, { id: 'analysis-progress' });
      const res = await fetch('/api/film/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUri: uploadData.fileUri,
          mimeType: uploadData.mimeType,
          filmType: film.film_type,
          opponent: film.opponent,
          analysisType,
          roster,
          clipStart: film.clip_start_seconds,
          clipEnd: film.clip_end_seconds,
          speedMode,
        }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error, { id: 'analysis-progress' }); return; }
      setAnalysis(data.analysis);

      // Step 4: Save analysis to database for caching
      await supabase.from('game_films').update({
        ai_analysis: data.analysis,
        ai_analysis_type: analysisType,
        ai_analyzed_at: new Date().toISOString(),
      }).eq('id', film.id);

      // Update the film in local state so cache works on next click
      setFilms(prev => prev.map(f => f.id === film.id
        ? { ...f, ai_analysis: data.analysis, ai_analysis_type: analysisType, ai_analyzed_at: new Date().toISOString() }
        : f));
      setSelectedFilm(prev => prev ? { ...prev, ai_analysis: data.analysis, ai_analysis_type: analysisType } : prev);

      toast.success(`AI analysis complete! (${data.model}) 🏈`, { id: 'analysis-progress' });
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(err.message || 'Analysis failed', { id: 'analysis-progress' });
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
                <Card style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => { setSelectedFilm(film); setAnalysis(null); }}>
                  <div style={{ height: 180, background: 'linear-gradient(135deg, rgba(16,107,58,0.1), rgba(0,154,68,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', position: 'relative' }}>
                    {film.thumbnail_url ? (
                      <img src={film.thumbnail_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                    ) : <cfg.Icon size={48} color={`var(--${cfg.color})`} />}
                    {film.video_url && (
                      <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', background: 'rgba(16,107,58,0.9)', borderRadius: 'var(--radius-full)', fontSize: '0.6rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Brain size={10} /> AI Ready
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
                <div key={film.id} onClick={() => { setSelectedFilm(film); setAnalysis(null); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
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

              {/* Upload Progress */}
              {uploading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    <span>{uploadProgress < 70 ? 'Uploading video...' : uploadProgress < 100 ? 'Saving to library...' : 'Complete!'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #106B3A, #009A44)', borderRadius: 'var(--radius-full)' }} />
                  </div>
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
          <Modal isOpen={!!selectedFilm} onClose={() => { setSelectedFilm(null); setAnalysis(null); }} title={selectedFilm.title} size="xl">
            <div style={{ display: 'grid', gridTemplateColumns: analysis ? '1fr' : '2fr 1fr', gap: 'var(--space-xl)' }}>
              {!analysis ? (
                <>
                  <div>
                    {selectedFilm.video_url ? (
                      <div>
                        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
                          <video ref={videoRef}
                            src={selectedFilm.clip_start_seconds != null
                              ? `${selectedFilm.video_url}#t=${selectedFilm.clip_start_seconds},${selectedFilm.clip_end_seconds}`
                              : selectedFilm.video_url}
                            controls style={{ width: '100%', maxHeight: 400 }}
                            onTimeUpdate={() => {
                              const v = videoRef.current;
                              if (v && selectedFilm.clip_end_seconds != null && v.currentTime >= selectedFilm.clip_end_seconds) {
                                v.pause();
                                v.currentTime = selectedFilm.clip_start_seconds;
                              }
                            }}
                          />
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
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>{selectedFilm.title}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Type</span>
                        <Badge variant={typeConfig(selectedFilm.film_type).color}>{typeConfig(selectedFilm.film_type).label}</Badge>
                      </div>
                      {selectedFilm.opponent && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}><span style={{ color: 'var(--text-dim)' }}>Opponent</span><span style={{ fontWeight: 600 }}>{selectedFilm.opponent}</span></div>}
                      {selectedFilm.film_date && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}><span style={{ color: 'var(--text-dim)' }}>Date</span><span>{new Date(selectedFilm.film_date).toLocaleDateString()}</span></div>}
                    </div>

                    {/* AI Analysis Section */}
                    <div style={{ padding: 'var(--space-md)', background: 'linear-gradient(135deg, rgba(16,107,58,0.08), rgba(253,185,19,0.04))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,107,58,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-sm)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        <Brain size={16} color="var(--rocks-green-light)" /> AI Film Analysis
                      </div>
                      <select className="form-input" value={analysisType} onChange={e => setAnalysisType(e.target.value)} style={{ marginBottom: 'var(--space-sm)', fontSize: 'var(--text-xs)' }}>
                        {ANALYSIS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                      </select>

                      {/* Speed Mode Toggle */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-sm)' }}>
                        <button onClick={() => setSpeedMode('flash')} style={{
                          flex: 1, padding: '6px 8px', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer',
                          borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                          background: speedMode === 'flash' ? 'rgba(253,185,19,0.2)' : 'transparent',
                          borderColor: speedMode === 'flash' ? 'var(--rocks-gold)' : 'var(--border)',
                          color: speedMode === 'flash' ? 'var(--rocks-gold)' : 'var(--text-dim)',
                        }}>⚡ Flash (Fast)</button>
                        <button onClick={() => setSpeedMode('pro')} style={{
                          flex: 1, padding: '6px 8px', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer',
                          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                          background: speedMode === 'pro' ? 'rgba(16,107,58,0.2)' : 'transparent',
                          borderColor: speedMode === 'pro' ? 'var(--rocks-green-light)' : 'var(--border)',
                          color: speedMode === 'pro' ? 'var(--rocks-green-light)' : 'var(--text-dim)',
                        }}>🔬 Pro (Deep)</button>
                      </div>

                      {/* Cached analysis indicator */}
                      {selectedFilm.ai_analysis && selectedFilm.ai_analysis_type === analysisType && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-green-light)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Saved analysis available
                          {selectedFilm.ai_analyzed_at && <span style={{ color: 'var(--text-dim)' }}>({new Date(selectedFilm.ai_analyzed_at).toLocaleDateString()})</span>}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="primary" size="sm" icon={analyzing ? <Loader2 size={14} className="spin" /> : <Brain size={14} />}
                          onClick={() => runAnalysis(selectedFilm)} disabled={analyzing} style={{ flex: 1 }}>
                          {analyzing ? 'Analyzing...' : selectedFilm.ai_analysis && selectedFilm.ai_analysis_type === analysisType ? 'View Saved' : 'Run AI Analysis'}
                        </Button>
                        {selectedFilm.ai_analysis && selectedFilm.ai_analysis_type === analysisType && (
                          <Button variant="ghost" size="sm" onClick={() => runAnalysis(selectedFilm, true)} disabled={analyzing} title="Re-run analysis">
                            🔄
                          </Button>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: '0.5rem' }}>
                      <Button variant="secondary" icon={<Scissors size={14} />} size="sm" onClick={openClipTrimmer}>Create Clip</Button>
                      <Button variant="ghost" icon={<Trash2 size={14} />} size="sm" onClick={() => { deleteFilm(selectedFilm.id); setSelectedFilm(null); }}>Delete</Button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Brain size={20} color="var(--rocks-green-light)" />
                      <span style={{ fontWeight: 700 }}>AI Analysis — {ANALYSIS_TYPES.find(t => t.value === analysisType)?.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="ghost" size="sm" onClick={() => runAnalysis(selectedFilm, true)} disabled={analyzing}>🔄 Re-run</Button>
                      <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)}>Back to Film</Button>
                    </div>
                  </div>
                  <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto', border: '1px solid var(--border)' }}>
                    {analysis}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
