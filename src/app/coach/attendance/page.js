'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Check, X, Save, Calendar } from 'lucide-react';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [players, setPlayers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState('practice');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('players').select('*').order('last_name');
      setPlayers(data || []);
      const initial = {};
      (data || []).forEach(p => { initial[p.id] = null; });
      setAttendance(initial);
      setLoading(false);
    }
    load();
  }, []);

  function markAll(present) {
    const updated = {};
    players.forEach(p => { updated[p.id] = present; });
    setAttendance(updated);
  }

  const presentCount = Object.values(attendance).filter(v => v === true).length;
  const absentCount = Object.values(attendance).filter(v => v === false).length;
  const unmarked = Object.values(attendance).filter(v => v === null).length;

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const records = Object.entries(attendance)
      .filter(([_, val]) => val !== null)
      .map(([playerId, present]) => ({
        player_id: playerId,
        event_date: eventDate,
        event_type: eventType,
        present,
      }));

    if (records.length === 0) { toast.error('Mark at least one player'); setSaving(false); return; }

    const { error } = await supabase.from('attendance').insert(records);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(`Attendance saved! ${presentCount} present, ${absentCount} absent`);
    setSaving(false);
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Quick check-in for today's session" actions={<Button variant="primary" icon={<Save size={16} />} loading={saving} onClick={handleSave}>Save Attendance</Button>} />

      {/* Controls */}
      <Card style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ minWidth: 140 }}>
            <label className="form-label">Type</label>
            <select className="form-input" value={eventType} onChange={e => setEventType(e.target.value)}>
              <option value="practice">Practice</option>
              <option value="game">Game</option>
              <option value="meeting">Meeting</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" onClick={() => markAll(true)}>✅ All Present</Button>
          <Button variant="ghost" size="sm" onClick={() => markAll(false)}>❌ All Absent</Button>
        </div>
      </Card>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <Card style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--green)' }}>{presentCount}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Present</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--red)' }}>{absentCount}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Absent</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-dim)' }}>{unmarked}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Unmarked</div>
        </Card>
      </div>

      {/* Player List */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {players.map((player, i) => {
          const status = attendance[player.id];
          return (
            <motion.div key={player.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.875rem 1.25rem',
                borderBottom: i < players.length - 1 ? '1px solid var(--border)' : 'none',
                background: status === true ? 'rgba(34,197,94,0.04)' : status === false ? 'rgba(239,68,68,0.04)' : 'transparent',
                transition: 'background 200ms ease',
              }}>
              <Avatar name={`${player.first_name} ${player.last_name}`} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{player.first_name} {player.last_name}</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {player.jersey_number && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>#{player.jersey_number}</span>}
                  {player.position && <PositionBadge position={player.position} />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setAttendance(a => ({ ...a, [player.id]: true }))}
                  style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    background: status === true ? '#22C55E' : 'var(--bg-glass)',
                    color: status === true ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease',
                  }}><Check size={18} /></button>
                <button onClick={() => setAttendance(a => ({ ...a, [player.id]: false }))}
                  style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    background: status === false ? '#EF4444' : 'var(--bg-glass)',
                    color: status === false ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease',
                  }}><X size={18} /></button>
              </div>
            </motion.div>
          );
        })}
      </Card>
    </div>
  );
}
