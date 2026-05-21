'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, Award, Users, Gift, Clock, Send, X, Sparkles } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal, EmptyState } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

const AWARD_TYPES = [
  { label: 'Film Guru 🎬', icon: '🎬', color: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.4)' },
  { label: 'Practice MVP 💪', icon: '💪', color: 'rgba(253,185,19,0.2)', border: 'rgba(253,185,19,0.4)' },
  { label: 'Playmaker 🏈', icon: '🏈', color: 'rgba(16,107,58,0.2)', border: 'rgba(16,107,58,0.4)' },
  { label: 'Iron Man 🦾', icon: '🦾', color: 'rgba(220,38,38,0.2)', border: 'rgba(220,38,38,0.4)' },
  { label: 'Rising Star ⭐', icon: '⭐', color: 'rgba(253,185,19,0.2)', border: 'rgba(253,185,19,0.4)' },
  { label: 'Team Builder 🤝', icon: '🤝', color: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.4)' },
  { label: 'Defensive Mastermind 🛡️', icon: '🛡️', color: 'rgba(220,38,38,0.2)', border: 'rgba(220,38,38,0.4)' },
  { label: 'Offensive Genius 🧠', icon: '🧠', color: 'rgba(16,107,58,0.2)', border: 'rgba(16,107,58,0.4)' },
];

