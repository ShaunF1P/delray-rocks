'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCog, Plus, Phone, Mail, Edit2, Trash2, Camera, Shield, X } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Coaching role colors
const ROLE_COLORS = {
  'Head Coach': 'gold',
  'General Manager': 'blue',
  'Offensive Coordinator': 'green',
  'Defensive Coordinator': 'red',
  'Position Coach': 'purple',
  'Assistant Coach': 'teal',
};

// Default staff from the flyer — used to seed if table is empty
const DEFAULT_STAFF = [
  { name: 'Gerard Miller', title: 'Head Coach', specialty: 'Running Backs', phone: '', sort_order: 1 },
  { name: 'Shaun Muhammad', title: 'General Manager', specialty: 'Operations', phone: '', sort_order: 2 },
  { name: 'Jacoby Dorch', title: 'Offensive Coordinator', specialty: 'Offense', phone: '', sort_order: 3 },
  { name: 'Marcus Darrisaw', title: 'Position Coach', specialty: 'WRs / Special Teams', phone: '', sort_order: 4 },
  { name: 'Brent Modlin', title: 'Position Coach', specialty: 'Offensive Line', phone: '', sort_order: 5 },
  { name: 'Central McCellion', title: 'Defensive Coordinator', specialty: 'Defensive Backs', phone: '', sort_order: 6 },
  { name: 'Jasper Brown', title: 'Position Coach', specialty: 'Defensive Line', phone: '', sort_order: 7 },
  { name: 'Carl Nelson', title: 'Position Coach', specialty: 'Linebackers', phone: '', sort_order: 8 },
];

export default function CoachingStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCoach, setEditCoach] = useState(null);

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('coaching_staff')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Staff load error:', error);
      // Table might not exist yet — show defaults
      setStaff(DEFAULT_STAFF.map((s, i) => ({ ...s, id: `default-${i}` })));
    } else if (data && data.length > 0) {
      setStaff(data);
    } else {
      // Seed default staff
      const { error: seedError } = await supabase.from('coaching_staff').insert(DEFAULT_STAFF);
      if (!seedError) {
        const { data: seeded } = await supabase.from('coaching_staff').select('*').order('sort_order');
        setStaff(seeded || DEFAULT_STAFF.map((s, i) => ({ ...s, id: `default-${i}` })));
        toast.success('Coaching staff loaded from flyer data');
      } else {
        setStaff(DEFAULT_STAFF.map((s, i) => ({ ...s, id: `default-${i}` })));
      }
    }
    setLoading(false);
  }

  async function handleSave(formData) {
    const supabase = createClient();
    if (editCoach && !String(editCoach.id).startsWith('default-')) {
      const { error } = await supabase.from('coaching_staff').update(formData).eq('id', editCoach.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Coach updated');
    } else {
      const { error } = await supabase.from('coaching_staff').insert(formData);
      if (error) { toast.error(error.message); return; }
      toast.success('Coach added!');
    }
    setShowModal(false);
    setEditCoach(null);
    loadStaff();
  }

  async function handleDelete(id) {
    if (!confirm('Remove this coach?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('coaching_staff').delete().eq('id', id);
    if (error) { toast.error('Failed to remove'); return; }
    toast.success('Coach removed');
    loadStaff();
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function getRoleColor(title) {
    return ROLE_COLORS[title] || 'blue';
  }

  return (
    <div>
      <PageHeader
        title="Coaching Staff"
        subtitle="ONE TEAM. ONE PURPOSE. ONE GLORY."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditCoach(null); setShowModal(true); }}>
            Add Coach
          </Button>
        }
      />

      {/* Staff Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton-card skeleton" style={{ height: 280 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {staff.map((coach, i) => (
            <motion.div
              key={coach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header gradient */}
                <div style={{
                  height: 80,
                  background: `linear-gradient(135deg, 
                    ${coach.title === 'Head Coach' ? 'rgba(253,185,19,0.3), rgba(253,185,19,0.1)' :
                      coach.title?.includes('Coordinator') ? 'rgba(16,107,58,0.3), rgba(0,154,68,0.1)' :
                      'rgba(16,107,58,0.15), rgba(253,185,19,0.05)'})`,
                  position: 'relative',
                }}>
                  {/* Edit/Delete buttons */}
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                    <button onClick={() => { setEditCoach(coach); setShowModal(true); }}
                      style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <Edit2 size={12} />
                    </button>
                    {!String(coach.id).startsWith('default-') && (
                      <button onClick={() => handleDelete(coach.id)}
                        style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--red)' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Avatar */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: -40 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: coach.headshot_url
                      ? `url(${coach.headshot_url}) center/cover`
                      : `linear-gradient(135deg, #106B3A, #009A44)`,
                    border: '4px solid var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', fontWeight: 800, color: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    {!coach.headshot_url && getInitials(coach.name)}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: 'var(--space-md) var(--space-lg) var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 4 }}>{coach.name}</div>
                  <Badge variant={getRoleColor(coach.title)} style={{ marginBottom: 8 }}>{coach.title}</Badge>

                  {coach.specialty && (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', marginBottom: 12 }}>
                      <Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {coach.specialty}
                    </div>
                  )}

                  {/* Contact */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
                    {coach.phone && (
                      <a href={`tel:${coach.phone}`} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16,107,58,0.1)', border: '1px solid rgba(16,107,58,0.2)',
                        fontSize: 'var(--text-xs)', color: 'var(--rocks-green-light)', textDecoration: 'none',
                      }}>
                        <Phone size={10} /> {coach.phone}
                      </a>
                    )}
                    {coach.email && (
                      <a href={`mailto:${coach.email}`} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(253,185,19,0.1)', border: '1px solid rgba(253,185,19,0.2)',
                        fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', textDecoration: 'none',
                      }}>
                        <Mail size={10} /> Email
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditCoach(null); }} title={editCoach ? 'Edit Coach' : 'Add Coach'} size="md">
        <StaffForm coach={editCoach} onSave={handleSave} onCancel={() => { setShowModal(false); setEditCoach(null); }} />
      </Modal>
    </div>
  );
}

function StaffForm({ coach, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: coach?.name || '',
    title: coach?.title || 'Position Coach',
    specialty: coach?.specialty || '',
    phone: coach?.phone || '',
    email: coach?.email || '',
    headshot_url: coach?.headshot_url || '',
    sort_order: coach?.sort_order || 10,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Gerard Miller" />
        </div>
        <div className="form-group">
          <label className="form-label">Title / Role</label>
          <select className="form-input" value={form.title} onChange={e => update('title', e.target.value)}>
            <option value="Head Coach">Head Coach</option>
            <option value="General Manager">General Manager</option>
            <option value="Offensive Coordinator">Offensive Coordinator</option>
            <option value="Defensive Coordinator">Defensive Coordinator</option>
            <option value="Position Coach">Position Coach</option>
            <option value="Assistant Coach">Assistant Coach</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Specialty</label>
          <input className="form-input" value={form.specialty} onChange={e => update('specialty', e.target.value)} placeholder="Running Backs, OL, DBs..." />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="561-672-5897" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Headshot URL (upload later)</label>
          <input className="form-input" value={form.headshot_url} onChange={e => update('headshot_url', e.target.value)} placeholder="Paste image URL or leave blank for initials" />
        </div>
        <div className="form-group">
          <label className="form-label">Sort Order</label>
          <input className="form-input" type="number" value={form.sort_order} onChange={e => update('sort_order', parseInt(e.target.value) || 10)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={saving}>{coach ? 'Save Changes' : 'Add Coach'}</Button>
      </div>
    </form>
  );
}
