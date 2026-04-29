'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Filter, Grid3X3, List, Edit2, Trash2, Eye, X } from 'lucide-react';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge, Modal, EmptyState } from '@/components/ui/index';
import { createClient, POSITION_LABELS, getPlayerAge } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function RosterPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);

  useEffect(() => { loadPlayers(); }, []);

  async function loadPlayers() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('last_name', { ascending: true });
    if (!error) setPlayers(data || []);
    setLoading(false);
  }

  const filtered = players.filter(p => {
    const matchSearch = `${p.first_name} ${p.last_name} ${p.jersey_number || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === 'all' || p.position === posFilter;
    return matchSearch && matchPos;
  });

  const positions = [...new Set(players.map(p => p.position).filter(Boolean))];

  async function handleDelete(id) {
    if (!confirm('Remove this player from the roster?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) { toast.error('Failed to remove player'); return; }
    toast.success('Player removed');
    loadPlayers();
  }

  async function handleSave(formData) {
    const supabase = createClient();
    if (editPlayer) {
      const { error } = await supabase.from('players').update(formData).eq('id', editPlayer.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Player updated');
    } else {
      const { error } = await supabase.from('players').insert(formData);
      if (error) { toast.error(error.message); return; }
      toast.success('Player added to roster!');
    }
    setShowAddModal(false);
    setEditPlayer(null);
    loadPlayers();
  }

  return (
    <div>
      <PageHeader
        title="Team Roster"
        subtitle={`${players.length} players · 8U Rocks`}
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditPlayer(null); setShowAddModal(true); }}>Add Player</Button>}
      />

      {/* Toolbar */}
      <Card style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <select className="form-input" value={posFilter} onChange={e => setPosFilter(e.target.value)} style={{ width: 140 }}>
            <option value="all">All Positions</option>
            {positions.map(p => <option key={p} value={p}>{p} — {POSITION_LABELS[p] || p}</option>)}
          </select>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button className={`btn btn-sm ${view === 'grid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('grid')} style={{ borderRadius: 0 }}><Grid3X3 size={14} /></button>
            <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('list')} style={{ borderRadius: 0 }}><List size={14} /></button>
          </div>
        </div>
      </Card>

      {/* Players */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏈" title="No Players Found" description={search ? 'Try a different search term' : 'Add your first player to get started'} action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>Add Player</Button>} />
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {filtered.map((player, i) => (
            <motion.div key={player.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.4 }}>
              <Card style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-lg)' }}>
                <Avatar name={`${player.first_name} ${player.last_name}`} size={64} />
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{player.first_name} {player.last_name}</div>
                  {player.jersey_number && <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--rocks-green-light)', marginTop: 4 }}>#{player.jersey_number}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  {player.position && <PositionBadge position={player.position} />}
                  {player.date_of_birth && <Badge variant="blue">Age {getPlayerAge(player.date_of_birth)}</Badge>}
                </div>
                {player.weight && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 'var(--space-sm)' }}>{player.weight} lbs</div>}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
                  <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => window.location.href = `/coach/roster/${player.id}`}>View</Button>
                  <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => { setEditPlayer(player); setShowAddModal(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(player.id)} style={{ color: 'var(--red)' }} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Player</th><th>Position</th><th>Age</th><th>Weight</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(player => (
                  <tr key={player.id}>
                    <td style={{ fontWeight: 800, color: 'var(--rocks-green-light)' }}>{player.jersey_number || '—'}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Avatar name={`${player.first_name} ${player.last_name}`} size={32} /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{player.first_name} {player.last_name}</span></div></td>
                    <td>{player.position ? <PositionBadge position={player.position} /> : '—'}</td>
                    <td>{player.date_of_birth ? getPlayerAge(player.date_of_birth) : '—'}</td>
                    <td>{player.weight ? `${player.weight} lbs` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditPlayer(player); setShowAddModal(true); }}><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(player.id)} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditPlayer(null); }} title={editPlayer ? 'Edit Player' : 'Add Player'} size="md">
        <PlayerForm player={editPlayer} onSave={handleSave} onCancel={() => { setShowAddModal(false); setEditPlayer(null); }} />
      </Modal>
    </div>
  );
}

function PlayerForm({ player, onSave, onCancel }) {
  const [form, setForm] = useState({
    first_name: player?.first_name || '',
    last_name: player?.last_name || '',
    jersey_number: player?.jersey_number || '',
    position: player?.position || '',
    date_of_birth: player?.date_of_birth || '',
    weight: player?.weight || '',
    guardian_name: player?.guardian_name || '',
    guardian_phone: player?.guardian_phone || '',
    guardian_email: player?.guardian_email || '',
    notes: player?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = { ...form };
    if (payload.jersey_number) payload.jersey_number = parseInt(payload.jersey_number);
    if (payload.weight) payload.weight = parseFloat(payload.weight);
    else delete payload.weight;
    if (!payload.jersey_number) delete payload.jersey_number;
    await onSave(payload);
    setSaving(false);
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Jersey #</label><input className="form-input" type="number" value={form.jersey_number} onChange={e => update('jersey_number', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Position</label>
          <select className="form-input" value={form.position} onChange={e => update('position', e.target.value)}>
            <option value="">Select...</option>
            {Object.entries(POSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Weight (lbs)</label><input className="form-input" type="number" value={form.weight} onChange={e => update('weight', e.target.value)} /></div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--rocks-gold)' }}>Guardian Info</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group"><label className="form-label">Guardian Name</label><input className="form-input" value={form.guardian_name} onChange={e => update('guardian_name', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" value={form.guardian_phone} onChange={e => update('guardian_phone', e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Email</label><input className="form-input" type="email" value={form.guardian_email} onChange={e => update('guardian_email', e.target.value)} /></div>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} /></div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={saving}>{player ? 'Save Changes' : 'Add Player'}</Button>
      </div>
    </form>
  );
}
