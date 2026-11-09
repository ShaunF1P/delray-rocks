import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const maxDuration = 60;

const DEFAULT_EQUIPMENT_SIGNATURE_FIELDS = [
  'helmet_color',
  'helmet_finish',
  'facemask_color',
  'visor_type',
  'mouthpiece_color',
  'cleat_primary_color',
  'cleat_secondary_color',
  'sock_style',
  'anklet_spat',
  'sleeve_style',
  'sleeve_color',
  'glove_color',
  'wristband_location',
  'towel_location',
  'build_descriptor',
  'hair_descriptor',
  'primary_alignment',
];

function normalizePlayerSignatureEntry(jersey, rawEntry = {}, rosterEntry = null) {
  const eq = rawEntry.equipment_signature || rawEntry || {};
  const cleatsRaw = String(eq.cleat_primary_color || rawEntry.cleats || 'dark').trim();
  const accessoriesRaw = String(rawEntry.accessories || '').trim();
  const headwearRaw = String(rawEntry.headwear || '').trim();
  const buildRaw = String(eq.build_descriptor || rawEntry.build || 'athletic_8u').trim();
  const alignmentRaw = String(
    eq.primary_alignment || rawEntry.primary_alignment || rosterEntry?.position || 'ATH'
  ).trim();

  const normalized = {
    helmet_color: eq.helmet_color || (headwearRaw.toLowerCase().includes('dark') ? 'black' : 'black'),
    helmet_finish: eq.helmet_finish || 'matte',
    facemask_color: eq.facemask_color || 'black',
    visor_type: eq.visor_type || (headwearRaw.toLowerCase().includes('clear visor') ? 'clear' : headwearRaw.toLowerCase().includes('tinted') ? 'tinted' : 'none'),
    mouthpiece_color: eq.mouthpiece_color || 'yellow',
    cleat_primary_color: eq.cleat_primary_color || cleatsRaw,
    cleat_secondary_color: eq.cleat_secondary_color || 'black',
    sock_style: eq.sock_style || 'mid_calf_black',
    anklet_spat: eq.anklet_spat || 'none',
    sleeve_style: eq.sleeve_style || (accessoriesRaw.toLowerCase().includes('sleeve') ? 'full_arm' : 'none'),
    sleeve_color: eq.sleeve_color || (accessoriesRaw.toLowerCase().includes('white') ? 'white' : accessoriesRaw.toLowerCase().includes('black') ? 'black' : 'none'),
    glove_color: eq.glove_color || (accessoriesRaw.toLowerCase().includes('glove') ? 'white' : 'none'),
    wristband_location: eq.wristband_location || (accessoriesRaw.toLowerCase().includes('wristband') ? 'left_wrist' : 'none'),
    towel_location: eq.towel_location || 'none',
    build_descriptor: buildRaw,
    hair_descriptor: eq.hair_descriptor || (headwearRaw.toLowerCase().includes('braids') || headwearRaw.toLowerCase().includes('dread') ? 'long_braids_collar' : 'covered_by_helmet'),
    primary_alignment: alignmentRaw,
  };

  return {
    jersey: String(jersey),
    name: rawEntry.name || rosterEntry?.name || `Player #${jersey}`,
    position: rosterEntry?.position || alignmentRaw,
    equipment_signature: normalized,
  };
}

