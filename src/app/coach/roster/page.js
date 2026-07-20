'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Filter, Grid3X3, List, Edit2, Trash2, Eye, X, Heart, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Camera } from 'lucide-react';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge, Modal, EmptyState } from '@/components/ui/index';
import { createClient, POSITION_LABELS, getPlayerAge, getUserWithProfile } from '@/lib/supabase';

const PHYSICAL_STATUS = {
  not_submitted: { label: 'No Physical', color: 'var(--red)', icon: XCircle },
  scheduled: { label: 'Scheduled', color: 'var(--amber)', icon: AlertTriangle },
  completed: { label: 'Cleared', color: 'var(--green)', icon: CheckCircle },
};
import toast from 'react-hot-toast';

export default function RosterPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [pendingPlayers, setPendingPlayers] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const isGMOrHC = currentUser?.role === 'General Manager' || currentUser?.role === 'Head Coach';

  useEffect(() => {
    loadPlayers();
    loadCurrentUser();
  }, []);

  async function loadPlayers() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('last_name', { ascending: true });
    if (!error) setPlayers(data || []);
    setLoading(false);
  }

  async function loadCurrentUser() {
    try {
      const { user, profile } = await getUserWithProfile();
      if (user) {
        let displayRole = 'Coach';
        if (profile) {
          if (profile.title) {
            displayRole = profile.title;
          } else if (profile.role === 'org_admin') {
            displayRole = 'General Manager';
          } else if (profile.role === 'coach') {
            displayRole = 'Coach';
          } else {
            displayRole = profile.role;
          }
        }
        const coachUser = {
          id: user.id,
          email: user.email,
          role: displayRole,
          name: profile ? `${profile.first_name} ${profile.last_name}` : 'Coach',
        };
        setCurrentUser(coachUser);
        loadPendingPlayers(coachUser);
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  }

  async function loadPendingPlayers(userObj) {
    const supabase = createClient();
    const isGMOrHCUser = userObj.role === 'General Manager' || userObj.role === 'Head Coach';
    let query = supabase.from('pending_players').select('*');
    if (!isGMOrHCUser) {
      query = query.eq('submitted_by', userObj.id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error) {
      setPendingPlayers(data || []);
    }
  }

  const filtered = players.filter(p => {
    const matchSearch = `${p.first_name} ${p.last_name} ${p.jersey_number || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === 'all' || p.position === posFilter;
    const matchProgram = programFilter === 'all' || (p.program_type || 'football') === programFilter;
    return matchSearch && matchPos && matchProgram;
  });

  // Compliance stats
  const complianceStats = {
    total: players.length,
    physicalCleared: players.filter(p => p.physical_status === 'completed').length,
    hasId: players.filter(p => p.has_state_id).length,
    regPaid: players.filter(p => p.registration_paid).length,
    football: players.filter(p => (p.program_type || 'football') === 'football').length,
    cheer: players.filter(p => p.program_type === 'cheerleading').length,
  };

  const positions = [...new Set(players.map(p => p.position).filter(Boolean))];

  async function handleDelete(id, isPending = false) {
    const text = isPending ? 'Remove this pending submission?' : 'Remove this player from the roster?';
    if (!confirm(text)) return;
    const supabase = createClient();
    if (isPending) {
      const { error } = await supabase.from('pending_players').delete().eq('id', id);
      if (error) { toast.error('Failed to remove pending player'); return; }
      toast.success('Pending submission removed');
    } else {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) { toast.error('Failed to remove player'); return; }
      toast.success('Player removed');
    }
    loadPlayers();
    if (currentUser) loadPendingPlayers(currentUser);
  }

  async function handleSave(formData) {
    const supabase = createClient();

    const cleanName = (str, isFirstName = false) => {
      if (!str) return '';
      const trimmed = str.trim();
      if (isFirstName && trimmed.toUpperCase() === 'TBD') {
        return '';
      }
      return trimmed
        .split(/([\s-]+)/)
        .map(part => {
          if (part.match(/[\s-]+/)) return part;
          if (!part) return '';
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('');
    };

    if (formData.first_name) formData.first_name = cleanName(formData.first_name, true);
    if (formData.last_name) formData.last_name = cleanName(formData.last_name, false);

    // Map weight_lbs correctly
    if (formData.weight_lbs) {
      formData.weight_lbs = parseFloat(formData.weight_lbs);
    } else {
      delete formData.weight_lbs;
    }

    if (editPlayer) {
      if (editPlayer.is_pending) {
        // Edit a pending player submission
        const { error } = await supabase
          .from('pending_players')
          .update(formData)
          .eq('id', editPlayer.id);
        if (error) { toast.error(error.message); return; }
        toast.success('Pending submission updated');
      } else {
        // Edit an active player
        if (isGMOrHC) {
          // GM/HC updates directly
          const { error } = await supabase
            .from('players')
            .update(formData)
            .eq('id', editPlayer.id);
          if (error) { toast.error(error.message); return; }
          toast.success('Player updated');
        } else {
          // Other coach proposes edit
          const payload = {
            ...formData,
            original_player_id: editPlayer.id,
            submitted_by: currentUser?.id,
            submitted_by_name: currentUser?.name || 'Coach',
            status: 'pending'
          };
          const { error } = await supabase
            .from('pending_players')
            .insert(payload);
          if (error) { toast.error(error.message); return; }
          toast.success('Proposed changes submitted for GM/Head Coach approval!');
        }
      }
    } else {
      // Add a new player
      if (isGMOrHC) {
        // GM/HC adds directly
        const { error } = await supabase
          .from('players')
          .insert(formData);
        if (error) { toast.error(error.message); return; }
        toast.success('Player added directly to roster!');
      } else {
        // Other coach submits for approval
        const payload = {
          ...formData,
          original_player_id: null,
          submitted_by: currentUser?.id,
          submitted_by_name: currentUser?.name || 'Coach',
          status: 'pending'
        };
        const { error } = await supabase
          .from('pending_players')
          .insert(payload);
        if (error) { toast.error(error.message); return; }
        toast.success('Player submitted to GM/Head Coach for approval!');
      }
    }
    setShowAddModal(false);
    setEditPlayer(null);
    loadPlayers();
    if (currentUser) loadPendingPlayers(currentUser);
  }

  async function handleApprove(pendingPlayer) {
    setApprovingId(pendingPlayer.id);
    const supabase = createClient();
    try {
      // Exclude metadata fields when inserting/updating the players table
      const { id, original_player_id, submitted_by, submitted_by_name, status, created_at, ...playerPayload } = pendingPlayer;
      
      if (original_player_id) {
        // This is a proposed edit
        const { error: updateError } = await supabase
          .from('players')
          .update(playerPayload)
          .eq('id', original_player_id);
          
        if (updateError) throw updateError;
        
        // Remove from pending_players
        const { error: deleteError } = await supabase
          .from('pending_players')
          .delete()
          .eq('id', pendingPlayer.id);
          
        if (deleteError) throw deleteError;
        
        toast.success(`🏈 Approved edits for ${pendingPlayer.first_name} ${pendingPlayer.last_name}!`);
      } else {
        // This is a proposed new addition
        const { error: insertError } = await supabase
          .from('players')
          .insert(playerPayload);
          
        if (insertError) throw insertError;
        
        // Remove from pending_players
        const { error: deleteError } = await supabase
          .from('pending_players')
          .delete()
          .eq('id', pendingPlayer.id);
          
        if (deleteError) throw deleteError;
        
        toast.success(`🏈 Approved: ${pendingPlayer.first_name} ${pendingPlayer.last_name} added to active roster!`);
      }
      
      loadPlayers();
      if (currentUser) loadPendingPlayers(currentUser);
    } catch (err) {
      toast.error(`Approval failed: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(pendingPlayer) {
    if (!confirm(`Reject changes for ${pendingPlayer.first_name} ${pendingPlayer.last_name}?`)) return;
    setRejectingId(pendingPlayer.id);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('pending_players')
        .delete()
        .eq('id', pendingPlayer.id);
        
      if (error) throw error;
      toast.success('Proposed changes rejected and removed.');
      if (currentUser) loadPendingPlayers(currentUser);
    } catch (err) {
      toast.error(`Rejection failed: ${err.message}`);
    } finally {
      setRejectingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Team Roster"
        subtitle={`${complianceStats.football} football · ${complianceStats.cheer} cheer · ${players.length} total`}
        actions={
          <Button 
            variant="primary" 
            icon={<Plus size={16} />} 
            onClick={() => { setEditPlayer(null); setShowAddModal(true); }}
          >
            {isGMOrHC ? 'Add Player' : 'Propose Player'}
          </Button>
        }
      />

      {/* Pending Approvals Panel (GM/HC only) */}
      {isGMOrHC && pendingPlayers.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--rocks-gold)', background: 'rgba(253, 185, 19, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-sm)' }}>
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--rocks-gold)' }}>
              Pending Roster Approvals ({pendingPlayers.length})
            </h3>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginLeft: 'auto' }}>
              Requires GM or Head Coach approval
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {pendingPlayers.map(pending => {
              const isEdit = !!pending.original_player_id;
              return (
                <div 
                  key={pending.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: 'var(--space-md)', 
                    background: 'var(--bg-glass)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: 'var(--space-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <Avatar src={pending.photo_url} name={`${pending.first_name} ${pending.last_name}`} size={40} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                          {((pending.first_name ? pending.first_name + ' ' : '') + pending.last_name).trim()}
                        </span>
                        <Badge variant={isEdit ? 'amber' : 'green'} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          {isEdit ? 'Proposed Edit' : 'New Player Request'}
                        </Badge>
                        {pending.jersey_number && (
                          <span style={{ color: 'var(--rocks-green-light)', fontWeight: 800, fontSize: 'var(--text-xs)' }}>
                            #{pending.jersey_number}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 4 }}>
                        {pending.program_type === 'cheerleading' ? '📣 Cheerleading' : '🏈 Football'}
                        {pending.position && ` · Pos: ${pending.position}`}
                        {pending.weight_lbs && ` · ${pending.weight_lbs} lbs`}
                        {pending.date_of_birth && ` · Age ${getPlayerAge(pending.date_of_birth)}`}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>👤 Submitted by: <strong>{pending.submitted_by_name || 'Coach'}</strong></span>
                        <span>·</span>
                        <span>{new Date(pending.created_at).toLocaleDateString()}</span>
                      </div>
                      {pending.notes && (
                        <div style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: 4, marginTop: 6, borderLeft: '2px solid var(--border-light)' }}>
                          &ldquo;{pending.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={<Eye size={12} />} 
                      onClick={() => { setSelectedPlayer(pending); setShowViewModal(true); }}
                    >
                      Inspect
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      icon={<CheckCircle size={12} />} 
                      loading={approvingId === pending.id}
                      onClick={() => handleApprove(pending)}
                      style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={<XCircle size={12} />} 
                      loading={rejectingId === pending.id}
                      onClick={() => handleReject(pending)}
                      style={{ color: 'var(--red)' }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* My Pending Submissions (Non-GM/HC coaches only) */}
      {!isGMOrHC && pendingPlayers.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
            <span style={{ fontSize: '1.25rem' }}>⏳</span>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>
              My Pending Submissions ({pendingPlayers.length})
            </h3>
            <Badge variant="gold" style={{ fontSize: '0.65rem', marginLeft: 'auto' }}>Awaiting Approval</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {pendingPlayers.map(pending => {
              const isEdit = !!pending.original_player_id;
              return (
                <div 
                  key={pending.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: 'var(--space-sm) var(--space-md)', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {pending.first_name} {pending.last_name}
                      </span>
                      <Badge variant={isEdit ? 'amber' : 'green'} style={{ fontSize: '0.6rem', padding: '0px 4px' }}>
                        {isEdit ? 'Proposed Edit' : 'New Player'}
                      </Badge>
                      {pending.jersey_number && <span style={{ color: 'var(--rocks-green-light)', fontWeight: 700 }}>#{pending.jersey_number}</span>}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 2 }}>
                      {pending.program_type === 'cheerleading' ? '📣 Cheerleading' : '🏈 Football'}
                      {pending.position && ` · Pos: ${pending.position}`}
                      {pending.weight_lbs && ` · ${pending.weight_lbs} lbs`}
                      {pending.date_of_birth && ` · Age ${getPlayerAge(pending.date_of_birth)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={<Edit2 size={12} />} 
                      onClick={() => { 
                        setEditPlayer({ ...pending, is_pending: true }); 
                        setShowAddModal(true); 
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={<Trash2 size={12} />} 
                      onClick={() => handleDelete(pending.id, true)}
                      style={{ color: 'var(--red)' }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Compliance Summary Bar */}
      {players.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compliance</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color={complianceStats.physicalCleared === complianceStats.total ? 'var(--green)' : 'var(--amber)'} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{complianceStats.physicalCleared}/{complianceStats.total}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Physicals</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} color={complianceStats.hasId === complianceStats.total ? 'var(--green)' : 'var(--amber)'} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{complianceStats.hasId}/{complianceStats.total}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>State IDs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} color={complianceStats.regPaid === complianceStats.total ? 'var(--green)' : 'var(--amber)'} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{complianceStats.regPaid}/{complianceStats.total}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Registered</span>
            </div>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <Card style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <select className="form-input" value={programFilter} onChange={e => setProgramFilter(e.target.value)} style={{ width: 130 }}>
            <option value="all">All Programs</option>
            <option value="football">🏈 Football</option>
            <option value="cheerleading">📣 Cheer</option>
          </select>
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
                <Avatar src={player.photo_url} name={`${player.first_name} ${player.last_name}`} size={64} />
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{((player.first_name ? player.first_name + ' ' : '') + player.last_name).trim()}</div>
                  {player.jersey_number && <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--rocks-green-light)', marginTop: 4 }}>#{player.jersey_number}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {player.position && <PositionBadge position={player.position} />}
                  {player.secondary_position && <span style={{ opacity: 0.7 }}><PositionBadge position={player.secondary_position} /></span>}
                  {player.tertiary_position && <span style={{ opacity: 0.45 }}><PositionBadge position={player.tertiary_position} /></span>}
                  {player.date_of_birth && <Badge variant="blue">Age {getPlayerAge(player.date_of_birth)}</Badge>}
                  {player.program_type === 'cheerleading' && <Badge variant="purple">📣 Cheer</Badge>}
                </div>
                {/* Compliance dots */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
                  <span title={`Physical: ${PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.label}`} style={{ width: 8, height: 8, borderRadius: '50%', background: PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.color }} />
                  <span title={player.has_state_id ? 'ID: ✓' : 'ID: Missing'} style={{ width: 8, height: 8, borderRadius: '50%', background: player.has_state_id ? 'var(--green)' : 'var(--red)' }} />
                  <span title={player.registration_paid ? 'Reg: Paid' : 'Reg: Unpaid'} style={{ width: 8, height: 8, borderRadius: '50%', background: player.registration_paid ? 'var(--green)' : 'var(--red)' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
                  <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => { setSelectedPlayer(player); setShowViewModal(true); }}>View</Button>
                  <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => { setEditPlayer(player); setShowAddModal(true); }}>Edit</Button>
                  {isGMOrHC && (
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(player.id)} style={{ color: 'var(--red)' }} />
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Player</th><th>Program</th><th>Position</th><th>Physical</th><th>ID</th><th>Reg</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(player => (
                  <tr key={player.id}>
                    <td style={{ fontWeight: 800, color: 'var(--rocks-green-light)' }}>{player.jersey_number || '—'}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Avatar src={player.photo_url} name={`${player.first_name} ${player.last_name}`} size={32} /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{((player.first_name ? player.first_name + ' ' : '') + player.last_name).trim()}</span></div></td>
                    <td><Badge variant={(player.program_type || 'football') === 'football' ? 'green' : 'purple'}>{(player.program_type || 'football') === 'football' ? '🏈' : '📣'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {player.position ? <PositionBadge position={player.position} /> : '—'}
                        {player.secondary_position && <span style={{ opacity: 0.7 }}><PositionBadge position={player.secondary_position} /></span>}
                        {player.tertiary_position && <span style={{ opacity: 0.45 }}><PositionBadge position={player.tertiary_position} /></span>}
                      </div>
                    </td>
                    <td><span style={{ color: PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.color, fontWeight: 600, fontSize: 'var(--text-xs)' }}>{PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.label}</span></td>
                    <td>{player.has_state_id ? <CheckCircle size={14} color="var(--green)" /> : <XCircle size={14} color="var(--red)" />}</td>
                    <td>{player.registration_paid ? <CheckCircle size={14} color="var(--green)" /> : <XCircle size={14} color="var(--red)" />}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setSelectedPlayer(player); setShowViewModal(true); }} title="View Profile"><Eye size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditPlayer(player); setShowAddModal(true); }} title="Edit Profile"><Edit2 size={14} /></button>
                        {isGMOrHC && (
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(player.id)} style={{ color: 'var(--red)' }} title="Remove Player"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* View Details Modal */}
      <Modal 
        isOpen={showViewModal} 
        onClose={() => { setShowViewModal(false); setSelectedPlayer(null); }} 
        title="Player Profile Details" 
        size="md"
      >
        {selectedPlayer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-md)' }}>
              <Avatar src={selectedPlayer.photo_url} name={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} size={64} />
              <div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>
                  {((selectedPlayer.first_name ? selectedPlayer.first_name + ' ' : '') + selectedPlayer.last_name).trim()}
                </h3>
                {selectedPlayer.jersey_number && (
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--rocks-green-light)' }}>
                    #{selectedPlayer.jersey_number}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  {selectedPlayer.position && <PositionBadge position={selectedPlayer.position} />}
                  {selectedPlayer.secondary_position && <span style={{ opacity: 0.7 }}><PositionBadge position={selectedPlayer.secondary_position} /></span>}
                  {selectedPlayer.tertiary_position && <span style={{ opacity: 0.45 }}><PositionBadge position={selectedPlayer.tertiary_position} /></span>}
                  <Badge variant={(selectedPlayer.program_type || 'football') === 'football' ? 'green' : 'purple'}>
                    {(selectedPlayer.program_type || 'football') === 'football' ? '🏈 Football' : '📣 Cheerleading'}
                  </Badge>
                  {selectedPlayer.date_of_birth && (
                    <Badge variant="blue">Age {getPlayerAge(selectedPlayer.date_of_birth)}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Date of Birth</h4>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  {selectedPlayer.date_of_birth ? new Date(selectedPlayer.date_of_birth).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Weight</h4>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  {selectedPlayer.weight_lbs ? `${selectedPlayer.weight_lbs} lbs` : 'Not set'}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Secondary Position</h4>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  {selectedPlayer.secondary_position || 'None'}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Tertiary Position</h4>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  {selectedPlayer.tertiary_position || 'None'}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-md)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--rocks-green-light)', marginBottom: 'var(--space-sm)' }}>
                📋 Compliance Status
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 4 }}>
                  <ShieldCheck size={16} color={selectedPlayer.physical_status === 'completed' ? 'var(--green)' : 'var(--amber)'} />
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Physical</div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      {selectedPlayer.physical_status === 'completed' ? 'Cleared' : selectedPlayer.physical_status === 'scheduled' ? 'Scheduled' : 'Missing'}
                      {selectedPlayer.physical_date && ` (${new Date(selectedPlayer.physical_date).toLocaleDateString()})`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 4 }}>
                  <CheckCircle size={16} color={selectedPlayer.has_state_id ? 'var(--green)' : 'var(--red)'} />
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>State ID / Passport</div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      {selectedPlayer.has_state_id ? 'Submitted & Verified' : 'Missing'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 4, gridColumn: 'span 2' }}>
                  <CheckCircle size={16} color={selectedPlayer.registration_paid ? 'var(--green)' : 'var(--red)'} />
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Registration Payment</div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      {selectedPlayer.registration_paid ? 'Paid' : 'Unpaid'}
                      {selectedPlayer.registration_date && ` on ${new Date(selectedPlayer.registration_date).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-md)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--rocks-gold)', marginBottom: 'var(--space-sm)' }}>
                Guardian / Contact Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                  <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Guardian Name</h4>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {selectedPlayer.guardian_name || 'Not set'}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Phone Number</h4>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {selectedPlayer.guardian_phone || 'Not set'}
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Email Address</h4>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {selectedPlayer.guardian_email || 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            {selectedPlayer.notes && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-md)' }}>
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Internal Notes</h4>
                <p style={{ fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 6, border: '1px dashed var(--border-light)' }}>
                  {selectedPlayer.notes}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <Button variant="primary" onClick={() => { setShowViewModal(false); setSelectedPlayer(null); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
    weight_lbs: player?.weight_lbs || player?.weight || '',
    program_type: player?.program_type || 'football',
    physical_status: player?.physical_status || 'not_submitted',
    physical_date: player?.physical_date || '',
    has_state_id: player?.has_state_id || false,
    registration_paid: player?.registration_paid || false,
    guardian_name: player?.guardian_name || '',
    guardian_phone: player?.guardian_phone || '',
    guardian_email: player?.guardian_email || '',
    notes: player?.notes || '',
    secondary_position: player?.secondary_position || '',
    tertiary_position: player?.tertiary_position || '',
    photo_url: player?.photo_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(filePath);

      update('photo_url', publicUrl);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name && !form.last_name) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = { ...form };
    if (payload.jersey_number) payload.jersey_number = parseInt(payload.jersey_number);
    if (payload.weight_lbs) payload.weight_lbs = parseFloat(payload.weight_lbs);
    else delete payload.weight_lbs;
    if (!payload.jersey_number) delete payload.jersey_number;
    await onSave(payload);
    setSaving(false);
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Photo Upload Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)' }}>
        <div style={{ position: 'relative', width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '2px solid var(--border)' }}>
          {form.photo_url ? (
            <img src={form.photo_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--text-muted)' }}>
              🏈
            </div>
          )}
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)' }}>
              Uploading...
            </div>
          )}
        </div>
        <label className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <Camera size={14} />
          {form.photo_url ? 'Change Photo' : 'Upload Photo'}
          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploading || saving} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="TBD or First Name" /></div>
        <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">Jersey #</label><input className="form-input" type="number" value={form.jersey_number} onChange={e => update('jersey_number', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Position (Primary)</label>
          <select className="form-input" value={form.position} onChange={e => update('position', e.target.value)}>
            <option value="">Select...</option>
            {Object.entries(POSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Position (Secondary)</label>
          <select className="form-input" value={form.secondary_position} onChange={e => update('secondary_position', e.target.value)}>
            <option value="">None</option>
            {Object.entries(POSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Position (Tertiary)</label>
          <select className="form-input" value={form.tertiary_position} onChange={e => update('tertiary_position', e.target.value)}>
            <option value="">None</option>
            {Object.entries(POSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Weight (lbs)</label><input className="form-input" type="number" value={form.weight_lbs} onChange={e => update('weight_lbs', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Program</label>
          <select className="form-input" value={form.program_type} onChange={e => update('program_type', e.target.value)}>
            <option value="football">🏈 Football ($175)</option>
            <option value="cheerleading">📣 Cheerleading ($100)</option>
          </select>
        </div>
      </div>
      {/* Compliance Section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--rocks-green-light)' }}>📋 Compliance</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group"><label className="form-label">Physical Status</label>
            <select className="form-input" value={form.physical_status} onChange={e => update('physical_status', e.target.value)}>
              <option value="not_submitted">❌ Not Submitted</option>
              <option value="scheduled">📅 Scheduled</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Physical Date</label><input className="form-input" type="date" value={form.physical_date} onChange={e => update('physical_date', e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.has_state_id} onChange={e => update('has_state_id', e.target.checked)} style={{ width: 16, height: 16 }} />
              Has State ID / Passport
            </label>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.registration_paid} onChange={e => update('registration_paid', e.target.checked)} style={{ width: 16, height: 16 }} />
              Registration Paid ({form.program_type === 'cheerleading' ? '$100' : '$175'})
            </label>
          </div>
        </div>
      </div>
      {/* Guardian Section */}
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
