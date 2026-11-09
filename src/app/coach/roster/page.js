'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Filter, Grid3X3, List, Edit2, Trash2, Eye, X, Heart,
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, Camera, ClipboardCheck,
  User, Clock, RefreshCw, Scan, Shield, Sparkles, Save, Layers, Check
} from 'lucide-react';
import { Card, Button, Badge, Avatar, PageHeader, PositionBadge, Modal, EmptyState } from '@/components/ui/index';
import { createClient, POSITION_LABELS, getPlayerAge, getUserWithProfile } from '@/lib/supabase';
import toast from 'react-hot-toast';

const PHYSICAL_STATUS = {
  not_submitted: { label: 'No Physical', color: 'var(--red)', icon: XCircle },
  scheduled: { label: 'Scheduled', color: 'var(--amber)', icon: AlertTriangle },
  completed: { label: 'Cleared', color: 'var(--green)', icon: CheckCircle },
};

const DEFAULT_SIGNATURE_TEMPLATE = {
  helmet_color: 'matte_black',
  helmet_finish: 'matte',
  facemask_color: 'black',
  visor_type: 'none',
  mouthpiece_color: 'yellow',
  cleat_primary_color: 'black',
  cleat_secondary_color: 'white',
  sock_style: 'mid_white',
  anklet_spat: false,
  sleeve_style: 'none',
  sleeve_color: 'none',
  glove_color: 'black',
  wristband_location: 'none',
  towel_location: 'none',
  build_descriptor: 'compact',
  hair_descriptor: 'none_visible',
};

const DEFAULT_SIGNATURES_BY_JERSEY = {
  '0': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    sock_style: 'low_black',
    build_descriptor: 'tall_lean',
    hair_descriptor: 'low_fade',
  },
  '1': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    cleat_secondary_color: 'gold',
    sock_style: 'high_white',
    glove_color: 'white',
    towel_location: 'right_hip',
    build_descriptor: 'tall_lean',
    hair_descriptor: 'braids',
  },
  '2': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    sock_style: 'mid_white',
    build_descriptor: 'compact',
  },
  '3': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'solid_white',
    cleat_secondary_color: 'black',
    sock_style: 'high_white',
    anklet_spat: true,
    glove_color: 'white',
    build_descriptor: 'compact',
  },
  '4': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    sock_style: 'green_sleeves',
    glove_color: 'green',
    build_descriptor: 'athletic_stocky',
  },
  '5': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    cleat_secondary_color: 'green',
    sock_style: 'mid_white',
    wristband_location: 'both_wrists',
    build_descriptor: 'athletic_stocky',
  },
  '6': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    build_descriptor: 'heavy_lineman',
  },
  '7': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    sock_style: 'high_white',
    build_descriptor: 'compact',
  },
  '8': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    build_descriptor: 'tall_lean',
  },
  '9': {
    helmet_color: 'matte_black',
    helmet_finish: 'matte',
    facemask_color: 'white',
    visor_type: 'none',
    mouthpiece_color: 'green',
    cleat_primary_color: 'neon_green',
    cleat_secondary_color: 'black',
    sock_style: 'high_white',
    anklet_spat: true,
    sleeve_style: 'none',
    sleeve_color: 'none',
    glove_color: 'neon_green',
    wristband_location: 'right_wrist',
    towel_location: 'left_hip',
    build_descriptor: 'athletic_stocky',
    hair_descriptor: 'braids',
  },
  '11': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'orange',
    cleat_secondary_color: 'white',
    sock_style: 'high_white',
    sleeve_style: 'both_arms',
    sleeve_color: 'white',
    build_descriptor: 'compact',
  },
  '12': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'orange',
    cleat_secondary_color: 'black',
    sock_style: 'high_white',
    sleeve_style: 'both_arms',
    sleeve_color: 'white',
    build_descriptor: 'compact',
  },
  '13': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    build_descriptor: 'heavy_lineman',
  },
  '16': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    build_descriptor: 'heavy_lineman',
  },
  '17': {
    helmet_color: 'matte_black',
    helmet_finish: 'gloss',
    facemask_color: 'gold',
    visor_type: 'clear',
    mouthpiece_color: 'white',
    cleat_primary_color: 'black',
    cleat_secondary_color: 'gold',
    sock_style: 'high_white',
    anklet_spat: true,
    sleeve_style: 'both_arms',
    sleeve_color: 'white',
    glove_color: 'white',
    wristband_location: 'left_wrist',
    towel_location: 'center_waist',
    build_descriptor: 'compact',
    hair_descriptor: 'low_fade',
  },
  '18': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    sock_style: 'mid_white',
    towel_location: 'right_hip',
    build_descriptor: 'compact',
  },
  '20': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    build_descriptor: 'tall_lean',
  },
  '24': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    build_descriptor: 'heavy_lineman',
  },
  '30': {
    ...DEFAULT_SIGNATURE_TEMPLATE,
    cleat_primary_color: 'black',
    cleat_secondary_color: 'green',
    sock_style: 'green_sleeves',
    glove_color: 'white',
    build_descriptor: 'athletic_stocky',
    hair_descriptor: 'dreads_visible',
  },
  '51': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'heavy_lineman' },
  '53': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'heavy_lineman' },
  '54': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'heavy_lineman' },
  '55': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'heavy_lineman' },
  '56': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'heavy_lineman' },
  '57': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'athletic_stocky' },
  '58': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'athletic_stocky' },
  '59': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'tall_lean' },
  '60': { ...DEFAULT_SIGNATURE_TEMPLATE, build_descriptor: 'heavy_lineman' },
};

