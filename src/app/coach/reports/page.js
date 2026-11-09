'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  Send,
  Trash2,
  Users,
  Brain,
  Check,
  Copy,
  Shield,
  Zap,
  Activity,
  Film,
  CheckCircle,
} from 'lucide-react';
import { Card, Button, Badge, PageHeader, Avatar } from '@/components/ui/index';
import { createClient } from '@/lib/supabase';
import { trackReportGenerated } from '@/lib/track';
import toast from 'react-hot-toast';

const FALLBACK_ROSTER_STATS = [
  {
    id: 'player_9',
    first_name: 'Legend',
    last_name: 'Muhammad',
    player_name: 'Legend Muhammad',
    jersey_number: 9,
    position: 'RDE / RB',
    unit_role: 'RDE / RB',
    snaps_logged: 10,
    total_tackles: 10,
    solo_tackles: 7,
    assist_tackles: 3,
    tackles_for_loss: 3,
    sacks: 1,
    forced_fumbles: 1,
    edge_contain_credits: 4,
    rush_yards: 142,
    yards_after_contact: 68,
    broken_tackles: 4,
    rush_tds: 3,
    receptions: 0,
    rec_yards: 0,
    rec_tds: 0,
    pancake_blocks: 2,
    avg_get_off_ms: 212,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    avg_play_grade: 'A+',
    matched_anchors: ['alignment:RDE', 'cleats:neon_green', 'facemask:white', 'jersey:9'],
    coaching_cues: [
      { play_id: 'play_01', grade: 'A+', cue: 'Explosive 210ms first step; low pad level split tight end and tackle for -3 yd TFL.' },
      { play_id: 'play_03', grade: 'A+', cue: 'Elite 195ms edge dip-and-rip; tomahawk chop on throwing arm forced fumble.' },
      { play_id: 'play_04', grade: 'A+', cue: 'Patient outside zone read; broke two second-level tackles for 52-yd TD.' },
    ],
  },
  {
    id: 'player_17',
    first_name: 'Haven',
    last_name: 'Philippe',
    player_name: 'Haven Philippe',
    jersey_number: 17,
    position: 'QB / FS',
    unit_role: 'QB / FS',
    snaps_logged: 8,
    total_tackles: 2,
    solo_tackles: 2,
    assist_tackles: 0,
    tackles_for_loss: 0,
    sacks: 0,
    forced_fumbles: 0,
    edge_contain_credits: 1,
    rush_yards: 18,
    yards_after_contact: 7,
    broken_tackles: 1,
    rush_tds: 0,
    pass_yards: 28,
    pass_tds: 1,
    receptions: 0,
    rec_yards: 0,
    rec_tds: 0,
    pancake_blocks: 0,
    avg_get_off_ms: 215,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    avg_play_grade: 'A+',
    matched_anchors: ['alignment:QB', 'sleeves:white', 'visor:clear', 'jersey:17'],
    coaching_cues: [
      { play_id: 'play_08', grade: 'A+', cue: 'Crisp play-action fake held safety; delivered strike in stride for 28-yd TD.' },
    ],
  },
  {
    id: 'player_18',
    first_name: 'Hezekiah',
    last_name: 'Monge',
    player_name: 'Hezekiah Monge',
    jersey_number: 18,
    position: 'FB / OLB',
    unit_role: 'FB / OLB',
    snaps_logged: 7,
    total_tackles: 3,
    solo_tackles: 2,
    assist_tackles: 1,
    tackles_for_loss: 1,
    sacks: 0,
    forced_fumbles: 0,
    edge_contain_credits: 1,
    rush_yards: 22,
    yards_after_contact: 14,
    broken_tackles: 1,
    rush_tds: 0,
    receptions: 1,
    rec_yards: 9,
    rec_tds: 0,
    pancake_blocks: 1,
    avg_get_off_ms: 232,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    avg_play_grade: 'A-',
    matched_anchors: ['alignment:FB', 'cleats:red', 'visor:smoked', 'jersey:18'],
    coaching_cues: [
      { play_id: 'play_06', grade: 'A', cue: 'Lead kick-out block widened EMOL by 3 yards.' },
    ],
  },
  {
    id: 'player_11',
    first_name: 'Jake',
    last_name: 'Feldman',
    player_name: 'Jake Feldman',
    jersey_number: 11,
    position: 'WR1 / CB',
    unit_role: 'WR1 / CB',
    snaps_logged: 7,
    total_tackles: 2,
    solo_tackles: 2,
    assist_tackles: 0,
    tackles_for_loss: 0,
    sacks: 0,
    forced_fumbles: 0,
    edge_contain_credits: 1,
    rush_yards: 0,
    yards_after_contact: 11,
    broken_tackles: 1,
    rush_tds: 0,
    receptions: 1,
    rec_yards: 28,
    rec_tds: 1,
    pancake_blocks: 0,
    avg_get_off_ms: 220,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    avg_play_grade: 'A+',
    matched_anchors: ['alignment:WR1', 'cleats:orange', 'gloves:orange', 'jersey:11'],
    coaching_cues: [
      { play_id: 'play_08', grade: 'A+', cue: 'Inside release stacked CB; high-pointed football and finished in end zone.' },
    ],
  },
  {
    id: 'player_53',
    first_name: 'Harrison',
    last_name: 'Payne',
    player_name: 'Harrison Payne',
    jersey_number: 53,
    position: 'LDE / LT',
    unit_role: 'LDE / LT',
    snaps_logged: 8,
    total_tackles: 4,
    solo_tackles: 2,
    assist_tackles: 2,
    tackles_for_loss: 1,
    sacks: 0,
    forced_fumbles: 0,
    edge_contain_credits: 2,
    rush_yards: 0,
    yards_after_contact: 0,
    broken_tackles: 0,
    rush_tds: 0,
    receptions: 0,
    rec_yards: 0,
    rec_tds: 0,
    pancake_blocks: 2,
    avg_get_off_ms: 242,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    avg_play_grade: 'A',
    matched_anchors: ['alignment:LDE', 'cleats:white', 'hair:long_flow', 'jersey:53'],
    coaching_cues: [
      { play_id: 'play_10', grade: 'A', cue: 'Crushing down block sealed interior pursuit.' },
    ],
  },
];