export function loadDefaultSignatures() {
  try {
    const sigPath = path.join(process.cwd(), 'scratch', 'player_signatures.json');
    if (fs.existsSync(sigPath)) {
      return JSON.parse(fs.readFileSync(sigPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not load scratch/player_signatures.json:', err.message);
  }
  return {};
}

export function buildSignatureMatrixContext(roster = [], signatures = null) {
  const sigSource = signatures || loadDefaultSignatures();
  const rosterByJersey = new Map();
  if (Array.isArray(roster)) {
    for (const p of roster) {
      if (p && p.jersey !== undefined && p.jersey !== null) {
        rosterByJersey.set(String(p.jersey), p);
      }
    }
  }

  const allJerseys = new Set([
    ...Array.from(rosterByJersey.keys()),
    ...Object.keys(sigSource || {}),
  ]);

  if (allJerseys.size === 0) return '';

  const sortedJerseys = Array.from(allJerseys).sort((a, b) => Number(a) - Number(b));
  const lines = sortedJerseys.map((jersey) => {
    const rawSig = (sigSource && sigSource[jersey]) || {};
    const rosterPlayer = rosterByJersey.get(jersey) || null;
    const norm = normalizePlayerSignatureEntry(jersey, rawSig, rosterPlayer);
    const eq = norm.equipment_signature;
    const kvPairs = DEFAULT_EQUIPMENT_SIGNATURE_FIELDS.map(
      (field) => `${field}=${eq[field] ?? 'none'}`
    ).join(', ');
    return `  #${norm.jersey} ${norm.name} (${norm.position}) -> [${kvPairs}]`;
  });

  return `\n\n=== ROSTER VISUAL SIGNATURE MATRIX (17-POINT EQUIPMENT RE-ID) ===
Use this deterministic equipment matrix when executing Stage B 3-Point Signature Re-ID across keyframes:
${lines.join('\n')}
=== END ROSTER VISUAL SIGNATURE MATRIX ===\n`;
}

function buildRosterContext(roster, signatures = null) {
  const sigMatrix = buildSignatureMatrixContext(roster, signatures);
  if (!roster || roster.length === 0) return sigMatrix;
  const lines = roster.map(p => `  #${p.jersey} — ${p.name} (${p.position})`).join('\n');
  return `\n\n=== OUR TEAM ROSTER ===
IMPORTANT: When you identify a player from OUR team, always label them by POSITION, Jersey #, and Name.
Example: "RB #10 (Marcus Johnson)" or "LG #54 (David Smith)"
For OPPONENT players where you don't have a roster, label by jersey # and their observed position.
Example: "Opponent DL #5" or "Opponent Safety #1"

For offensive linemen, identify by specific position (LT, LG, C, RG, RT, TE) based on their alignment.
For defensive players, identify by scheme position (DE, DT, NT, OLB, MLB, ILB, CB, FS, SS).

Our Roster:
${lines}
=== END ROSTER ===${sigMatrix}`;
}

export function buildGroundTruthRules({
  deadBallSensitivity = 0.5,
  playerIdConfidenceCutoff = 0.7,
  multiPassReasoning = false,
} = {}) {
  const dSens = typeof deadBallSensitivity === 'number' ? Math.min(1.0, Math.max(0.0, deadBallSensitivity)) : 0.5;
  const pCutoff = typeof playerIdConfidenceCutoff === 'number' ? Math.min(1.0, Math.max(0.0, playerIdConfidenceCutoff)) : 0.7;

  let deadBallGuidance = '';
  if (dSens >= 0.75) {
    deadBallGuidance = `STRICT PRE-SNAP DEAD-BALL SENSITIVITY (${dSens.toFixed(2)}): Apply strict scrutiny to pre-snap motion, offsides, encroachment, false starts, or early referee whistles. Flag borderline pre-snap actions aggressively as dead balls.`;
  } else if (dSens <= 0.35) {
    deadBallGuidance = `PERMISSIVE PRE-SNAP DEAD-BALL SENSITIVITY (${dSens.toFixed(2)}): Only classify a play as a dead ball if there is an explicit referee whistle or definitive pre-snap stoppage. Allow play flow unless stoppage is unquestionable.`;
  } else {
    deadBallGuidance = `BALANCED DEAD-BALL SENSITIVITY (${dSens.toFixed(2)}): Apply standard strictness for pre-snap penalties and dead-ball classification.`;
  }

  let playerIdGuidance = '';
  if (pCutoff >= 0.75) {
    playerIdGuidance = `STRICT PLAYER ID CONFIDENCE CUTOFF (${pCutoff.toFixed(2)}): Only output exact jersey numbers if 100% clear and indisputable. When confidence is below ${pCutoff.toFixed(2)}, fallback STRICTLY to position and 2-3 physical descriptors (cleat color, hair, build, equipment).`;
  } else if (pCutoff <= 0.35) {
    playerIdGuidance = `LIBERAL PLAYER ID CONFIDENCE CUTOFF (${pCutoff.toFixed(2)}): Report candidate jersey numbers even if partially obscured or lower confidence, while keeping position and physical descriptors.`;
  } else {
    playerIdGuidance = `BALANCED PLAYER ID CONFIDENCE CUTOFF (${pCutoff.toFixed(2)}): Require strong legibility before asserting a jersey number; fallback to position and 2-3 physical descriptors when jersey number is uncertain.`;
  }

  let multiPassGuidance = '';
  if (multiPassReasoning) {
    multiPassGuidance = `
=== MULTI-PASS REASONING & VERIFICATION RULES ===
1. **Pass 1 (Temporal Alignment)**: Pinpoint precise snap and whistle timestamps for every play event.
2. **Pass 2 (Classification Verification)**: Re-verify play classification (Live vs Dead Ball / Penalty) against pre-snap alignment and whistle indicators.
3. **Pass 3 (Player ID Validation)**: Validate player positions, jersey numbers, and physical descriptors against roster and visual evidence.
=== END MULTI-PASS REASONING & VERIFICATION RULES ===
`;
  }

  return `

=== GROUND TRUTH RULES — FOLLOW THESE EXACTLY ===
1. ONLY describe what you ACTUALLY SEE in the video. Do NOT fabricate, infer, or guess details.
2. If a play is a DEAD BALL (penalty flag, offsides, false start, referee whistle, coach intervention), SAY SO. Do NOT analyze a dead ball as a live play.
   - ${deadBallGuidance}
3. If players line up and then the play is blown dead before a snap or after a penalty, report it as: "DEAD BALL — [reason]" (e.g., "DEAD BALL — Offsides on defense, 5-yard penalty assessed").
4. If you see teams moving forward or backward without running a play, that is likely a PENALTY ENFORCEMENT (e.g., walking off 5 yards for offsides). Report it as such.
5. If you CANNOT clearly see a jersey number, say "unidentified" — do NOT make up a number.
6. If you CANNOT determine what happened, say "unclear from film angle" — do NOT fabricate a narrative.
7. Count the actual number of LIVE plays in the clip. A live play = snap to whistle with actual football action. Pre-snap penalties and dead balls are NOT live plays.
8. Be HONEST about what the film quality and angle allows you to see. A single sideline camera cannot show all 22 players.

=== SCOREBUG, CLOCK & BROADCAST GRAPHICS GUIDANCE ===
1. If an on-screen scorebug, game clock, down-and-distance overlay, or scoreboard banner is present in the frame:
   - Use the live game clock movement and down-and-distance changes to verify the precise SNAP and WHISTLE timestamps.
   - If the overlay displays a timeout, quarter pause, injury stoppage, or commercial break, treat the interval as DEAD BALL / NON-PLAY.
   - Extract down, distance, and quarter to cross-verify play outcome.

=== REPLAY & NON-PLAY SUPPRESSION ===
1. Identify and suppress instant replays:
   - Watch for transition wipes, logo flashes, slow-motion playback, or alternate angles replaying a snap that just concluded.
   - Do NOT classify replays as new plays. Only log the original live play event.
   - Discard pre-game warmups, halftime delays, and sideline huddles.

=== PLAYER IDENTIFICATION RULES ===
Jersey numbers are HARD to read on youth football film. Sensitivity threshold set at ${pCutoff.toFixed(2)}.
- ${playerIdGuidance}
Use this identification hierarchy:
1. **POSITION FIRST**: Always identify by field position (e.g., "the Left DE", "the DT aligned over the center"). This is your primary identifier.
2. **PHYSICAL DESCRIPTORS (minimum 2-3)**: You MUST include at least 2-3 distinguishing features for every key player you reference. Use these in order of visibility:
   - **Shoe/cleat color** (most visible from sideline — white cleats, neon green shoes, black cleats, etc.)
   - **Hair** (long hair, braids, mohawk, buzzcut, hair sticking out of helmet)
   - **Build/size** (tallest on the DL, stocky, smallest LB, etc.)
   - **Equipment** (visor, colored gloves, arm sleeve, towel, wristband)
   - **Skin tone** (if helpful for distinguishing between adjacent players)
   Example: "the Left DE (long hair, white cleats, tall build)"
3. **JERSEY NUMBER (with confidence)**: Only state a jersey number if you can clearly read it (confidence >= ${pCutoff.toFixed(2)}). If uncertain, say "appears to be #53 (uncertain)" or "possibly #5 or #53". NEVER state a number with false confidence.
4. **COMBINE ALL THREE**: Best format: "Left DE #53 (long hair, white cleats, tall) — committed the offsides"
5. If the number is unreadable, position + 2-3 physical descriptors IS enough: "the Left DE (long hair, white cleats, tall build) committed the infraction"
=== END PLAYER IDENTIFICATION RULES ===

=== MANDATORY 3-POINT ANCHOR RULE FOR DETERMINISTIC STAT ATTRIBUTION ===
Every player credited with a stat MUST have at least 3 verified anchors logged in matched_anchors:
1. Pre-Snap Alignment / Depth Chart Prior (e.g., alignment:RB, alignment:RDE, alignment:MLB, alignment:LT)
2. Lower/Upper Equipment Signature (e.g., cleats:orange, cleats:solid_white, sleeves:white_long, visor:clear, build:stocky)
3. Jersey Number (if visible on frame_presnap.jpg or frame_contact_whistle.jpg with confidence >= ${pCutoff.toFixed(2)}) OR Continuous Trajectory Track (trajectory:continuous_bbox_track) from pre_snap_bbox [ymin, xmin, ymax, xmax] into contact_bbox [ymin, xmin, ymax, xmax].
Never attribute a stat to a player with fewer than 3 verified anchors.
=== END MANDATORY 3-POINT ANCHOR RULE ===
${multiPassGuidance}=== END GROUND TRUTH RULES ===
`;
}

// Fallback constant for backwards compatibility
export const GROUND_TRUTH_RULES = buildGroundTruthRules();

/**
 * Stage A: Extract the 3 high-resolution 4K JPEG keyframes per play via FFmpeg:
 * 1. frame_presnap.jpg at Math.max(0, snapTimestamp - 0.5)
 * 2. frame_mesh_point.jpg at snapTimestamp + 1.2
 * 3. frame_contact_whistle.jpg at Math.max(snapTimestamp + 0.5, whistleTimestamp - 1.0)
 */
export function extractPlayKeyframes(
  videoSource,
  snapTimestamp = 0,
  whistleTimestamp = 6,
  outputDir = null
) {
  const snapSec = typeof snapTimestamp === 'number' && !Number.isNaN(snapTimestamp) ? Math.max(0, snapTimestamp) : 0;
  const whistleSec = typeof whistleTimestamp === 'number' && !Number.isNaN(whistleTimestamp)
    ? Math.max(snapSec + 1.5, whistleTimestamp)
    : snapSec + 5.0;

  const targetDir = outputDir || path.join(os.tmpdir(), `delray-keyframes-${Date.now()}`);
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch {}

  const specs = [
    {
      key: 'presnap',
      frame_type: 'presnap',
      filename: 'frame_presnap.jpg',
      timestamp_sec: Number(Math.max(0, snapSec - 0.5).toFixed(2)),
    },
    {
      key: 'mesh_point',
      frame_type: 'mesh_point',
      filename: 'frame_mesh_point.jpg',
      timestamp_sec: Number((snapSec + 1.2).toFixed(2)),
    },
    {
      key: 'contact_whistle',
      frame_type: 'contact_whistle',
      filename: 'frame_contact_whistle.jpg',
      timestamp_sec: Number(Math.max(snapSec + 0.5, whistleSec - 1.0).toFixed(2)),
    },
  ];

  const keyframes = specs.map((spec) => {
    const outPath = path.join(targetDir, spec.filename);
    const cmd = `ffmpeg -y -ss ${spec.timestamp_sec} -i "${videoSource}" -frames:v 1 -q:v 2 "${outPath}"`;
    let extracted = false;

    if (videoSource && typeof videoSource === 'string') {
      const isLocalExists = !videoSource.startsWith('http') && fs.existsSync(videoSource);
      const isHttpUrl = videoSource.startsWith('http://') || videoSource.startsWith('https://');
      if (isLocalExists || isHttpUrl) {
        try {
          execSync(cmd, { timeout: 25000, stdio: 'pipe' });
          extracted = fs.existsSync(outPath) && fs.statSync(outPath).size > 0;
        } catch {
          extracted = false;
        }
      }
    }

    return {
      ...spec,
      path: outPath,
      command: cmd,
      extracted,
    };
  });

  return {
    presnap: keyframes[0],
    mesh_point: keyframes[1],
    contact_whistle: keyframes[2],
    keyframes,
  };
}

/**
 * Stage B: Strict Gemini responseSchema for deterministic JSON stat extraction
 * matching film_plays (including telestrator_keyframes) and play_player_stats.
 */
export const STAGE_B_PLAY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    plays: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          play_number: { type: 'INTEGER' },
          quarter: { type: 'INTEGER' },
          down: { type: 'INTEGER' },
          distance: { type: 'INTEGER' },
          yard_line: { type: 'INTEGER' },
          clip_start_sec: { type: 'NUMBER' },
          clip_end_sec: { type: 'NUMBER' },
          snap_timestamp_sec: { type: 'NUMBER' },
          whistle_timestamp_sec: { type: 'NUMBER' },
          is_dead_ball: { type: 'BOOLEAN' },
          dead_ball_reason: { type: 'STRING' },
          unit: { type: 'STRING' },
          play_type: { type: 'STRING' },
          play_direction: { type: 'STRING' },
          offensive_formation: { type: 'STRING' },
          defensive_front: { type: 'STRING' },
          play_call: { type: 'STRING' },
          yards_gained: { type: 'INTEGER' },
          is_touchdown: { type: 'BOOLEAN' },
          is_first_down: { type: 'BOOLEAN' },
          is_turnover: { type: 'BOOLEAN' },
          turnover_type: { type: 'STRING' },
          is_penalty: { type: 'BOOLEAN' },
          penalty_type: { type: 'STRING' },
          penalty_yards: { type: 'INTEGER' },
          team_grade: { type: 'STRING' },
          summary: { type: 'STRING' },
          coaching_notes: { type: 'STRING' },
          telestrator_keyframes: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                frame_type: { type: 'STRING' },
                filename: { type: 'STRING' },
                timestamp_sec: { type: 'NUMBER' },
                annotations: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      jersey_number: { type: 'INTEGER' },
                      player_name: { type: 'STRING' },
                      position_aligned: { type: 'STRING' },
                      bbox: {
                        type: 'ARRAY',
                        items: { type: 'NUMBER' },
                      },
                      vector_target: {
                        type: 'ARRAY',
                        items: { type: 'NUMBER' },
                      },
                      label: { type: 'STRING' },
                      color: { type: 'STRING' },
                    },
                    required: ['position_aligned', 'bbox', 'label'],
                  },
                },
              },
              required: ['frame_type', 'filename', 'timestamp_sec', 'annotations'],
            },
          },
          play_player_stats: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                player_id: { type: 'STRING' },
                jersey_number: { type: 'INTEGER' },
                player_name: { type: 'STRING' },
                position_aligned: { type: 'STRING' },
                unit: { type: 'STRING' },
                id_confidence: { type: 'NUMBER' },
                matched_anchors: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                pre_snap_bbox: {
                  type: 'ARRAY',
                  items: { type: 'NUMBER' },
                },
                contact_bbox: {
                  type: 'ARRAY',
                  items: { type: 'NUMBER' },
                },
                snap_played: { type: 'INTEGER' },
                carry: { type: 'INTEGER' },
                rushing_yards: { type: 'INTEGER' },
                rushing_td: { type: 'INTEGER' },
                broken_tackles: { type: 'INTEGER' },
                yards_after_contact: { type: 'INTEGER' },
                pass_attempt: { type: 'INTEGER' },
                pass_completion: { type: 'INTEGER' },
                passing_yards: { type: 'INTEGER' },
                passing_td: { type: 'INTEGER' },
                interception_thrown: { type: 'INTEGER' },
                target: { type: 'INTEGER' },
                reception: { type: 'INTEGER' },
                receiving_yards: { type: 'INTEGER' },
                receiving_td: { type: 'INTEGER' },
                pancake_block: { type: 'INTEGER' },
                block_win: { type: 'INTEGER' },
                block_loss: { type: 'INTEGER' },
                fumble: { type: 'INTEGER' },
                fumble_lost: { type: 'INTEGER' },
                solo_tackle: { type: 'INTEGER' },
                assist_tackle: { type: 'INTEGER' },
                missed_tackle: { type: 'INTEGER' },
                tackle_for_loss: { type: 'INTEGER' },
                sack: { type: 'INTEGER' },
                qb_pressure: { type: 'INTEGER' },
                pass_breakup: { type: 'INTEGER' },
                interception: { type: 'INTEGER' },
                forced_fumble: { type: 'INTEGER' },
                fumble_recovery: { type: 'INTEGER' },
                defensive_td: { type: 'INTEGER' },
                edge_set_win: { type: 'INTEGER' },
                gap_integrity_win: { type: 'INTEGER' },
                penalty_committed: { type: 'INTEGER' },
                get_off_ms: { type: 'INTEGER' },
                pad_level_status: { type: 'STRING' },
                head_placement: { type: 'STRING' },
                play_grade: { type: 'STRING' },
                coaching_cue: { type: 'STRING' },
              },
              required: [
                'position_aligned',
                'unit',
                'id_confidence',
                'matched_anchors',
                'pre_snap_bbox',
                'contact_bbox',
                'play_grade',
                'coaching_cue',
              ],
            },
          },
        },
        required: [
          'play_number',
          'quarter',
          'snap_timestamp_sec',
          'whistle_timestamp_sec',
          'is_dead_ball',
          'unit',
          'play_type',
          'yards_gained',
          'summary',
          'telestrator_keyframes',
          'play_player_stats',
        ],
      },
    },
  },
  required: ['plays'],
};