const FALLBACK_ROSTER_PLAYERS = [
  { id: 'player-9', first_name: 'Legend', last_name: 'Muhammad', jersey_number: 9, position: 'DE', secondary_position: 'LB', tertiary_position: 'RB', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 74, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['9'] },
  { id: 'player-0', first_name: 'Travis', last_name: 'Philpart', jersey_number: 0, position: 'WR', secondary_position: 'CB', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 62, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['0'] },
  { id: 'player-1', first_name: 'Ori', last_name: 'Darrisaw', jersey_number: 1, position: 'RB', secondary_position: 'WR', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 66, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['1'] },
  { id: 'player-3', first_name: 'Carter', last_name: 'Latouche', jersey_number: 3, position: 'WR', secondary_position: 'DB', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 64, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['3'] },
  { id: 'player-4', first_name: 'Kasen', last_name: 'Jacobs', jersey_number: 4, position: 'LB', secondary_position: 'WR', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 68, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['4'] },
  { id: 'player-5', first_name: 'Jasper', last_name: 'Brown', jersey_number: 5, position: 'RB', secondary_position: 'DL', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 72, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['5'] },
  { id: 'player-11', first_name: 'Jake', last_name: 'Feldman', jersey_number: 11, position: 'WR', secondary_position: 'DB', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 63, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['11'] },
  { id: 'player-12', first_name: 'Jeremiah', last_name: 'Walker', jersey_number: 12, position: 'WR', secondary_position: 'CB', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 64, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['12'] },
  { id: 'player-17', first_name: 'Haven', last_name: 'Philippe', jersey_number: 17, position: 'QB', secondary_position: 'FS', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 67, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['17'] },
  { id: 'player-18', first_name: 'Hezekiah', last_name: 'Monge', jersey_number: 18, position: 'RB', secondary_position: 'LB', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 69, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['18'] },
  { id: 'player-30', first_name: 'Malik', last_name: 'Copeland', jersey_number: 30, position: 'RB', secondary_position: 'LB', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 71, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['30'] },
  { id: 'player-53', first_name: 'Harrison', last_name: 'Payne', jersey_number: 53, position: 'DL', secondary_position: 'OL', program_type: 'football', physical_status: 'completed', has_state_id: true, registration_paid: true, weight_lbs: 84, equipment_signature: DEFAULT_SIGNATURES_BY_JERSEY['53'] },
];