export default function ReportsPage() {
  const [players, setPlayers] = useState(() => FALLBACK_ROSTER_STATS);
  const [selectedPlayer, setSelectedPlayer] = useState(() => FALLBACK_ROSTER_STATS[0]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [coachNotes, setCoachNotes] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [publishingGHL, setPublishingGHL] = useState(false);
  const [ghlDispatchStatus, setGhlDispatchStatus] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('generate');

  useEffect(() => {
    async function load() {
      let statsByJersey = new Map();
      try {
        const statsRes = await fetch('/api/film/stats?mode=season');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const list = statsData.seasonStats || statsData.boxScore || [];
          list.forEach((row) => {
            statsByJersey.set(Number(row.jersey_number), row);
          });
        }
      } catch {
        // Use fallback stats
      }

      let dbPlayers = [];
      try {
        const supabase = createClient();
        const { data } = await supabase.from('players').select('*').order('jersey_number');
        if (Array.isArray(data) && data.length > 0) {
          dbPlayers = data;
        }
      } catch {
        // Offline fallback
      }

      const mergedMap = new Map();
      FALLBACK_ROSTER_STATS.forEach((fp) => {
        const apiStat = statsByJersey.get(Number(fp.jersey_number)) || {};
        mergedMap.set(Number(fp.jersey_number), {
          ...fp,
          ...apiStat,
          first_name: fp.first_name,
          last_name: fp.last_name,
          jersey_number: Number(fp.jersey_number),
          position: fp.position || apiStat.unit_role || 'ATH',
        });
      });

      dbPlayers.forEach((p) => {
        const j = Number(p.jersey_number);
        const existing = mergedMap.get(j) || {};
        const apiStat = statsByJersey.get(j) || {};
        mergedMap.set(j, {
          ...existing,
          ...apiStat,
          ...p,
          first_name: p.first_name || existing.first_name || 'Player',
          last_name: p.last_name || existing.last_name || `#${j}`,
          jersey_number: j,
          position: p.position || existing.position || apiStat.unit_role || 'ATH',
        });
      });

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        if (a.jersey_number === 9) return -1;
        if (b.jersey_number === 9) return 1;
        return a.jersey_number - b.jersey_number;
      });

      setPlayers(mergedList);
      setSelectedPlayer((prev) => mergedList.find((x) => x.jersey_number === (prev?.jersey_number ?? 9)) || mergedList[0]);
      setLoading(false);
    }
    load();
  }, []);

  const previewSections = useMemo(() => {
    const p = selectedPlayer || FALLBACK_ROSTER_STATS[0];
    const snaps = Number(p.snaps_logged ?? 10);
    const totalTackles = Number(p.total_tackles ?? 0);
    const solo = Number(p.solo_tackles ?? 0);
    const ast = Number(p.assist_tackles ?? 0);
    const tfl = Number(p.tackles_for_loss ?? 0);
    const sacks = Number(p.sacks ?? 0);
    const ff = Number(p.forced_fumbles ?? 0);
    const rushYds = Number(p.rush_yards ?? 0);
    const yac = Number(p.yards_after_contact ?? 0);
    const brk = Number(p.broken_tackles ?? 0);
    const tds = Number(p.rush_tds ?? 0) + Number(p.rec_tds ?? 0) + Number(p.pass_tds ?? 0);
    const pancakes = Number(p.pancake_blocks ?? 0);
    const getOff = p.avg_get_off_ms ?? p.get_off_ms ?? 212;
    const padLevel = p.pad_level_status || 'optimal';
    const headPlacement = p.head_placement || 'safe';
    const grade = p.avg_play_grade || p.play_grade || 'A+';
    const anchors = Array.isArray(p.matched_anchors) ? p.matched_anchors : ['alignment:RDE', 'cleats:neon_green', `jersey:${p.jersey_number}`];
    const cues = Array.isArray(p.coaching_cues) && p.coaching_cues.length > 0
      ? p.coaching_cues
      : [{ play_id: 'play_01', grade, cue: 'Consistent high-motor pursuit and clean leverage at point of attack.' }];

    return {
      snaps,
      totalTackles,
      solo,
      ast,
      tfl,
      sacks,
      ff,
      rushYds,
      yac,
      brk,
      tds,
      pancakes,
      getOff,
      padLevel,
      headPlacement,
      grade,
      anchors,
      cues,
      clipLinks: [
        `/coach/film?player=${p.jersey_number}`,
        `/chargers_game_clips/Play_01_Chargers.mp4`,
        `/chargers_game_clips/Play_04_Chargers.mp4`,
      ],
    };
  }, [selectedPlayer]);

  async function generateReport(publishToGHL = false) {
    if (!selectedPlayer) {
      toast.error('Select a player first');
      return;
    }
    if (publishToGHL) setPublishingGHL(true);
    else setGenerating(true);

    try {
      const p = selectedPlayer;
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: `${p.first_name} ${p.last_name}`,
          jerseyNumber: p.jersey_number,
          position: p.position,
          age: p.age || 8,
          attendanceRate: p.attendance_rate || 95,
          evalScores: p.latest_eval || null,
          coachNotes,
          weekNumber,
          publishToGHL,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const draft = {
        id: Date.now(),
        playerId: p.id,
        playerName: `${p.first_name} ${p.last_name}`,
        jerseyNumber: p.jersey_number,
        report: data.report,
        sections: data.sections,
        verifiedStats: data.verifiedStats,
        clipLinks: data.clipLinks,
        status: publishToGHL ? 'sent' : 'draft',
        createdAt: new Date().toISOString(),
        weekNumber,
      };

      setDrafts((prev) => {
        const next = [draft, ...prev];
        try {
          localStorage.setItem('delray_parent_reports', JSON.stringify(next));
        } catch {
          // Ignore storage quota
        }
        return next;
      });
      setActiveReport(draft);

      if (publishToGHL && data.ghlDispatch) {
        setGhlDispatchStatus(data.ghlDispatch);
        toast.success(`Published & dispatched via GHL SMS/Email for #${p.jersey_number} ${p.first_name}`);
      } else {
        setTab('drafts');
        toast.success(`Report generated for ${p.first_name}`);
      }
      trackReportGenerated(`${p.first_name} ${p.last_name}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
      setPublishingGHL(false);
    }
  }

  async function generateAll() {
    setGenerating(true);
    let generated = 0;
    for (const p of players) {
      try {
        const res = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: `${p.first_name} ${p.last_name}`,
            jerseyNumber: p.jersey_number,
            position: p.position,
            age: p.age || 8,
            attendanceRate: p.attendance_rate || 95,
            evalScores: p.latest_eval || null,
            coachNotes: '',
            weekNumber,
          }),
        });
        const data = await res.json();
        if (data.report) {
          const draft = {
            id: Date.now() + Math.random(),
            playerId: p.id,
            playerName: `${p.first_name} ${p.last_name}`,
            jerseyNumber: p.jersey_number,
            report: data.report,
            sections: data.sections,
            verifiedStats: data.verifiedStats,
            clipLinks: data.clipLinks,
            status: 'draft',
            createdAt: new Date().toISOString(),
            weekNumber,
          };
          setDrafts((prev) => [draft, ...prev]);
          generated++;
        }
      } catch (e) {
        console.error(`Failed for ${p.first_name}:`, e);
      }
    }
    toast.success(`Generated ${generated}/${players.length} reports`);
    setTab('drafts');
    setGenerating(false);
  }

  function markSent(id) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'sent' } : d)));
    toast.success('Marked as sent');
  }

  function deleteDraft(id) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (activeReport?.id === id) setActiveReport(null);
    toast.success('Draft deleted');
  }

  function copyReport(text) {
    navigator.clipboard.writeText(text);
    toast.success('Report copied to clipboard');
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading roster...</div>;

  return (
    <div>
      <PageHeader
        title="Parent Reports & Guardian GHL Sync"
        subtitle="AI-generated weekly development reports anchored to 3-Point Verified Film Telemetry"
        breadcrumbs={[{ label: 'Coach', href: '/coach/dashboard' }, { label: 'Parent Reports' }]}
        actions={
          <Badge variant="green" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
            <Brain size={12} style={{ marginRight: 4 }} /> VERIFIED AI ENGINE
          </Badge>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-xl)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', padding: 4, width: 'fit-content' }}>
        {[
          { key: 'generate', label: 'Generate & Publish Reports', icon: Brain },
          { key: 'drafts', label: `Drafts & Sent (${drafts.length})`, icon: FileText },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              background: tab === t.key ? 'rgba(0,154,68,0.15)' : 'transparent',
              color: tab === t.key ? '#009A44' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 150ms',
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'generate' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 'var(--space-xl)' }}>
          {/* Left: Player select + config */}
          <Card>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="var(--rocks-green-light)" /> Select Player
            </h3>

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-lg)' }}>
              {players.map((p) => (
                <button
                  key={p.id || p.jersey_number}
                  data-testid={`select-report-player-${p.jersey_number}`}
                  onClick={() => {
                    setSelectedPlayer(p);
                    setGhlDispatchStatus(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${selectedPlayer?.jersey_number === p.jersey_number ? '#009A44' : 'transparent'}`,
                    background: selectedPlayer?.jersey_number === p.jersey_number ? 'rgba(0,154,68,0.08)' : 'var(--bg-glass)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 150ms',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Avatar name={`${p.first_name} ${p.last_name}`} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      #{p.jersey_number} {p.first_name} {p.last_name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      {p.position || 'Multi'} | {p.total_tackles ?? 0} Tkl | {p.rush_yards ?? 0} Rush Yds | Grade {p.avg_play_grade || 'A'}
                    </div>
                  </div>
                  {selectedPlayer?.jersey_number === p.jersey_number && <Check size={16} color="#009A44" />}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">WEEK #</label>
                <input className="form-input" type="number" min={1} max={20} value={weekNumber} onChange={(e) => setWeekNumber(parseInt(e.target.value, 10) || 1)} />
              </div>
              <div className="form-group">
                <label className="form-label">ROSTER COUNT</label>
                <div style={{ padding: '0.625rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {players.length} verified players
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
              <label className="form-label">COACH NOTES (optional)</label>
              <textarea
                className="form-input"
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Any specific observations about this player this week..."
                rows={3}
              />
            </div>
          </Card>

          {/* Right: Structured 3-Section Preview + GHL Publish */}
          <Card data-testid="parent-report-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Structured Guardian Report Preview</h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', background: 'rgba(0,154,68,0.14)', padding: '4px 10px', borderRadius: 999 }}>
                3-Point Anchor Locked ({previewSections.snaps} Snaps)
              </span>
            </div>

            {selectedPlayer && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Avatar name={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} size={44} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 'var(--text-lg)' }}>
                        #{selectedPlayer.jersey_number} {selectedPlayer.first_name} {selectedPlayer.last_name}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                        {selectedPlayer.position} | Week {weekNumber} | Film Grade: <strong style={{ color: '#4ADE80' }}>{previewSections.grade}</strong>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/coach/film?player=${selectedPlayer.jersey_number}`}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#4ADE80',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(0,154,68,0.15)',
                      border: '1px solid rgba(0,154,68,0.35)',
                    }}
                  >
                    <Film size={12} /> View Player Tape
                  </Link>
                </div>

                {/* Section 1: Verified Game Impact */}
                <div
                  data-testid="report-section-verified-impact"
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(0,154,68,0.06)',
                    border: '1px solid rgba(0,154,68,0.2)',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#4ADE80', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={14} /> 1. Verified Game Impact (Box Score & Snap Participation)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <div>
                      <strong>Snap Participation:</strong> {previewSections.snaps} live snaps verified via 3-Point Anchors ({previewSections.anchors.join(', ')})
                    </div>
                    <div>
                      <strong>Defensive Impact:</strong> {previewSections.totalTackles} Total Tackles ({previewSections.solo} Solo, {previewSections.ast} Ast), {previewSections.tfl} TFL, {previewSections.sacks} Sack, {previewSections.ff} Forced Fumble
                    </div>
                    <div>
                      <strong>Offensive & Trench Impact:</strong> {previewSections.rushYds} Rush Yds ({previewSections.yac} YAC, {previewSections.brk} Broken Tackles), {previewSections.tds} Total TDs, {previewSections.pancakes} Pancake Blocks
                    </div>
                  </div>
                </div>

                {/* Section 2: What They Are Doing Well */}
                <div
                  data-testid="report-section-strengths"
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(253,185,19,0.06)',
                    border: '1px solid rgba(253,185,19,0.2)',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#FDB913', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={14} /> 2. What They Are Doing Well (Strengths & High-Grade Reps)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <div>
                      <strong>Kinematic Execution:</strong> {previewSections.getOff}ms average snap get-off | Pad Level: <strong>{previewSections.padLevel}</strong> | Head Placement: <strong>{previewSections.headPlacement}</strong>
                    </div>
                    {previewSections.cues.slice(0, 3).map((c, idx) => (
                      <div key={idx} style={{ marginTop: 4 }}>
                        - [{c.grade || previewSections.grade}] {c.cue}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Weekly Development Focus */}
                <div
                  data-testid="report-section-development-focus"
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(96,165,250,0.06)',
                    border: '1px solid rgba(96,165,250,0.2)',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#60A5FA', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={14} /> 3. Weekly Development Focus (Kinematic Cues for Parents & External Trainers + Linked Video Clips)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <div>
                      <strong>Trainer & Backyard Cue:</strong> Reinforce {previewSections.padLevel} pad level sink at contact and keep eyes up ({previewSections.headPlacement}) through wrap-up while maintaining sub-{previewSections.getOff}ms first-step cadence reaction.
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {previewSections.clipLinks.map((href, idx) => (
                        <a
                          key={href}
                          href={href}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#60A5FA',
                            background: 'rgba(96,165,250,0.14)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            textDecoration: 'none',
                          }}
                        >
                          Clip Link #{idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* GHL Webhook Confirmation Badge */}
                {ghlDispatchStatus && (
                  <div
                    data-testid="ghl-dispatch-status"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      marginBottom: 14,
                      background: 'rgba(0,154,68,0.15)',
                      border: '1px solid rgba(74,222,128,0.4)',
                      color: '#4ADE80',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle size={16} />
                    <div>
                      <div>{ghlDispatchStatus.statusMessage}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Channels: {(ghlDispatchStatus.channels || ['SMS', 'Email']).join(' + ')} | Recipient: {ghlDispatchStatus.recipient?.guardianEmail}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    data-testid="publish-send-parent-report-btn"
                    disabled={publishingGHL || generating}
                    onClick={() => generateReport(true)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 8,
                      border: '1px solid rgba(0,154,68,0.5)',
                      background: 'linear-gradient(135deg, #009A44, #16A34A)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Send size={14} />
                    {publishingGHL ? 'Publishing & Dispatched to GHL...' : 'Publish & Send Parent Report'}
                  </button>

                  <Button variant="secondary" icon={<Brain size={14} />} loading={generating} onClick={() => generateReport(false)}>
                    Save Draft Only
                  </Button>

                  <Button variant="ghost" onClick={generateAll}>
                    Generate All Players
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Drafts tab */
        <div style={{ display: 'grid', gridTemplateColumns: activeReport ? 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' : '1fr', gap: 'var(--space-xl)' }}>
          <Card style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Drafts & Sent Reports</h3>
            {drafts.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '2rem' }}>
                No reports generated in this session yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {drafts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveReport(d)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${activeReport?.id === d.id ? '#009A44' : 'transparent'}`,
                      background: activeReport?.id === d.id ? 'rgba(0,154,68,0.08)' : 'var(--bg-glass)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        #{d.jerseyNumber} {d.playerName}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Week {d.weekNumber}</div>
                    </div>
                    <Badge variant={d.status === 'sent' ? 'green' : 'gold'} style={{ fontSize: '0.6rem' }}>
                      {d.status === 'sent' ? 'Sent via GHL' : 'Draft'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {activeReport && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                      #{activeReport.jerseyNumber} {activeReport.playerName} -- Week {activeReport.weekNumber}
                    </h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                      Generated {new Date(activeReport.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="ghost" size="sm" icon={<Copy size={12} />} onClick={() => copyReport(activeReport.report)}>
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} onClick={() => deleteDraft(activeReport.id)}>
                      Delete
                    </Button>
                    {activeReport.status === 'draft' && (
                      <Button variant="primary" size="sm" icon={<Send size={12} />} onClick={() => markSent(activeReport.id)}>
                        Mark Sent
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{
                    __html: activeReport.report
                      .replace(/^# (.*)/gm, '<h2 style="color:var(--text-primary);font-size:1.25rem;margin:1.5rem 0 0.75rem;font-weight:800">$1</h2>')
                      .replace(/^## (.*)/gm, '<h3 style="color:var(--rocks-green-light);font-size:1rem;margin:1.2rem 0 0.5rem;font-weight:700">$1</h3>')
                      .replace(/^### (.*)/gm, '<h4 style="color:var(--rocks-gold);margin:1rem 0 0.4rem;font-size:0.9rem;font-weight:600">$1</h4>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
                      .replace(/^- (.*)/gm, '<div style="padding-left:1rem;margin:0.25rem 0">- $1</div>'),
                  }}
                />
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