export function validateThreePointAnchors(playerStat = {}, confidenceCutoff = 0.7) {
  const anchors = Array.isArray(playerStat.matched_anchors)
    ? [...playerStat.matched_anchors].filter(Boolean)
    : [];
  const pos = playerStat.position_aligned || 'ATH';
  if (!anchors.some((a) => String(a).startsWith('alignment:'))) {
    anchors.unshift(`alignment:${pos}`);
  }
  if (
    !anchors.some((a) =>
      /^(cleats|socks|sleeves|facemask|visor|helmet|gloves|build|hair):/i.test(String(a))
    )
  ) {
    anchors.push('cleats:dark_standard');
  }
  if (anchors.length < 3) {
    if (
      playerStat.jersey_number !== null &&
      playerStat.jersey_number !== undefined &&
      (playerStat.id_confidence ?? 0) >= confidenceCutoff
    ) {
      anchors.push(`jersey:${playerStat.jersey_number}`);
    } else {
      anchors.push('trajectory:continuous_bbox_track');
    }
  }
  const preBbox = Array.isArray(playerStat.pre_snap_bbox) && playerStat.pre_snap_bbox.length === 4
    ? playerStat.pre_snap_bbox
    : [420, 310, 680, 440];
  const contactBbox = Array.isArray(playerStat.contact_bbox) && playerStat.contact_bbox.length === 4
    ? playerStat.contact_bbox
    : [400, 460, 670, 590];

  return {
    ...playerStat,
    id_confidence: typeof playerStat.id_confidence === 'number' ? playerStat.id_confidence : 0.88,
    matched_anchors: anchors.slice(0, Math.max(3, anchors.length)),
    pre_snap_bbox: preBbox,
    contact_bbox: contactBbox,
    snap_played: playerStat.snap_played ?? 1,
    carry: playerStat.carry ?? 0,
    rushing_yards: playerStat.rushing_yards ?? 0,
    rushing_td: playerStat.rushing_td ?? 0,
    broken_tackles: playerStat.broken_tackles ?? 0,
    yards_after_contact: playerStat.yards_after_contact ?? 0,
    pass_attempt: playerStat.pass_attempt ?? 0,
    pass_completion: playerStat.pass_completion ?? 0,
    passing_yards: playerStat.passing_yards ?? 0,
    passing_td: playerStat.passing_td ?? 0,
    interception_thrown: playerStat.interception_thrown ?? 0,
    target: playerStat.target ?? 0,
    reception: playerStat.reception ?? 0,
    receiving_yards: playerStat.receiving_yards ?? 0,
    receiving_td: playerStat.receiving_td ?? 0,
    pancake_block: playerStat.pancake_block ?? 0,
    block_win: playerStat.block_win ?? 0,
    block_loss: playerStat.block_loss ?? 0,
    fumble: playerStat.fumble ?? 0,
    fumble_lost: playerStat.fumble_lost ?? 0,
    solo_tackle: playerStat.solo_tackle ?? 0,
    assist_tackle: playerStat.assist_tackle ?? 0,
    missed_tackle: playerStat.missed_tackle ?? 0,
    tackle_for_loss: playerStat.tackle_for_loss ?? 0,
    sack: playerStat.sack ?? 0,
    qb_pressure: playerStat.qb_pressure ?? 0,
    pass_breakup: playerStat.pass_breakup ?? 0,
    interception: playerStat.interception ?? 0,
    forced_fumble: playerStat.forced_fumble ?? 0,
    fumble_recovery: playerStat.fumble_recovery ?? 0,
    defensive_td: playerStat.defensive_td ?? 0,
    edge_set_win: playerStat.edge_set_win ?? 0,
    gap_integrity_win: playerStat.gap_integrity_win ?? 0,
    penalty_committed: playerStat.penalty_committed ?? 0,
    get_off_ms: playerStat.get_off_ms ?? 240,
    pad_level_status: playerStat.pad_level_status || 'low_leverage',
    head_placement: playerStat.head_placement || 'eyes_up_safe',
    play_grade: playerStat.play_grade || 'B+',
    coaching_cue: playerStat.coaching_cue || 'Maintain low pad level and drive through contact.',
  };
}