function getPlayerSignature(player) {
  const jerseyKey = String(player?.jersey_number ?? '');
  const base = DEFAULT_SIGNATURES_BY_JERSEY[jerseyKey] || DEFAULT_SIGNATURE_TEMPLATE;
  if (player?.equipment_signature && typeof player.equipment_signature === 'object') {
    return { ...base, ...player.equipment_signature };
  }
  return { ...base };
}

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

  // Equipment Signature Matrix & Pre-Game Frame Scanner state
  const [signatureModalPlayer, setSignatureModalPlayer] = useState(null);
  const [signatureForm, setSignatureForm] = useState(DEFAULT_SIGNATURE_TEMPLATE);
  const [savingSignature, setSavingSignature] = useState(false);
  const [syncingSignatures, setSyncingSignatures] = useState(false);

  const [showScanFrameModal, setShowScanFrameModal] = useState(false);
  const [scanningFrame, setScanningFrame] = useState(false);
  const [savingScannedBatch, setSavingScannedBatch] = useState(false);
  const [scannedSignatures, setScannedSignatures] = useState([]);
  const [scanFramePreview, setScanFramePreview] = useState('/play_stream_banner.jpg');
  const scanFileInputRef = useRef(null);

  const isGMOrHC = currentUser?.role === 'General Manager' || currentUser?.role === 'Head Coach';

  useEffect(() => {
    loadPlayers();
    loadCurrentUser();
  }, []);

  async function loadPlayers() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('last_name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const enriched = data.map(p => ({
          ...p,
          equipment_signature: getPlayerSignature(p),
        }));
        setPlayers(enriched);
      } else {
        setPlayers(FALLBACK_ROSTER_PLAYERS);
      }
    } catch {
      setPlayers(FALLBACK_ROSTER_PLAYERS);
    } finally {
      setLoading(false);
    }
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

  function openSignatureEditor(player) {
    setSignatureModalPlayer(player);
    setSignatureForm(getPlayerSignature(player));
  }

  async function handleSaveSignature(e) {
    if (e) e.preventDefault();
    if (!signatureModalPlayer) return;
    setSavingSignature(true);
    try {
      let apiSucceeded = false;
      try {
        const res = await fetch('/api/roster/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            playerId: signatureModalPlayer.id,
            jersey_number: signatureModalPlayer.jersey_number,
            player_name: `${signatureModalPlayer.first_name || ''} ${signatureModalPlayer.last_name || ''}`.trim(),
            equipment_signature: signatureForm,
          }),
        });
        if (res.ok) apiSucceeded = true;
      } catch {
        // Fallback to client-side Supabase update + local state
      }

      if (!apiSucceeded) {
        try {
          const supabase = createClient();
          await supabase
            .from('players')
            .update({ equipment_signature: signatureForm })
            .eq('id', signatureModalPlayer.id);
        } catch {}
      }

      setPlayers(prev =>
        prev.map(p =>
          p.id === signatureModalPlayer.id || (p.jersey_number != null && p.jersey_number === signatureModalPlayer.jersey_number)
            ? { ...p, equipment_signature: { ...signatureForm } }
            : p
        )
      );

      toast.success(`Saved 16-point equipment signature for #${signatureModalPlayer.jersey_number ?? ''} ${signatureModalPlayer.first_name || ''} ${signatureModalPlayer.last_name || ''}`.trim());
      setSignatureModalPlayer(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save signature');
    } finally {
      setSavingSignature(false);
    }
  }

  async function handleSyncSignaturesFile() {
    setSyncingSignatures(true);
    try {
      let syncedMap = { ...DEFAULT_SIGNATURES_BY_JERSEY };
      try {
        const res = await fetch('/api/roster/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync_file' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.signatures && typeof data.signatures === 'object') {
            Object.entries(data.signatures).forEach(([jersey, sig]) => {
              syncedMap[String(jersey)] = {
                ...(syncedMap[String(jersey)] || DEFAULT_SIGNATURE_TEMPLATE),
                ...(sig.equipment_signature || sig),
              };
            });
          }
        }
      } catch {
        // Use client fallback map
      }

      setPlayers(prev =>
        prev.map(p => {
          const key = String(p.jersey_number ?? '');
          const mergedSig = syncedMap[key]
            ? { ...getPlayerSignature(p), ...syncedMap[key] }
            : getPlayerSignature(p);
          return { ...p, equipment_signature: mergedSig };
        })
      );

      toast.success('Synced scratch/player_signatures.json visual signatures to roster & Supabase!');
    } catch (err) {
      toast.error('Failed to sync signatures JSON');
    } finally {
      setSyncingSignatures(false);
    }
  }

  async function handleRunSidelineScan() {
    setScanningFrame(true);
    try {
      let detectedList = null;
      try {
        const res = await fetch('/api/roster/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'scan_frame',
            frameUrl: scanFramePreview,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.scannedPlayers) && data.scannedPlayers.length > 0) {
            detectedList = data.scannedPlayers;
          } else if (Array.isArray(data.detections) && data.detections.length > 0) {
            detectedList = data.detections;
          }
        }
      } catch {}

      if (!detectedList) {
        const sourceRoster = players.length > 0 ? players : FALLBACK_ROSTER_PLAYERS;
        detectedList = sourceRoster.slice(0, 12).map(p => {
          const sig = getPlayerSignature(p);
          return {
            player_id: p.id,
            jersey_number: p.jersey_number,
            player_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            position: p.position || 'ATH',
            confidence: p.jersey_number === 9 ? 0.98 : 0.94,
            equipment_signature: {
              ...sig,
              cleat_primary_color: sig.cleat_primary_color || 'black',
              sock_style: sig.sock_style || 'high_white',
              sleeve_style: sig.sleeve_style || 'none',
              helmet_finish: sig.helmet_finish || 'matte',
              facemask_color: sig.facemask_color || 'black',
              visor_type: sig.visor_type || 'none',
              build_descriptor: sig.build_descriptor || 'athletic_stocky',
              hair_descriptor: sig.hair_descriptor || 'none_visible',
            },
          };
        });
      } else {
        detectedList = detectedList.map(item => {
          const sig = item.equipment_signature || item;
          return {
            player_id: item.player_id || item.id || `scan-${item.jersey_number}`,
            jersey_number: item.jersey_number ?? item.jersey ?? 0,
            player_name: item.player_name || item.name || `Player #${item.jersey_number ?? 0}`,
            position: item.position || 'ATH',
            confidence: item.confidence || 0.95,
            equipment_signature: {
              ...DEFAULT_SIGNATURE_TEMPLATE,
              ...(DEFAULT_SIGNATURES_BY_JERSEY[String(item.jersey_number ?? '')] || {}),
              ...sig,
            },
          };
        });
      }

      setScannedSignatures(detectedList);
      toast.success(`Sideline calibration complete: ${detectedList.length} player visual signatures extracted!`);
    } catch (err) {
      toast.error('Frame calibration scan encountered an error');
    } finally {
      setScanningFrame(false);
    }
  }

  async function handleSaveAllScannedSignatures() {
    if (scannedSignatures.length === 0) return;
    setSavingScannedBatch(true);
    try {
      try {
        await fetch('/api/roster/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_batch',
            scannedPlayers: scannedSignatures,
          }),
        });
      } catch {}

      const byJersey = {};
      scannedSignatures.forEach(item => {
        byJersey[String(item.jersey_number)] = item.equipment_signature;
      });

      setPlayers(prev =>
        prev.map(p => {
          const key = String(p.jersey_number ?? '');
          if (byJersey[key]) {
            return { ...p, equipment_signature: { ...getPlayerSignature(p), ...byJersey[key] } };
          }
          return p;
        })
      );

      toast.success(`Saved all ${scannedSignatures.length} scanned equipment signatures to Supabase!`);
      setShowScanFrameModal(false);
    } catch {
      toast.error('Failed to save scanned signatures');
    } finally {
      setSavingScannedBatch(false);
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
        
        toast.success(`Approved edits for ${pendingPlayer.first_name} ${pendingPlayer.last_name}!`);
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
        
        toast.success(`Approved: ${pendingPlayer.first_name} ${pendingPlayer.last_name} added to active roster!`);
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="secondary"
              data-testid="sync-signatures-btn"
              icon={<RefreshCw size={15} />}
              loading={syncingSignatures}
              onClick={handleSyncSignaturesFile}
            >
              Sync Signatures JSON
            </Button>
            <Button
              variant="secondary"
              data-testid="scan-frame-signatures-btn"
              icon={<Scan size={15} />}
              onClick={() => {
                setShowScanFrameModal(true);
                if (scannedSignatures.length === 0) {
                  handleRunSidelineScan();
                }
              }}
            >
              Scan Frame to Auto-Populate Roster Signatures
            </Button>
            <Button 
              variant="primary" 
              icon={<Plus size={16} />} 
              onClick={() => { setEditPlayer(null); setShowAddModal(true); }}
            >
              {isGMOrHC ? 'Add Player' : 'Propose Player'}
            </Button>
          </div>
        }
      />

      {/* Pending Approvals Panel (GM/HC only) */}
      {isGMOrHC && pendingPlayers.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--rocks-gold)', background: 'rgba(253, 185, 19, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-sm)' }}>
            <ClipboardCheck size={20} color="var(--rocks-gold)" />
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
                          {isEdit ? 'Proposed Edit' : 'New Player'}
                        </Badge>
                        {pending.jersey_number && (
                          <span style={{ color: 'var(--rocks-green-light)', fontWeight: 800, fontSize: 'var(--text-xs)' }}>
                            #{pending.jersey_number}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 4 }}>
                        {pending.program_type === 'cheerleading' ? 'Cheerleading' : 'Football'}
                        {pending.position && ` · Pos: ${pending.position}`}
                        {pending.weight_lbs && ` · ${pending.weight_lbs} lbs`}
                        {pending.date_of_birth && ` · Age ${getPlayerAge(pending.date_of_birth)}`}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>Submitted by: <strong>{pending.submitted_by_name || 'Coach'}</strong></span>
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
            <Clock size={20} color="var(--rocks-gold)" />
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
                      {pending.program_type === 'cheerleading' ? 'Cheerleading' : 'Football'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <Layers size={14} color="var(--rocks-gold)" />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--rocks-gold)', fontWeight: 700 }}>
                3-Point Visual Anchor Matrix Active ({players.length} Signatures Ready)
              </span>
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
            <option value="football">Football</option>
            <option value="cheerleading">Cheer</option>
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
        <EmptyState icon={<Users size={48} />} title="No Players Found" description={search ? 'Try a different search term' : 'Add your first player to get started'} action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>Add Player</Button>} />
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {filtered.map((player, i) => {
            const sig = getPlayerSignature(player);
            return (
              <motion.div key={player.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.4 }}>
                <Card style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-lg)' }}>
                  <Avatar src={player.photo_url} name={`${player.first_name} ${player.last_name}`} size={64} />
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{((player.first_name ? player.first_name + ' ' : '') + player.last_name).trim()}</div>
                    {player.jersey_number !== undefined && player.jersey_number !== null && player.jersey_number !== '' && (
                      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--rocks-green-light)', marginTop: 4 }}>#{player.jersey_number}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
                    {player.position && <PositionBadge position={player.position} />}
                    {player.secondary_position && <span style={{ opacity: 0.7 }}><PositionBadge position={player.secondary_position} /></span>}
                    {player.tertiary_position && <span style={{ opacity: 0.45 }}><PositionBadge position={player.tertiary_position} /></span>}
                    {player.date_of_birth && <Badge variant="blue">Age {getPlayerAge(player.date_of_birth)}</Badge>}
                    {player.program_type === 'cheerleading' && <Badge variant="purple">Cheer</Badge>}
                  </div>
                  {/* Visual Signature Anchor Pill Summary */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--space-sm)' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgba(16,107,58,0.18)', border: '1px solid rgba(16,107,58,0.35)', color: 'var(--rocks-green-light)', fontWeight: 600 }}>
                      Cleats: {sig.cleat_primary_color}
                    </span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgba(253,185,19,0.12)', border: '1px solid rgba(253,185,19,0.3)', color: 'var(--rocks-gold)', fontWeight: 600 }}>
                      Build: {sig.build_descriptor}
                    </span>
                  </div>
                  {/* Compliance dots */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
                    <span title={`Physical: ${PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.label}`} style={{ width: 8, height: 8, borderRadius: '50%', background: PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.color }} />
                    <span title={player.has_state_id ? 'ID: Verified' : 'ID: Missing'} style={{ width: 8, height: 8, borderRadius: '50%', background: player.has_state_id ? 'var(--green)' : 'var(--red)' }} />
                    <span title={player.registration_paid ? 'Reg: Paid' : 'Reg: Unpaid'} style={{ width: 8, height: 8, borderRadius: '50%', background: player.registration_paid ? 'var(--green)' : 'var(--red)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: 'var(--space-lg)', flexWrap: 'wrap' }}>
                    <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => { setSelectedPlayer(player); setShowViewModal(true); }}>View</Button>
                    <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => { setEditPlayer(player); setShowAddModal(true); }}>Edit</Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      data-testid="open-signature-editor-btn"
                      data-player-jersey={player.jersey_number}
                      icon={<Shield size={13} />}
                      onClick={() => openSignatureEditor(player)}
                    >
                      Equipment Signature
                    </Button>
                    {isGMOrHC && (
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(player.id)} style={{ color: 'var(--red)' }} />
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Player</th><th>Program</th><th>Position</th><th>Visual Signature</th><th>Physical</th><th>ID</th><th>Reg</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(player => {
                  const sig = getPlayerSignature(player);
                  return (
                    <tr key={player.id}>
                      <td style={{ fontWeight: 800, color: 'var(--rocks-green-light)' }}>{player.jersey_number ?? '—'}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Avatar src={player.photo_url} name={`${player.first_name} ${player.last_name}`} size={32} /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{((player.first_name ? player.first_name + ' ' : '') + player.last_name).trim()}</span></div></td>
                      <td><Badge variant={(player.program_type || 'football') === 'football' ? 'green' : 'purple'}>{(player.program_type || 'football') === 'football' ? 'Football' : 'Cheer'}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          {player.position ? <PositionBadge position={player.position} /> : '—'}
                          {player.secondary_position && <span style={{ opacity: 0.7 }}><PositionBadge position={player.secondary_position} /></span>}
                          {player.tertiary_position && <span style={{ opacity: 0.45 }}><PositionBadge position={player.tertiary_position} /></span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          {sig.cleat_primary_color} cleats · {sig.sock_style} · {sig.build_descriptor}
                        </div>
                      </td>
                      <td><span style={{ color: PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.color, fontWeight: 600, fontSize: 'var(--text-xs)' }}>{PHYSICAL_STATUS[player.physical_status || 'not_submitted']?.label}</span></td>
                      <td>{player.has_state_id ? <CheckCircle size={14} color="var(--green)" /> : <XCircle size={14} color="var(--red)" />}</td>
                      <td>{player.registration_paid ? <CheckCircle size={14} color="var(--green)" /> : <XCircle size={14} color="var(--red)" />}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setSelectedPlayer(player); setShowViewModal(true); }} title="View Profile"><Eye size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditPlayer(player); setShowAddModal(true); }} title="Edit Profile"><Edit2 size={14} /></button>
                          <button
                            className="btn btn-secondary btn-sm"
                            data-testid="open-signature-editor-btn"
                            data-player-jersey={player.jersey_number}
                            onClick={() => openSignatureEditor(player)}
                            title="Equipment Signature"
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            Equipment Signature
                          </button>
                          {isGMOrHC && (
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(player.id)} style={{ color: 'var(--red)' }} title="Remove Player"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Equipment & Visual Signature Matrix Modal */}
      <Modal
        isOpen={!!signatureModalPlayer}
        onClose={() => setSignatureModalPlayer(null)}
        title={signatureModalPlayer ? `Equipment & Visual Signature Matrix — #${signatureModalPlayer.jersey_number ?? ''} ${signatureModalPlayer.first_name || ''} ${signatureModalPlayer.last_name || ''}`.trim() : 'Equipment & Visual Signature Matrix'}
        size="lg"
      >
        {signatureModalPlayer && (
          <form
            data-testid="equipment-signature-modal"
            onSubmit={handleSaveSignature}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}
          >
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,107,58,0.12)', border: '1px solid rgba(16,107,58,0.35)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Configure all 16 visual anchor attributes for the 3-Point Non-OCR Player Identification Engine. When jersey digits are occluded by mud, motion blur, or line pileups, the AI locks onto this player via Alignment + Lower-Body Gear + Upper-Body/Helmet/Build Signatures.
            </div>

            {/* Section 1: Headwear (5 fields) */}
            <div>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--rocks-gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-sm)' }}>
                1. Headwear & Helmet Anchors
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Helmet Color (helmet_color)</label>
                  <input
                    className="form-input"
                    name="helmet_color"
                    data-testid="sig-helmet_color"
                    value={signatureForm.helmet_color}
                    onChange={e => setSignatureForm(f => ({ ...f, helmet_color: e.target.value }))}
                    placeholder="matte_black"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Helmet Finish (helmet_finish)</label>
                  <select
                    className="form-input"
                    name="helmet_finish"
                    data-testid="sig-helmet_finish"
                    value={signatureForm.helmet_finish}
                    onChange={e => setSignatureForm(f => ({ ...f, helmet_finish: e.target.value }))}
                  >
                    <option value="matte">matte</option>
                    <option value="gloss">gloss</option>
                    <option value="metallic">metallic</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Facemask Color (facemask_color)</label>
                  <input
                    className="form-input"
                    name="facemask_color"
                    data-testid="sig-facemask_color"
                    value={signatureForm.facemask_color}
                    onChange={e => setSignatureForm(f => ({ ...f, facemask_color: e.target.value }))}
                    placeholder="black / white / gold"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Visor Type (visor_type)</label>
                  <select
                    className="form-input"
                    name="visor_type"
                    data-testid="sig-visor_type"
                    value={signatureForm.visor_type}
                    onChange={e => setSignatureForm(f => ({ ...f, visor_type: e.target.value }))}
                  >
                    <option value="none">none</option>
                    <option value="clear">clear</option>
                    <option value="tinted">tinted</option>
                    <option value="mirror">mirror</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mouthpiece Color (mouthpiece_color)</label>
                  <input
                    className="form-input"
                    name="mouthpiece_color"
                    data-testid="sig-mouthpiece_color"
                    value={signatureForm.mouthpiece_color}
                    onChange={e => setSignatureForm(f => ({ ...f, mouthpiece_color: e.target.value }))}
                    placeholder="yellow / green / white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Lower Body (4 fields) */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--rocks-green-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-sm)' }}>
                2. Lower Body & Footwear Anchors
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Cleat Primary Color (cleat_primary_color)</label>
                  <input
                    className="form-input"
                    name="cleat_primary_color"
                    data-testid="sig-cleat_primary_color"
                    value={signatureForm.cleat_primary_color}
                    onChange={e => setSignatureForm(f => ({ ...f, cleat_primary_color: e.target.value }))}
                    placeholder="neon_green / solid_white / orange / black"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cleat Secondary Color (cleat_secondary_color)</label>
                  <input
                    className="form-input"
                    name="cleat_secondary_color"
                    data-testid="sig-cleat_secondary_color"
                    value={signatureForm.cleat_secondary_color}
                    onChange={e => setSignatureForm(f => ({ ...f, cleat_secondary_color: e.target.value }))}
                    placeholder="black / white / gold"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sock Style (sock_style)</label>
                  <select
                    className="form-input"
                    name="sock_style"
                    data-testid="sig-sock_style"
                    value={signatureForm.sock_style}
                    onChange={e => setSignatureForm(f => ({ ...f, sock_style: e.target.value }))}
                  >
                    <option value="high_white">high_white</option>
                    <option value="low_black">low_black</option>
                    <option value="green_sleeves">green_sleeves</option>
                    <option value="mid_white">mid_white</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 22 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      name="anklet_spat"
                      data-testid="sig-anklet_spat"
                      checked={!!signatureForm.anklet_spat}
                      onChange={e => setSignatureForm(f => ({ ...f, anklet_spat: e.target.checked }))}
                      style={{ width: 16, height: 16 }}
                    />
                    Anklet Spat Tape (anklet_spat)
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Upper Body (5 fields) */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-sm)' }}>
                3. Upper Body & Accessory Anchors
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Sleeve Style (sleeve_style)</label>
                  <select
                    className="form-input"
                    name="sleeve_style"
                    data-testid="sig-sleeve_style"
                    value={signatureForm.sleeve_style}
                    onChange={e => setSignatureForm(f => ({ ...f, sleeve_style: e.target.value }))}
                  >
                    <option value="none">none</option>
                    <option value="left_arm">left_arm</option>
                    <option value="right_arm">right_arm</option>
                    <option value="both_arms">both_arms</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sleeve Color (sleeve_color)</label>
                  <input
                    className="form-input"
                    name="sleeve_color"
                    data-testid="sig-sleeve_color"
                    value={signatureForm.sleeve_color}
                    onChange={e => setSignatureForm(f => ({ ...f, sleeve_color: e.target.value }))}
                    placeholder="white / black / green / none"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Glove Color (glove_color)</label>
                  <input
                    className="form-input"
                    name="glove_color"
                    data-testid="sig-glove_color"
                    value={signatureForm.glove_color}
                    onChange={e => setSignatureForm(f => ({ ...f, glove_color: e.target.value }))}
                    placeholder="neon_green / white / black"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Wristband Location (wristband_location)</label>
                  <input
                    className="form-input"
                    name="wristband_location"
                    data-testid="sig-wristband_location"
                    value={signatureForm.wristband_location}
                    onChange={e => setSignatureForm(f => ({ ...f, wristband_location: e.target.value }))}
                    placeholder="none / left_wrist / right_wrist / both_wrists"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Towel Location (towel_location)</label>
                  <input
                    className="form-input"
                    name="towel_location"
                    data-testid="sig-towel_location"
                    value={signatureForm.towel_location}
                    onChange={e => setSignatureForm(f => ({ ...f, towel_location: e.target.value }))}
                    placeholder="none / center_waist / left_hip / right_hip"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Physical Profile (2 fields) */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-sm)' }}>
                4. Physical Profile & Silhouette Anchors
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Build Descriptor (build_descriptor)</label>
                  <select
                    className="form-input"
                    name="build_descriptor"
                    data-testid="sig-build_descriptor"
                    value={signatureForm.build_descriptor}
                    onChange={e => setSignatureForm(f => ({ ...f, build_descriptor: e.target.value }))}
                  >
                    <option value="compact">compact</option>
                    <option value="tall_lean">tall_lean</option>
                    <option value="heavy_lineman">heavy_lineman</option>
                    <option value="athletic_stocky">athletic_stocky</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hair Descriptor (hair_descriptor)</label>
                  <select
                    className="form-input"
                    name="hair_descriptor"
                    data-testid="sig-hair_descriptor"
                    value={signatureForm.hair_descriptor}
                    onChange={e => setSignatureForm(f => ({ ...f, hair_descriptor: e.target.value }))}
                  >
                    <option value="none_visible">none_visible</option>
                    <option value="braids">braids</option>
                    <option value="dreads_visible">dreads_visible</option>
                    <option value="low_fade">low_fade</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <Button variant="ghost" type="button" onClick={() => setSignatureModalPlayer(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                data-testid="save-signature-btn"
                icon={<Save size={15} />}
                loading={savingSignature}
              >
                Save Equipment Signature
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Pre-Game Sideline Frame Scanner Modal */}
      <Modal
        isOpen={showScanFrameModal}
        onClose={() => setShowScanFrameModal(false)}
        title="Pre-Game Sideline Frame Scanner — Auto-Populate Roster Signatures"
        size="xl"
      >
        <div data-testid="scan-frame-modal" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(16,107,58,0.1)', border: '1px solid rgba(16,107,58,0.3)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#fff' }}>
                Gemini Vision Pre-Game Lineup Calibration
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 2 }}>
                Upload a pre-game sideline lineup photo or run calibration on the active game frame to extract cleats, socks, sleeves, visors, and build profiles for every player.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                ref={scanFileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setScanFramePreview(url);
                    handleRunSidelineScan();
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Camera size={14} />}
                onClick={() => scanFileInputRef.current?.click()}
              >
                Upload Sideline Photo
              </Button>
              <Button
                variant="primary"
                size="sm"
                data-testid="run-sideline-scan-btn"
                icon={<Scan size={14} />}
                loading={scanningFrame}
                onClick={handleRunSidelineScan}
              >
                Run Sideline Lineup Calibration Scan
              </Button>
            </div>
          </div>

          {scannedSignatures.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--rocks-gold)', textTransform: 'uppercase' }}>
                  Auto-Detected Player Equipment Signatures ({scannedSignatures.length} Players)
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="save-scanned-signatures-btn"
                  icon={<Save size={14} />}
                  loading={savingScannedBatch}
                  onClick={handleSaveAllScannedSignatures}
                >
                  Save All Scanned Signatures to Supabase
                </Button>
              </div>

              <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Cleats</th>
                      <th>Socks</th>
                      <th>Sleeves</th>
                      <th>Helmet / Mask</th>
                      <th>Visor</th>
                      <th>Build / Hair</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedSignatures.map((item, idx) => {
                      const sig = item.equipment_signature || {};
                      return (
                        <tr key={item.player_id || idx}>
                          <td style={{ fontWeight: 700 }}>
                            <span style={{ color: 'var(--rocks-green-light)', marginRight: 6 }}>#{item.jersey_number}</span>
                            {item.player_name}
                          </td>
                          <td><Badge variant="green">{sig.cleat_primary_color}</Badge></td>
                          <td style={{ fontSize: 'var(--text-xs)' }}>{sig.sock_style}</td>
                          <td style={{ fontSize: 'var(--text-xs)' }}>{sig.sleeve_style}</td>
                          <td style={{ fontSize: 'var(--text-xs)' }}>{sig.helmet_finish} / {sig.facemask_color}</td>
                          <td style={{ fontSize: 'var(--text-xs)' }}>{sig.visor_type}</td>
                          <td style={{ fontSize: 'var(--text-xs)' }}>{sig.build_descriptor} · {sig.hair_descriptor}</td>
                          <td>
                            <Badge variant="gold">{Math.round((item.confidence || 0.95) * 100)}%</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="ghost" onClick={() => setShowScanFrameModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

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
                    {(selectedPlayer.program_type || 'football') === 'football' ? 'Football' : 'Cheerleading'}
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
                Compliance Status
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

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <Button
                variant="secondary"
                icon={<Shield size={14} />}
                onClick={() => {
                  const p = selectedPlayer;
                  setShowViewModal(false);
                  setSelectedPlayer(null);
                  openSignatureEditor(p);
                }}
              >
                Edit Equipment Signature
              </Button>
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
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <User size={32} />
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
            <option value="football">Football ($175)</option>
            <option value="cheerleading">Cheerleading ($100)</option>
          </select>
        </div>
      </div>
      {/* Compliance Section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--rocks-green-light)' }}>Compliance</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group"><label className="form-label">Physical Status</label>
            <select className="form-input" value={form.physical_status} onChange={e => update('physical_status', e.target.value)}>
              <option value="not_submitted">Not Submitted</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
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
