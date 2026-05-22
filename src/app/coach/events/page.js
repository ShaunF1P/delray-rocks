'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, MapPin, Clock, Edit2, Trash2 } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal, EmptyState } from '@/components/ui/index';
import { StadiumIcon, FootballIcon, PlaybookIcon, DollarIcon } from '@/components/ui/Icons';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const supabase = createClient();
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    setEvents(data || []);
    setLoading(false);
  }

  const now = new Date().toISOString();
  const filtered = events.filter(e => {
    if (filter === 'upcoming') return e.event_date >= now;
    if (filter === 'past') return e.event_date < now;
    return true;
  });

  async function handleDelete(id) {
    if (!confirm('Delete this event?')) return;
    const supabase = createClient();
    await supabase.from('events').delete().eq('id', id);
    toast.success('Event deleted');
    loadEvents();
  }

  async function handleSave(formData) {
    const supabase = createClient();
    if (editEvent) {
      const { error } = await supabase.from('events').update(formData).eq('id', editEvent.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Event updated');
    } else {
      const { error } = await supabase.from('events').insert(formData);
      if (error) { toast.error(error.message); return; }
      toast.success('Event created!');
    }
    setShowModal(false);
    setEditEvent(null);
    loadEvents();
  }

  const typeConfig = {
    game: { Icon: StadiumIcon, color: 'red', label: 'Game' },
    practice: { Icon: FootballIcon, color: 'green', label: 'Practice' },
    meeting: { Icon: PlaybookIcon, color: 'blue', label: 'Meeting' },
    fundraiser: { Icon: DollarIcon, color: 'amber', label: 'Fundraiser' },
  };

  return (
    <div>
      <PageHeader title="Events & Schedule" subtitle="Manage practices, games, and team events"
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditEvent(null); setShowModal(true); }}>Create Event</Button>} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--space-lg)' }}>
        {[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }, { key: 'all', label: 'All' }].map(tab => (
          <button key={tab.key} className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(tab.key)}>{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📅" title="No Events" description="Schedule your first practice or game" action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Create Event</Button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filtered.map((event, i) => {
            const config = typeConfig[event.type] || typeConfig.practice;
            const date = event.event_date ? new Date(event.event_date) : null;
            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  {/* Date Block */}
                  <div style={{
                    width: 60, height: 60, borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-glass)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {date ? date.toLocaleDateString('en-US', { month: 'short' }) : '—'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>
                      {date ? date.getDate() : '?'}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
                      <span style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{event.name || event.title || `${config.label}`}</span>
                      <Badge variant={config.color}><config.Icon size={12} /> {config.label}</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      {date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                      {event.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{event.location}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditEvent(event); setShowModal(true); }}><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(event.id)} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditEvent(null); }} title={editEvent ? 'Edit Event' : 'Create Event'}>
        <EventForm event={editEvent} onSave={handleSave} onCancel={() => { setShowModal(false); setEditEvent(null); }} />
      </Modal>
    </div>
  );
}

function EventForm({ event, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: event?.name || event?.title || '',
    type: event?.type || 'practice',
    event_date: event?.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
    location: event?.location || '',
    description: event?.description || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.event_date) { toast.error('Name and date are required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="form-group"><label className="form-label">Event Name *</label><input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} required placeholder="e.g. Practice at Pompey Park" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 'var(--space-md)' }}>
        <div className="form-group"><label className="form-label">Type</label>
          <select className="form-input" value={form.type} onChange={e => update('type', e.target.value)}>
            <option value="practice">Practice</option><option value="game">Game</option><option value="meeting">Meeting</option><option value="fundraiser">Fundraiser</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Date & Time *</label><input className="form-input" type="datetime-local" value={form.event_date} onChange={e => update('event_date', e.target.value)} required /></div>
      </div>
      <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Pompey Park, Delray Beach" /></div>
      <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: 'var(--space-sm)' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={saving}>{event ? 'Update' : 'Create Event'}</Button>
      </div>
    </form>
  );
}
