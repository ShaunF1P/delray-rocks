'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Church, Check, X, Search, Download, RefreshCw, AlertCircle, Phone, Calendar, Heart, Shield, Mail } from 'lucide-react';
import { Card, Button, Badge, PageHeader, EmptyState } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function CoastalCoachManagement() {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadSignups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coastal/list');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch signups');
      }
      setSignups(data.signups || []);
    } catch (err) {
      toast.error('Failed to load signups: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignups();
  }, [loadSignups]);

  // Handle toggling the attendance check
  async function toggleAttendance(id, currentAttendedStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/coastal/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, attended: !currentAttendedStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update attendance');
      }

      toast.success(
        !currentAttendedStatus 
          ? 'Marked as attended! Sponsorship progress updated.' 
          : 'Attendance removed.'
      );

      // Update local state
      setSignups((prev) =>
        prev.map((s) => (s.id === id ? { ...s, attended: !currentAttendedStatus } : s))
      );
    } catch (err) {
      toast.error('Failed to update attendance: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Export to CSV helper
  function exportCSV() {
    if (signups.length === 0) {
      toast.error('No signups to export');
      return;
    }

    const headers = ['Parent/Guardian First Name', 'Parent/Guardian Last Name', 'Email', 'Phone', 'SMS Opt-in', 'Player Name (8U)', 'Planned Visit', 'Checked In', 'Date Registered'];
    const rows = signups.map((s) => [
      s.parent_first_name,
      s.parent_last_name,
      s.email || '',
      s.phone,
      s.text_opt_in ? 'Yes' : 'No',
      s.player_name,
      s.planned_visit || 'Unspecified',
      s.attended ? 'Yes' : 'No',
      new Date(s.created_at).toLocaleDateString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `coastal_signups_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export downloaded!');
  }

  // Filter signups based on search query
  const filteredSignups = signups.filter((s) => {
    const parentName = `${s.parent_first_name} ${s.parent_last_name}`.toLowerCase();
    const playerName = s.player_name.toLowerCase();
    const phone = s.phone.toLowerCase();
    const query = search.toLowerCase();
    return parentName.includes(query) || playerName.includes(query) || phone.includes(query);
  });

  const totalSignups = signups.length;
  const attendedCount = signups.filter((s) => s.attended).length;
  const optInCount = signups.filter((s) => s.text_opt_in).length;
  
  // Calculate sponsorship details (e.g. $50 per family who attends, up to $500 max)
  const sponsorshipTargetVal = 10; // 10 families = $500 sponsorship
  const earnedSponsorship = Math.min(500, attendedCount * 50);
  const sponsorshipPercent = Math.min(100, Math.round((attendedCount / sponsorshipTargetVal) * 100));
  const optInPercent = totalSignups > 0 ? Math.round((optInCount / totalSignups) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Coastal Community TV Signups"
        subtitle="Track church attendance signups and monitor the $500 sponsorship to support uniforms and bags for the 8U team."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={loadSignups} disabled={loading}>
              Refresh
            </Button>
            <Button variant="primary" icon={<Download size={16} />} onClick={exportCSV} disabled={signups.length === 0}>
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        {/* Total Families Registered */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-sm)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--electric-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--electric-blue-light)' }}>
                <Church size={20} />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Families Registered
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>{totalSignups}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Total parent sign-up forms submitted
            </div>
          </Card>
        </motion.div>

        {/* Attendance Checked */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-sm)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
                <Check size={20} />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Families Checked In
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--green)' }}>
              {attendedCount} <span style={{ fontSize: 'var(--text-lg)', fontWeight: 500, color: 'var(--text-dim)' }}>/ {totalSignups}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Confirmed visits to service or block party
            </div>
          </Card>
        </motion.div>

        {/* Sponsorship Raised */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-sm)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--rocks-gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rocks-gold)' }}>
                <Heart size={20} />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sponsorship Earned
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--rocks-gold)' }}>
              ${earnedSponsorship} <span style={{ fontSize: 'var(--text-lg)', fontWeight: 500, color: 'var(--text-dim)' }}>/ $500</span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${sponsorshipPercent}%`, background: 'var(--rocks-gold)', borderRadius: 'var(--radius-full)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: 4 }}>
              <span>{sponsorshipPercent}% Complete</span>
              <span>Need {sponsorshipTargetVal - attendedCount > 0 ? sponsorshipTargetVal - attendedCount : 0} more families</span>
            </div>
          </Card>
        </motion.div>

        {/* Text Communication Opt-In Rate */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-sm)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
                <Phone size={20} />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SMS Opt-In Rate
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--purple)' }}>
              {optInPercent}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {optInCount} of {totalSignups} parents opted-in
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Information Banner */}
      <Card style={{ padding: 'var(--space-md)', background: 'var(--bg-glass)', border: '1px solid var(--border-light)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <AlertCircle size={20} color="var(--electric-blue-light)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          <strong>Attendance Tracking:</strong> Use this panel to confirm when a family attends Sunday service at Coastal Community Church. Each verified attendance earns <strong>$50</strong> toward the team's <strong>$500 goal to support uniforms and bags</strong>.
        </div>
      </Card>

      {/* Control Bar */}
      <Card style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by parent name, player name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
            Showing {filteredSignups.length} of {totalSignups} signups
          </div>
        </div>
      </Card>

      {/* Data Table */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading signups...</div>
      ) : filteredSignups.length === 0 ? (
        <EmptyState
          icon={<Church size={48} style={{ opacity: 0.3 }} />}
          title={search ? 'No matches found' : 'No signups yet'}
          description={search ? 'Try adjusting your search criteria.' : 'Share the landing page link with 8U parent groups to get started.'}
          action={
            !search && (
              <Button
                variant="primary"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + '/coastal');
                  toast.success('Landing page link copied to clipboard!');
                }}
              >
                Copy Public Landing Page Link
              </Button>
            )
          }
        />
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-glass-heavy)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 850 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Parent/Guardian Name</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Phone</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Player Name (8U)</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Planned Visit</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>SMS Consent</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Registered Date</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, textAlign: 'center' }}>Check-In Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignups.map((s) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    fontSize: 'var(--text-sm)',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-glass)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                    {s.parent_first_name} {s.parent_last_name}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={12} color="var(--text-dim)" />
                      {s.email || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={12} color="var(--text-dim)" />
                      {s.phone}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500 }}>
                    <Badge variant="gold">{s.player_name}</Badge>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: s.planned_visit && s.planned_visit !== 'Unspecified' ? 'var(--electric-blue-light)' : 'var(--text-dim)' }}>
                      {s.planned_visit || 'Unspecified'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <Badge variant={s.text_opt_in ? 'purple' : 'gray'}>
                      {s.text_opt_in ? 'Opt-In' : 'Opt-Out'}
                    </Badge>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={12} color="var(--text-dim)" />
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <Button
                      variant={s.attended ? 'green' : 'ghost'}
                      size="sm"
                      disabled={updatingId === s.id}
                      icon={s.attended ? <Check size={14} /> : <X size={14} />}
                      onClick={() => toggleAttendance(s.id, s.attended)}
                      style={{
                        minWidth: 110,
                        justifyContent: 'center',
                        margin: '0 auto',
                      }}
                    >
                      {s.attended ? 'Checked In' : 'Mark Checked In'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Copy link quick utility */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.origin + '/coastal');
            toast.success('Landing page URL copied!');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: 'var(--text-xs)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Copy Public Landing Page Share Link for Parents
        </button>
      </div>
    </div>
  );
}