export default function AwardsPage() {
  const [staff, setStaff] = useState([]);
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedAward, setSelectedAward] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser({ ...user, profile });
    }

    // Load coaching staff
    const { data: staffData, error: staffError } = await supabase
      .from('coaching_staff')
      .select('*')
      .order('sort_order', { ascending: true });

    if (staffError) {
      console.error('Staff load error:', staffError);
    } else {
      setStaff(staffData || []);
    }

    // Load all awards
    const { data: awardsData, error: awardsError } = await supabase
      .from('staff_awards')
      .select('*')
      .order('created_at', { ascending: false });

    if (awardsError) {
      console.error('Awards load error:', awardsError);
    } else {
      setAwards(awardsData || []);
    }

    setLoading(false);
  }

  function getAwardCountForStaff(staffId) {
    return awards.filter((a) => a.recipient_id === staffId).length;
  }

  function getInitials(name) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function openAwardModal(coach) {
    setSelectedStaff(coach);
    setSelectedAward(null);
    setReason('');
    setShowModal(true);
  }

  async function handleGiveAward() {
    if (!selectedStaff || !selectedAward) {
      toast.error('Please select an award type');
      return;
    }

    setSubmitting(true);

    try {
      const giverName = currentUser?.profile
        ? `${currentUser.profile.first_name} ${currentUser.profile.last_name}`
        : 'A coach';

      const response = await fetch('/api/awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedStaff.id,
          recipientName: selectedStaff.name,
          awardType: selectedAward,
          reason,
          giverId: currentUser?.id || null,
          giverName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to give award');
      }

      toast.success(`🏆 Award given to ${selectedStaff.name}!`);
      setShowModal(false);
      loadData(); // Refresh
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function getStaffNameById(id) {
    const s = staff.find((s) => s.id === id);
    return s?.name || 'Unknown';
  }

  function formatTimestamp(ts) {
    return new Date(ts).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return (
    <div>
      <PageHeader
        title="Staff Awards"
        subtitle="Recognize excellence. Celebrate greatness. 🏆"
        actions={
          <Badge variant="gold" style={{ fontSize: 'var(--text-sm)', padding: '6px 14px' }}>
            <Trophy size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {awards.length} Total Awards
          </Badge>
        }
      />

      {/* Staff Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card skeleton" style={{ height: 240 }} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
            {staff.map((coach, i) => {
              const awardCount = getAwardCountForStaff(coach.id);
              return (
                <motion.div
                  key={coach.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                >
                  <Card
                    style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => openAwardModal(coach)}
                  >
                    {/* Header gradient */}
                    <div style={{
                      height: 60,
                      background: awardCount > 0
                        ? 'linear-gradient(135deg, rgba(253,185,19,0.25), rgba(16,107,58,0.15))'
                        : 'linear-gradient(135deg, rgba(16,107,58,0.15), rgba(253,185,19,0.05))',
                      position: 'relative',
                    }}>
                      {awardCount > 0 && (
                        <div style={{
                          position: 'absolute', top: 8, right: 10,
                          background: 'rgba(253,185,19,0.2)',
                          border: '1px solid rgba(253,185,19,0.3)',
                          borderRadius: 'var(--radius-full)',
                          padding: '2px 10px',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--rocks-gold)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Trophy size={10} />
                          {awardCount}
                        </div>
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: -32 }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: coach.headshot_url
                          ? `url(${coach.headshot_url}) center/cover`
                          : 'linear-gradient(135deg, #106B3A, #009A44)',
                        border: '3px solid var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem', fontWeight: 800, color: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}>
                        {!coach.headshot_url && getInitials(coach.name)}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: 'var(--space-sm) var(--space-md) var(--space-lg)', textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 4 }}>
                        {coach.name}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-dim)',
                        marginBottom: 12,
                      }}>
                        {coach.title}
                        {coach.specialty && ` · ${coach.specialty}`}
                      </div>

                      {/* Recent awards for this staff */}
                      {awardCount > 0 && (
                        <div style={{
                          display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center',
                        }}>
                          {awards
                            .filter((a) => a.recipient_id === coach.id)
                            .slice(0, 4)
                            .map((a) => {
                              const awardInfo = AWARD_TYPES.find((t) => t.label === a.award_type);
                              return (
                                <span key={a.id} style={{
                                  fontSize: '1rem',
                                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                                }} title={a.award_type}>
                                  {awardInfo?.icon || '🏆'}
                                </span>
                              );
                            })}
                          {awardCount > 4 && (
                            <span style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-dim)',
                              alignSelf: 'center',
                            }}>
                              +{awardCount - 4}
                            </span>
                          )}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Gift size={14} />}
                        style={{ marginTop: 12, width: '100%' }}
                        onClick={(e) => { e.stopPropagation(); openAwardModal(coach); }}
                      >
                        Give Award
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Award History Feed */}
          <div style={{ marginTop: 'var(--space-2xl)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
              marginBottom: 'var(--space-lg)',
            }}>
              <Clock size={20} color="var(--rocks-gold)" />
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Award History</h2>
            </div>

            {awards.length === 0 ? (
              <EmptyState
                icon={<Trophy size={48} />}
                title="No Awards Yet"
                description="Click on a staff member above to give the first award and start celebrating your team!"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {awards.slice(0, 20).map((award, i) => {
                  const awardInfo = AWARD_TYPES.find((t) => t.label === award.award_type);
                  return (
                    <motion.div
                      key={award.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                    >
                      <Card hover={false} style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                      }}>
                        {/* Award icon */}
                        <div style={{
                          width: 44, height: 44, borderRadius: 'var(--radius-md)',
                          background: awardInfo?.color || 'rgba(253,185,19,0.1)',
                          border: `1px solid ${awardInfo?.border || 'rgba(253,185,19,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.25rem', flexShrink: 0,
                        }}>
                          {awardInfo?.icon || '🏆'}
                        </div>

                        {/* Award details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                              {getStaffNameById(award.recipient_id)}
                            </span>
                            <Badge variant="gold" style={{ fontSize: '0.65rem', padding: '1px 8px' }}>
                              {award.award_type}
                            </Badge>
                          </div>
                          {award.reason && (
                            <div style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-dim)',
                              marginTop: 2,
                              fontStyle: 'italic',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              &ldquo;{award.reason}&rdquo;
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-dim)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {formatTimestamp(award.created_at)}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Give Award Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedStaff ? `Award — ${selectedStaff.name}` : 'Give Award'}
        size="md"
      >
        {selectedStaff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Recipient info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              padding: 'var(--space-md)',
              background: 'rgba(16,107,58,0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16,107,58,0.15)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: selectedStaff.headshot_url
                  ? `url(${selectedStaff.headshot_url}) center/cover`
                  : 'linear-gradient(135deg, #106B3A, #009A44)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {!selectedStaff.headshot_url && getInitials(selectedStaff.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedStaff.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                  {selectedStaff.title}
                  {selectedStaff.specialty && ` · ${selectedStaff.specialty}`}
                </div>
              </div>
            </div>

            {/* Award type selection */}
            <div>
              <label className="form-label" style={{ marginBottom: 'var(--space-sm)', display: 'block' }}>
                Select Award
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--space-sm)',
              }}>
                {AWARD_TYPES.map((award) => (
                  <button
                    key={award.label}
                    onClick={() => setSelectedAward(award.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-sm) var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      border: selectedAward === award.label
                        ? '2px solid var(--rocks-gold)'
                        : '1px solid var(--border)',
                      background: selectedAward === award.label
                        ? 'rgba(253,185,19,0.1)'
                        : 'transparent',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: selectedAward === award.label ? 700 : 500,
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedAward !== award.label) {
                        e.currentTarget.style.background = 'var(--bg-glass)';
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAward !== award.label) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{award.icon}</span>
                    <span>{award.label.replace(/\s[\u{1F300}-\u{1FAD6}]/u, '')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label">Reason / Note (optional)</label>
              <textarea
                className="form-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What did they do to deserve this? Be specific..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Send size={16} />}
                loading={submitting}
                disabled={!selectedAward}
                onClick={handleGiveAward}
              >
                Give Award
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
