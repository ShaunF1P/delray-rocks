'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Upload, Search, Filter, Play, Clock, Tag, Plus, Grid, List, Eye, Trash2, X } from 'lucide-react';
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

export default function FilmRoomPage() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', film_type: 'game', opponent: '', film_date: new Date().toISOString().split('T')[0], video_url: '',
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

  async function handleUpload(e) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from('game_films').insert(uploadForm);
    if (error) { toast.error(error.message); return; }
    toast.success('Film added to library');
    setShowUpload(false);
    setUploadForm({ title: '', description: '', film_type: 'game', opponent: '', film_date: new Date().toISOString().split('T')[0], video_url: '' });
    loadFilms();
  }

  async function deleteFilm(id) {
    const supabase = createClient();
    await supabase.from('game_films').delete().eq('id', id);
    toast.success('Film removed');
    loadFilms();
  }

  const typeConfig = (type) => FILM_TYPES.find(t => t.value === type) || FILM_TYPES[0];
  const filtered = films;

  return (
    <div>
      <PageHeader
        title="Film Room"
        subtitle="Game film library and play analysis"
        actions={
          <Button variant="primary" icon={<Upload size={16} />} onClick={() => setShowUpload(true)}>
            Upload Film
          </Button>
        }
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Film size={48} />}
          title="No films yet"
          description="Upload your first game or practice film to get started."
          action={<Button variant="primary" icon={<Upload size={16} />} onClick={() => setShowUpload(true)}>Upload Film</Button>}
        />
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {filtered.map((film, i) => {
            const cfg = typeConfig(film.film_type);
            return (
              <motion.div key={film.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => setSelectedFilm(film)}>
                  {/* Thumbnail */}
                  <div style={{
                    height: 180, background: 'linear-gradient(135deg, rgba(16,107,58,0.1), rgba(0,154,68,0.05))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', position: 'relative',
                  }}>
                    {film.thumbnail_url ? (
                      <img src={film.thumbnail_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                    ) : (
                      <cfg.Icon size={48} color={`var(--${cfg.color})`} />
                    )}
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 200ms', borderRadius: 'var(--radius-sm)',
                    }} className="film-overlay">
                      <Play size={40} color="white" />
                    </div>
                    {film.duration_seconds && (
                      <span style={{
                        position: 'absolute', bottom: 8, right: 8, padding: '2px 8px',
                        background: 'rgba(0,0,0,0.7)', borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)', color: 'white', fontWeight: 600,
                      }}>
                        {Math.floor(film.duration_seconds / 60)}:{String(film.duration_seconds % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 4 }}>{film.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                        <Badge variant={cfg.color}>{cfg.label}</Badge>
                        {film.film_date && <span><Clock size={10} /> {new Date(film.film_date).toLocaleDateString()}</span>}
                      </div>
                      {film.opponent && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 4 }}>vs {film.opponent}</div>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteFilm(film.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((film) => {
              const cfg = typeConfig(film.film_type);
              return (
                <div key={film.id} onClick={() => setSelectedFilm(film)} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: 'var(--bg-glass)', border: '1px solid var(--border)',
                  transition: 'border-color 150ms',
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: `var(--${cfg.color}-dim, rgba(16,107,58,0.1))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <cfg.Icon size={20} color={`var(--${cfg.color})`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{film.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      {film.opponent && `vs ${film.opponent} · `}
                      {film.film_date && new Date(film.film_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={cfg.color}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <Modal onClose={() => setShowUpload(false)} title="Upload Game Film">
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" required value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="Week 3 vs Eagles" />
              </div>
              <div className="form-group">
                <label className="form-label">Film Type</label>
                <select className="form-input" value={uploadForm.film_type} onChange={e => setUploadForm(f => ({ ...f, film_type: e.target.value }))}>
                  {FILM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Opponent</label>
                  <input className="form-input" value={uploadForm.opponent} onChange={e => setUploadForm(f => ({ ...f, opponent: e.target.value }))} placeholder="Eagles" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={uploadForm.film_date} onChange={e => setUploadForm(f => ({ ...f, film_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Video URL</label>
                <input className="form-input" value={uploadForm.video_url} onChange={e => setUploadForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>YouTube, Vimeo, or direct video link</span>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Coach notes about this film..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
                <Button variant="primary" type="submit" icon={<Upload size={16} />}>Add to Library</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Film Viewer Modal */}
      <AnimatePresence>
        {selectedFilm && (
          <Modal onClose={() => setSelectedFilm(null)} title={selectedFilm.title} wide>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xl)' }}>
              <div>
                {selectedFilm.video_url ? (
                  <div style={{
                    position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden',
                    borderRadius: 'var(--radius-md)', background: '#000',
                  }}>
                    <iframe
                      src={selectedFilm.video_url.includes('youtube') ? selectedFilm.video_url.replace('watch?v=', 'embed/') : selectedFilm.video_url}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div style={{
                    height: 360, background: 'linear-gradient(135deg, rgba(16,107,58,0.1), rgba(0,0,0,0.3))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-md)', flexDirection: 'column', gap: '1rem',
                  }}>
                    <Film size={64} color="var(--text-dim)" />
                    <span style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>No video URL provided</span>
                  </div>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>{selectedFilm.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Type</span>
                    <Badge variant={typeConfig(selectedFilm.film_type).color}>{typeConfig(selectedFilm.film_type).label}</Badge>
                  </div>
                  {selectedFilm.opponent && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Opponent</span>
                      <span style={{ fontWeight: 600 }}>{selectedFilm.opponent}</span>
                    </div>
                  )}
                  {selectedFilm.film_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Date</span>
                      <span>{new Date(selectedFilm.film_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {selectedFilm.description && (
                  <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {selectedFilm.description}
                  </div>
                )}
                <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: '0.5rem' }}>
                  <Button variant="secondary" icon={<Eye size={14} />} size="sm">Create Highlight</Button>
                  <Button variant="ghost" icon={<Trash2 size={14} />} size="sm" onClick={() => { deleteFilm(selectedFilm.id); setSelectedFilm(null); }}>Delete</Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