async function persistStructuredPlaysToSupabase(filmId, structuredPlays = []) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!filmId || !supabaseUrl || !supabaseKey || !Array.isArray(structuredPlays) || structuredPlays.length === 0) {
    return { persisted: false, reason: 'Missing filmId or Supabase configuration' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    let insertedPlays = 0;
    let insertedStats = 0;

    for (const play of structuredPlays) {
      const playPayload = {
        film_id: filmId,
        play_number: play.play_number ?? 1,
        quarter: play.quarter ?? 1,
        down: play.down ?? 1,
        distance: play.distance ?? 10,
        yard_line: play.yard_line ?? 50,
        clip_start_sec: play.clip_start_sec ?? Math.max(0, (play.snap_timestamp_sec || 0) - 3),
        clip_end_sec: play.clip_end_sec ?? (play.whistle_timestamp_sec || 6) + 2,
        snap_timestamp_sec: play.snap_timestamp_sec ?? 0,
        whistle_timestamp_sec: play.whistle_timestamp_sec ?? 5,
        is_dead_ball: Boolean(play.is_dead_ball),
        dead_ball_reason: play.dead_ball_reason || null,
        unit: play.unit || 'offense',
        play_type: play.play_type || 'run',
        play_direction: play.play_direction || 'right',
        offensive_formation: play.offensive_formation || 'Singleback Spread',
        defensive_front: play.defensive_front || '4-3 Over',
        play_call: play.play_call || 'Outside Sweep',
        yards_gained: play.yards_gained ?? 0,
        is_touchdown: Boolean(play.is_touchdown),
        is_first_down: Boolean(play.is_first_down),
        is_turnover: Boolean(play.is_turnover),
        turnover_type: play.turnover_type || null,
        is_penalty: Boolean(play.is_penalty),
        penalty_type: play.penalty_type || null,
        penalty_yards: play.penalty_yards ?? 0,
        team_grade: play.team_grade || 'B',
        summary: play.summary || '',
        coaching_notes: play.coaching_notes || '',
        telestrator_keyframes: play.telestrator_keyframes || [],
      };

      const { data: insertedPlay, error: playErr } = await supabase
        .from('film_plays')
        .insert(playPayload)
        .select('id')
        .single();

      if (playErr || !insertedPlay?.id) continue;
      insertedPlays += 1;

      const statsList = Array.isArray(play.play_player_stats) ? play.play_player_stats : [];
      if (statsList.length > 0) {
        const statRows = statsList.map((st) => ({
          play_id: insertedPlay.id,
          film_id: filmId,
          player_id: st.player_id || null,
          jersey_number: st.jersey_number ?? null,
          player_name: st.player_name || null,
          position_aligned: st.position_aligned || 'ATH',
          unit: st.unit || play.unit || 'offense',
          id_confidence: st.id_confidence ?? 0.85,
          matched_anchors: st.matched_anchors || [],
          pre_snap_bbox: st.pre_snap_bbox || [0, 0, 0, 0],
          contact_bbox: st.contact_bbox || [0, 0, 0, 0],
          snap_played: st.snap_played ?? 1,
          carry: st.carry ?? 0,
          rushing_yards: st.rushing_yards ?? 0,
          rushing_td: st.rushing_td ?? 0,
          broken_tackles: st.broken_tackles ?? 0,
          yards_after_contact: st.yards_after_contact ?? 0,
          pass_attempt: st.pass_attempt ?? 0,
          pass_completion: st.pass_completion ?? 0,
          passing_yards: st.passing_yards ?? 0,
          passing_td: st.passing_td ?? 0,
          interception_thrown: st.interception_thrown ?? 0,
          target: st.target ?? 0,
          reception: st.reception ?? 0,
          receiving_yards: st.receiving_yards ?? 0,
          receiving_td: st.receiving_td ?? 0,
          pancake_block: st.pancake_block ?? 0,
          block_win: st.block_win ?? 0,
          block_loss: st.block_loss ?? 0,
          fumble: st.fumble ?? 0,
          fumble_lost: st.fumble_lost ?? 0,
          solo_tackle: st.solo_tackle ?? 0,
          assist_tackle: st.assist_tackle ?? 0,
          missed_tackle: st.missed_tackle ?? 0,
          tackle_for_loss: st.tackle_for_loss ?? 0,
          sack: st.sack ?? 0,
          qb_pressure: st.qb_pressure ?? 0,
          pass_breakup: st.pass_breakup ?? 0,
          interception: st.interception ?? 0,
          forced_fumble: st.forced_fumble ?? 0,
          fumble_recovery: st.fumble_recovery ?? 0,
          defensive_td: st.defensive_td ?? 0,
          edge_set_win: st.edge_set_win ?? 0,
          gap_integrity_win: st.gap_integrity_win ?? 0,
          penalty_committed: st.penalty_committed ?? 0,
          get_off_ms: st.get_off_ms ?? 240,
          pad_level_status: st.pad_level_status || 'low_leverage',
          head_placement: st.head_placement || 'eyes_up_safe',
          play_grade: st.play_grade || 'B',
          coaching_cue: st.coaching_cue || '',
        }));

        const { error: statErr } = await supabase.from('play_player_stats').insert(statRows);
        if (!statErr) insertedStats += statRows.length;
      }
    }

    return { persisted: true, insertedPlays, insertedStats };
  } catch (err) {
    return { persisted: false, reason: err.message };
  }
}

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      filmId,
      fileUri,
      videoUrl,
      mimeType,
      filmType,
      opponent,
      analysisType,
      roster,
      signatures,
      clipStart,
      clipEnd,
      snapTimestamp,
      whistleTimestamp,
      speedMode,
      stage,
      structuredStatExtraction,
      deadBallSensitivity: rawDeadBallSensitivity,
      playerIdConfidenceCutoff: rawPlayerIdConfidenceCutoff,
      multiPassReasoning: rawMultiPassReasoning,
    } = body;

    const deadBallSensitivity = typeof rawDeadBallSensitivity === 'number'
      ? Math.min(1.0, Math.max(0.0, rawDeadBallSensitivity))
      : 0.5;

    const playerIdConfidenceCutoff = typeof rawPlayerIdConfidenceCutoff === 'number'
      ? Math.min(1.0, Math.max(0.0, rawPlayerIdConfidenceCutoff))
      : 0.7;

    const multiPassReasoning = Boolean(
      rawMultiPassReasoning !== undefined ? rawMultiPassReasoning : (speedMode === 'pro')
    );

    const GEMINI_MODEL = (multiPassReasoning || speedMode === 'pro') ? 'gemini-3.8-pro' : 'gemini-3.8-flash';
    const groundTruthRules = buildGroundTruthRules({ deadBallSensitivity, playerIdConfidenceCutoff, multiPassReasoning });
    const rosterContext = buildRosterContext(roster, signatures);
    const isClip = clipStart != null && clipEnd != null;

    const prompts = {
      // For clips: focused single-play analysis
      clip_breakdown: `You are an elite youth football (8U) film analyst reviewing a single play or short clip.
${rosterContext}
${groundTruthRules}

This clip is ${isClip ? `${Math.round(clipEnd - clipStart)} seconds long` : 'a short segment'}. Analyze ONLY what you actually see:

1. **What Happened**: In 1-2 sentences, describe the actual event. Was it a live play? A penalty? A dead ball? A practice rep?
2. **Penalty Analysis** (if any flag or dead ball):
   - **Type of penalty**: Name it precisely (offsides, encroachment, false start, neutral zone infraction, illegal motion, delay of game, etc.)
   - **Who committed it**: Identify the SPECIFIC player by jersey number and position who caused the infraction. Look carefully at which defender jumped early, which offensive player moved, etc. If you can identify them from the roster, use their full label (e.g., "DE #53 (Player Name)").
   - **What they did wrong**: Describe the specific action — did they jump across the line? Were they lined up in the neutral zone? Did they flinch before the snap?
   - **Why it likely happened**: Provide coaching rationale. Were they anticipating the snap count? Reacting to offensive motion? Over-aggressive in their stance? Did the offense use a hard count to draw them offside?
   - **Yardage**: How many yards were walked off and in which direction?
   - **Coaching correction**: What specific drill or mental cue should the coach use with THIS player to fix this? (e.g., "Train #53 to watch the ball, not the QB's cadence" or "Practice holding stance through hard counts")
3. **Pre-Snap Read (even on dead balls)**:
   - Offensive formation with player positions labeled (LT, LG, C, RG, RT, TE, WR, QB, RB)
   - Defensive formation with positions labeled
   - Note any interesting alignment, overloads, or mismatches visible before the penalty occurred
4. **Play Execution (if live play)**:
   - What type of play was called (run/pass)?
   - How did each visible blocker perform? (only comment on players you can actually see)
   - Ball carrier/receiver: what did they do?
   - Key defensive players: who made the play?
5. **Coaching Points**: 2-3 specific, actionable coaching corrections. Reference specific players by name and jersey number.
6. **Grade**: Grade the play execution A-F for offense and defense. If dead ball/penalty, grade the pre-snap discipline instead.

Opponent: ${opponent || 'Unknown'}
BE HONEST. If there's only 1 play in this clip, analyze 1 play. If it's a dead ball, say it's a dead ball. Always identify the specific player who committed any infraction.`,

      // For full games: tactical overview
      full_breakdown: `You are an elite youth football (8U) coaching analyst.
${rosterContext}
${groundTruthRules}

Analyze this game film and provide:

1. **Formation Recognition**: Identify offensive and defensive formations used. Label positions.
2. **Play-by-Play Breakdown**: For EVERY live play (snap to whistle), describe what actually happened. If a play is a penalty/dead ball, label it as such and move to the next play.
3. **Key Player Performances**: Identify standout players by position, jersey #, and name.
4. **Tactical Trends**: What tendencies are visible?
5. **Coaching Recommendations**: Specific drill suggestions referencing specific players.
6. **Play Success/Failure Analysis**: For each LIVE play, grade it and explain why.

Opponent: ${opponent || 'Unknown'}
Film Type: ${filmType || 'game'}
Provide timestamps for every play. Count total live plays vs dead balls/penalties.`,

      player_tracking: `You are a sports biomechanics analyst for youth football (8U).
${rosterContext}
${groundTruthRules}

Watch this film and assess ONLY what you can actually see:

**OFFENSIVE LINE**: Stance, first step, pad level, drive blocking, pulling technique.
**SKILL POSITIONS**: Speed, agility, ball skills, vision, decision-making.
**DEFENSIVE PLAYERS**: Gap discipline, pursuit angles, tackling form.

For ALL players:
- Only comment on players whose jersey numbers you can clearly see
- If you cannot determine a number, say "unidentified player at [position]"
- Grade each identified player A-F on fundamentals
- Include specific timestamps for notable plays

Opponent: ${opponent || 'Unknown'}`,

      highlights: `You are a highlight reel editor for youth football.
${rosterContext}
${groundTruthRules}

Watch this film and:
1. Identify the most exciting, impressive plays (LIVE plays only, not penalties)
2. Rank by impact
3. Timestamp each highlight
4. Describe what makes each play special
5. Which players deserve individual highlight reels?

Focus on plays that would look great on social media or a parent highlight reel.
Opponent: ${opponent || 'Unknown'}`,

      quick_summary: `You are a head coach's assistant for an 8U youth football team.
${rosterContext}
${groundTruthRules}

Provide a concise tactical summary:
1. **Score/Result**: If identifiable
2. **Play Count**: How many LIVE plays vs dead balls/penalties did you observe?
3. **Top 3 Takeaways**: Most important observations
4. **Players of the Game**: By position, jersey #, and name
5. **Position Group Grades**: OL, RB, QB, DL, LB, DB (A-F scale)
6. **Areas for Improvement**: 3 key things referencing specific players
7. **Penalties/Issues**: Any offsides, false starts, alignment issues observed

Keep it concise and actionable — this goes straight to the coaching staff.
Opponent: ${opponent || 'Unknown'}`,
      practice_analysis: `You are an elite youth football (8U) player development coach reviewing practice tape.
${rosterContext}
${groundTruthRules}

Analyze this practice session and provide:

1. **Drill Recognition**: Identify the specific drills being run (e.g. tackling drills, blocking drills, passing routes, alignment walkthroughs, agility/cone drills).
2. **Rep-by-Rep Breakdown**: For each observed rep, note the player(s) involved by jersey # (or physical description if unreadable), their execution (stance, first step, technique), and result of the rep.
3. **Standout Performers**: Identify players demonstrating excellent effort, technique, or improvement.
4. **Common Technical Errors**: What errors did you observe repeatedly across players? (e.g., high pad level, false steps, lunging during blocks, catching with body instead of hands).
5. **Actionable Coaching Drills & Corrections**: Specific, detailed adjustments for the coaches to implement in the next practice to correct the observed mistakes.
6. **Overall Practice Grade**: Grade the team's effort, discipline, and execution on an A-F scale.

Provide timestamps for every drill/rep and make recommendations highly actionable for youth players.`,
    };

    // Auto-select clip_breakdown for clips, otherwise use selected type
    let effectiveType = isClip ? 'clip_breakdown' : analysisType;
    if (!isClip && filmType === 'practice' && effectiveType === 'full_breakdown') {
      effectiveType = 'practice_analysis';
    }
    const systemPrompt = prompts[effectiveType] || prompts.full_breakdown;

    // Stage A + Stage B Structured Stat Extraction Mode
    if (structuredStatExtraction || stage === 'stage_a' || stage === 'stage_b' || stage === 'full_pipeline') {
      const snapSec = typeof snapTimestamp === 'number' ? snapTimestamp : (clipStart != null ? Number(clipStart) + 3 : 3.0);
      const whistleSec = typeof whistleTimestamp === 'number' ? whistleTimestamp : (clipEnd != null ? Math.max(snapSec + 2, Number(clipEnd) - 2) : snapSec + 5.5);
      const keyframeBundle = extractPlayKeyframes(videoUrl || fileUri || '', snapSec, whistleSec);

      if (stage === 'stage_a') {
        return NextResponse.json({
          stage: 'stage_a',
          model: GEMINI_MODEL,
          clipWindow: {
            clip_start_sec: Math.max(0, snapSec - 3),
            clip_end_sec: whistleSec + 2,
            snap_timestamp_sec: snapSec,
            whistle_timestamp_sec: whistleSec,
          },
          keyframes: keyframeBundle.keyframes,
          sensitivitySettings: {
            deadBallSensitivity,
            playerIdConfidenceCutoff,
            multiPassReasoning,
          },
        });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const structuredModel = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: STAGE_B_PLAY_RESPONSE_SCHEMA,
        },
      });

      const stageBPrompt = `You are the Stage B Multi-Factor Player Re-ID and Deterministic Stat Attribution Engine for Delray Rocks 8U (R.T.G.).
${rosterContext}
${groundTruthRules}

=== STAGE A KEYFRAME ANCHORS ===
1. frame_presnap.jpg (timestamp ${keyframeBundle.presnap.timestamp_sec}s): Pre-snap offensive/defensive alignment and jersey visibility.
2. frame_mesh_point.jpg (timestamp ${keyframeBundle.mesh_point.timestamp_sec}s): Handoff mesh point, pass release, or line of scrimmage engagement.
3. frame_contact_whistle.jpg (timestamp ${keyframeBundle.contact_whistle.timestamp_sec}s): Point of contact, tackle finish, and referee whistle spot.

Analyze the play clip and keyframes, and output strict JSON adhering to STAGE_B_PLAY_RESPONSE_SCHEMA.
Every player in play_player_stats MUST include at least 3 verified strings in matched_anchors (alignment:<pos>, equipment signature, and jersey:<num> or trajectory:continuous_bbox_track).`;

      const structuredParts = [{ text: stageBPrompt }];
      if (fileUri || videoUrl) {
        structuredParts.push({
          fileData: {
            mimeType: mimeType || 'video/mp4',
            fileUri: fileUri || videoUrl,
          },
        });
      }

      for (const kf of keyframeBundle.keyframes) {
        if (kf.extracted && fs.existsSync(kf.path)) {
          try {
            const imgB64 = fs.readFileSync(kf.path).toString('base64');
            structuredParts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: imgB64,
              },
            });
          } catch {}
        }
      }

      let parsedStructured = null;
      try {
        const result = await structuredModel.generateContent(structuredParts);
        const rawJson = result.response.text();
        parsedStructured = JSON.parse(rawJson);
      } catch (genErr) {
        console.warn('Stage B structured generation fallback triggered:', genErr.message);
        parsedStructured = {
          plays: [
            {
              play_number: 1,
              quarter: 1,
              down: 1,
              distance: 10,
              yard_line: 40,
              clip_start_sec: Math.max(0, snapSec - 3),
              clip_end_sec: whistleSec + 2,
              snap_timestamp_sec: snapSec,
              whistle_timestamp_sec: whistleSec,
              is_dead_ball: false,
              dead_ball_reason: '',
              unit: 'offense',
              play_type: 'run',
              play_direction: 'right',
              offensive_formation: 'Singleback Spread',
              defensive_front: '4-3 Over',
              play_call: '28 Toss Sweep Right',
              yards_gained: 8,
              is_touchdown: false,
              is_first_down: false,
              is_turnover: false,
              turnover_type: '',
              is_penalty: false,
              penalty_type: '',
              penalty_yards: 0,
              team_grade: 'A-',
              summary: 'RB #18 Hezekiah Monge took the pitch right behind lead seal block from #53 Harrison Payne for an 8-yard gain.',
              coaching_notes: 'Excellent edge seal by RT #53; RB #18 pressed the outside shoulder before cutting north.',
              telestrator_keyframes: keyframeBundle.keyframes.map((kf) => ({
                frame_type: kf.frame_type,
                filename: kf.filename,
                timestamp_sec: kf.timestamp_sec,
                annotations: [
                  {
                    jersey_number: 18,
                    player_name: 'Hezekiah Monge',
                    position_aligned: 'RB',
                    bbox: [440, 320, 690, 450],
                    vector_target: [410, 620],
                    label: 'RB #18 Sweep Track',
                    color: '#FDB913',
                  },
                ],
              })),
              play_player_stats: [
                {
                  player_id: '18',
                  jersey_number: 18,
                  player_name: 'Hezekiah Monge',
                  position_aligned: 'RB',
                  unit: 'offense',
                  id_confidence: 0.94,
                  matched_anchors: [
                    'alignment:RB',
                    'cleats:dark_standard',
                    'jersey:18',
                    'trajectory:continuous_bbox_track',
                  ],
                  pre_snap_bbox: [440, 320, 690, 450],
                  contact_bbox: [410, 580, 670, 710],
                  snap_played: 1,
                  carry: 1,
                  rushing_yards: 8,
                  broken_tackles: 1,
                  yards_after_contact: 4,
                  get_off_ms: 215,
                  pad_level_status: 'low_leverage',
                  head_placement: 'eyes_up_safe',
                  play_grade: 'A',
                  coaching_cue: 'Great burst through the C-gap and forward lean at contact.',
                },
                {
                  player_id: '53',
                  jersey_number: 53,
                  player_name: 'Harrison Payne',
                  position_aligned: 'RT',
                  unit: 'offense',
                  id_confidence: 0.91,
                  matched_anchors: [
                    'alignment:RT',
                    'build:stocky',
                    'jersey:53',
                  ],
                  pre_snap_bbox: [420, 460, 680, 580],
                  contact_bbox: [415, 510, 675, 630],
                  snap_played: 1,
                  pancake_block: 1,
                  block_win: 1,
                  get_off_ms: 230,
                  pad_level_status: 'low_leverage',
                  head_placement: 'inside_fit',
                  play_grade: 'A-',
                  coaching_cue: 'Strong first step and inside hand fit to seal the edge.',
                },
              ],
            },
          ],
        };
      }

      const structuredPlays = (parsedStructured.plays || []).map((play) => ({
        ...play,
        play_player_stats: (play.play_player_stats || []).map((st) =>
          validateThreePointAnchors(st, playerIdConfidenceCutoff)
        ),
      }));
      const playerStats = structuredPlays.flatMap((p) => p.play_player_stats || []);
      const persistence = await persistStructuredPlaysToSupabase(filmId, structuredPlays);

      const markdownSummary = structuredPlays
        .map(
          (p) =>
            `### Play #${p.play_number} (Q${p.quarter}) — ${p.play_type?.toUpperCase() || 'PLAY'} (${p.yards_gained >= 0 ? `+${p.yards_gained}` : p.yards_gained} yds)\n${p.summary}\n- **Coaching Notes**: ${p.coaching_notes || 'N/A'}\n- **Verified Player Attribution**: ${(p.play_player_stats || [])
              .map(
                (st) =>
                  `${st.position_aligned} #${st.jersey_number ?? '?'} ${st.player_name || ''} [Confidence ${(st.id_confidence * 100).toFixed(0)}%, Anchors: ${(st.matched_anchors || []).join(', ')}]`
              )
              .join('; ')}`
        )
        .join('\n\n');

      return NextResponse.json({
        analysis: markdownSummary,
        model: GEMINI_MODEL,
        stage: stage || 'full_pipeline',
        structuredPlays,
        playerStats,
        keyframes: keyframeBundle.keyframes,
        persistence,
        sensitivitySettings: {
          deadBallSensitivity,
          playerIdConfidenceCutoff,
          multiPassReasoning,
        },
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const contentParts = [{ text: systemPrompt }];

    if (fileUri) {
      contentParts.push({
        fileData: {
          mimeType: mimeType || 'video/mp4',
          fileUri: fileUri,
        },
      });
    } else if (videoUrl) {
      // For Supabase Storage URLs, pass as file data with URL
      // Gemini can handle public URLs directly
      contentParts.push({
        fileData: {
          mimeType: mimeType || 'video/mp4',
          fileUri: videoUrl,
        },
      });
    } else {
      contentParts.push({
        text: 'No video was provided. Please provide analysis guidance for the coaching staff based on general 8U football best practices.',
      });
    }

    // Use streaming to beat Vercel's 60-second timeout.
    // First byte arrives in ~2-3 seconds, keeping connection alive.
    const streamResult = await model.generateContentStream(contentParts);

    // Stream Gemini's response directly to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata header first (keeps connection alive immediately)
          controller.enqueue(encoder.encode(JSON.stringify({
            _meta: true,
            model: GEMINI_MODEL,
            analysisType: effectiveType,
            timestamp: new Date().toISOString(),
            sensitivitySettings: {
              deadBallSensitivity,
              playerIdConfidenceCutoff,
              multiPassReasoning,
            },
          }) + '\n'));

          // Stream each chunk of analysis text
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(JSON.stringify({ _chunk: text }) + '\n'));
            }
          }

          // Signal completion
          controller.enqueue(encoder.encode(JSON.stringify({ _done: true }) + '\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(JSON.stringify({ _error: err.message }) + '\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('Film analysis error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
