'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Search, Share2, Eye, Trash2, Plus, ExternalLink, Filter, User } from 'lucide-react';
import { Card, Button, Badge, Avatar, PageHeader, Modal, EmptyState, PositionBadge } from '@/components/ui/index';
import { TrophyIcon, FootballIcon } from '@/components/ui/Icons';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ player_id: '', title: '', description: '', video_url: '' });

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: hl }, { data: pl }] = await Promise.all([
      supabase.from('highlights').select('*, players(first_name, last_name, position, jersey_number)').order('created_at', { ascending: false }),
      supabase.from('players').select('id, first_name, last_name, position, jersey_number').order('last_name'),
    ]);
    setHighlights(hl || []);
    setPlayers(pl || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from('highlights').insert({
      ...form,
      is_published: false,
      share_url: `https://delrayrocks.org/highlights/${Date.now()}`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Highlight created');
    setShowCreate(false);
    setForm({ player_id: '', title: '', description: '', video_url: '' });
    load();
  }

  async function togglePublish(id, current) {
    const supabase = createClient();
    await supabase.from('highlights').update({ is_published: !current }).eq('id', id);
    toast.success(!current ? 'Published — ready to share' : 'Unpublished');
    load();
  }

  async function deleteHighlight(id) {
    const supabase = createClient();
    await supabase.from('highlights').delete().eq('id', id);
    toast.success('Highlight removed');
    load();
  }

  const filtered = highlights.filter(h => {
    if (filterPlayer !== 'all' && h.player_id !== filterPlayer) return false;
    if (search && !h.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const publishedCount = highlights.filter(h => h.is_published).length;
  const totalViews = highlights.reduce((sum, h) => sum + (h.views_count || 0), 0);

  return (
    <div>
      <PageHeader
        title="Highlights"
        subtitle="Player highlight reels for social sharing"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Create Highlight
          </Button>
        }
      />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Highlights', value: highlights.length, color: 'var(--rocks-gold)' },
          { label: 'Published', value: publishedCount, color: 'var(--green)' },
          { label: 'Total Views', value: totalViews, color: 'var(--electric-blue-light)' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{stat.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search highlights..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <select className="form-input" style={{ width: 'auto', minWidth: 160 }} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
            <option value="all">All Players</option>
            {players.map(p => <option key={p.id} value={p.id}>#{p.jersey_number} {p.first_name} {p.last_name}</option>)}
          </select>
        </div>
      </Card>

      {/* Highlights Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading highlights...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy size={48} />}
          title="No highlights yet"
          description="Create highlight clips from your game film for players to share on social media."
          action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create First Highlight</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
          {filtered.map((hl, i) => {
            const player = hl.players;
            return (
              <motion.div key={hl.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  {/* Video Preview */}
                  <div style={{
                    height: 180, background: 'linear-gradient(135deg, rgba(253,185,19,0.08), rgba(16,107,58,0.05))',
                    borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  }}>
                    <TrophyIcon size={40} color="var(--rocks-gold)" />
                    {hl.is_published && (
                      <span style={{
                        position: 'absolute', top: 8, right: 8, padding: '2px 8px',
                        background: 'rgba(16,107,58,0.9)', borderRadius: 'var(--radius-full)',
                        fontSize: '0.6rem', color: 'white', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>Live</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 4 }}>{hl.title}</div>
                    {player && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                        <Avatar name={`${player.first_name} ${player.last_name}`} size={20} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                          #{player.jersey_number} {player.first_name} {player.last_name}
                        </span>
                        {player.position && <PositionBadge position={player.position} />}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={10} /> {hl.views_count || 0} views</span>
                      <span>{new Date(hl.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                    <Button variant={hl.is_published ? 'ghost' : 'secondary'} size="sm" onClick={() => togglePublish(hl.id, hl.is_published)}>
                      {hl.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    {hl.is_published && hl.share_url && (
                      <Button variant="ghost" size="sm" icon={<Share2 size={12} />} onClick={() => { navigator.clipboard.writeText(hl.share_url); toast.success('Share link copied'); }}>
                        Share
                      </Button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => deleteHighlight(hl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <Modal onClose={() => setShowCreate(false)} title="Create Highlight">
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Player *</label>
                <select className="form-input" required value={form.player_id} onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}>
                  <option value="" disabled>Select player...</option>
                  {players.map(p => <option key={p.id} value={p.id}>#{p.jersey_number} {p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="TD Run vs Eagles - Q3" />
              </div>
              <div className="form-group">
                <label className="form-label">Video URL</label>
                <input className="form-input" value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this highlight play..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" type="submit" icon={<Plus size={16} />}>Create Highlight</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
