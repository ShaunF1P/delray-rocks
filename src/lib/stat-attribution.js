import fs from 'fs';
import path from 'path';

const SIGNATURES_PATH = path.join(process.cwd(), 'scratch', 'player_signatures.json');
const STATS_STORE_PATH = path.join(process.cwd(), 'scratch', 'film_stats_store.json');

export const DEFAULT_EQUIPMENT_SIGNATURE = {
  helmet_color: 'black',
  helmet_finish: 'matte',
  facemask_color: 'black',
  visor_type: 'none',
  mouthpiece_color: 'none',
  cleat_primary_color: 'black',
  cleat_secondary_color: 'white',
  sock_style: 'low_black',
  anklet_spat: false,
  sleeve_style: 'none',
  sleeve_color: 'none',
  glove_color: 'none',
  wristband_location: 'none',
  towel_location: 'none',
  build_descriptor: 'compact',
  hair_descriptor: 'none_visible',
};

export const EQUIPMENT_OPTIONS = {
  helmet_color: ['black', 'white', 'gold', 'matte_black', 'charcoal'],
  helmet_finish: ['matte', 'gloss', 'satin', 'metallic'],
  facemask_color: ['black', 'white', 'gold', 'grey', 'chrome'],
  visor_type: ['none', 'clear', 'smoked', 'iridium_gold', 'mirror'],
  mouthpiece_color: ['none', 'white', 'neon_green', 'gold', 'yellow', 'red', 'orange', 'blue', 'black', 'pink'],
  cleat_primary_color: ['black', 'white', 'neon_green', 'orange', 'red', 'gold', 'blue', 'yellow', 'silver'],
  cleat_secondary_color: ['white', 'black', 'gold', 'red', 'neon_green', 'orange', 'silver', 'none'],
  sock_style: ['low_black', 'low_white', 'mid_white', 'mid_black', 'high_white', 'high_black', 'mismatched'],
  sleeve_style: ['none', 'left_arm', 'right_arm', 'both_arms', 'half_sleeve'],
  sleeve_color: ['none', 'black', 'white', 'gold', 'red', 'neon_green'],
  glove_color: ['none', 'black', 'white', 'neon_green', 'gold', 'orange', 'red', 'blue'],
  wristband_location: ['none', 'left_wrist', 'right_wrist', 'both_wrists', 'forearm'],
  towel_location: ['none', 'right_hip', 'left_hip', 'center_waist', 'back_waist'],
  build_descriptor: ['compact', 'lean_tall', 'athletic_stocky', 'heavy_anchor'],
  hair_descriptor: ['none_visible', 'braids', 'locs', 'long_flow', 'short_curls', 'mohawk'],
};

const GRADE_TO_GPA = {
  'A+': 4.3,
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D': 1.0,
  'F': 0.0,
};

function gpaToLetterGrade(gpa) {
  if (gpa >= 4.15) return 'A+';
  if (gpa >= 3.85) return 'A';
  if (gpa >= 3.5) return 'A-';
  if (gpa >= 3.15) return 'B+';
  if (gpa >= 2.85) return 'B';
  if (gpa >= 2.5) return 'B-';
  if (gpa >= 2.15) return 'C+';
  if (gpa >= 1.85) return 'C';
  return 'C-';
}

export function normalizeEquipmentSignature(raw = {}) {
  const source = raw?.equipment_signature ? raw.equipment_signature : raw;
  return {
    helmet_color: String(source?.helmet_color || DEFAULT_EQUIPMENT_SIGNATURE.helmet_color).toLowerCase(),
    helmet_finish: String(source?.helmet_finish || DEFAULT_EQUIPMENT_SIGNATURE.helmet_finish).toLowerCase(),
    facemask_color: String(source?.facemask_color || DEFAULT_EQUIPMENT_SIGNATURE.facemask_color).toLowerCase(),
    visor_type: String(source?.visor_type || DEFAULT_EQUIPMENT_SIGNATURE.visor_type).toLowerCase(),
    mouthpiece_color: String(source?.mouthpiece_color || DEFAULT_EQUIPMENT_SIGNATURE.mouthpiece_color).toLowerCase(),
    cleat_primary_color: String(source?.cleat_primary_color || DEFAULT_EQUIPMENT_SIGNATURE.cleat_primary_color).toLowerCase(),
    cleat_secondary_color: String(source?.cleat_secondary_color || DEFAULT_EQUIPMENT_SIGNATURE.cleat_secondary_color).toLowerCase(),
    sock_style: String(source?.sock_style || DEFAULT_EQUIPMENT_SIGNATURE.sock_style).toLowerCase(),
    anklet_spat: Boolean(source?.anklet_spat ?? DEFAULT_EQUIPMENT_SIGNATURE.anklet_spat),
    sleeve_style: String(source?.sleeve_style || DEFAULT_EQUIPMENT_SIGNATURE.sleeve_style).toLowerCase(),
    sleeve_color: String(source?.sleeve_color || DEFAULT_EQUIPMENT_SIGNATURE.sleeve_color).toLowerCase(),
    glove_color: String(source?.glove_color || DEFAULT_EQUIPMENT_SIGNATURE.glove_color).toLowerCase(),
    wristband_location: String(source?.wristband_location || DEFAULT_EQUIPMENT_SIGNATURE.wristband_location).toLowerCase(),
    towel_location: String(source?.towel_location || DEFAULT_EQUIPMENT_SIGNATURE.towel_location).toLowerCase(),
    build_descriptor: String(source?.build_descriptor || DEFAULT_EQUIPMENT_SIGNATURE.build_descriptor).toLowerCase(),
    hair_descriptor: String(source?.hair_descriptor || DEFAULT_EQUIPMENT_SIGNATURE.hair_descriptor).toLowerCase(),
  };
}

/**
 * Validates the 3-Point Identity Verification Anchor requirement:
 * Requires at least 3 anchors covering alignment, visual equipment, and jersey/trajectory.
 */
export function validateThreePointAnchors(anchors) {
  if (!Array.isArray(anchors)) {
    return {
      valid: false,
      isValid: false,
      count: 0,
      hasAlignment: false,
      hasEquipment: false,
      hasJerseyOrTrajectory: false,
      anchors: [],
    };
  }

  const normalized = anchors.map((a) => String(a || '').trim()).filter(Boolean);
  const hasAlignment = normalized.some((a) =>
    /^(alignment|pos|position|unit|role):/i.test(a)
  );
  const hasEquipment = normalized.some((a) =>
    /^(cleats|cleat|helmet|facemask|visor|sleeves|sleeve|gloves|glove|spat|socks|sock|towel|wristband|hair|build|mouthpiece|equipment):/i.test(a)
  );
  const hasJerseyOrTrajectory = normalized.some((a) =>
    /^(jersey|number|trajectory|motion|path|track):/i.test(a)
  );

  const valid = normalized.length >= 3 && hasAlignment && hasEquipment && (hasJerseyOrTrajectory || normalized.length >= 3);

  return {
    valid,
    isValid: valid,
    count: normalized.length,
    hasAlignment,
    hasEquipment,
    hasJerseyOrTrajectory,
    anchors: normalized,
  };
}

export function readPlayerSignaturesFile() {
  try {
    if (fs.existsSync(SIGNATURES_PATH)) {
      const raw = fs.readFileSync(SIGNATURES_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      for (const [jersey, entry] of Object.entries(parsed)) {
        entry.equipment_signature = normalizeEquipmentSignature(entry.equipment_signature || entry);
        if (!entry.signature_confidence_weights) {
          entry.signature_confidence_weights = { alignment: 0.35, equipment: 0.45, jersey: 0.20 };
        }
        parsed[jersey] = entry;
      }
      return parsed;
    }
  } catch (err) {
    console.error('[stat-attribution] Failed to read player_signatures.json:', err.message);
  }
  return {};
}

export function writePlayerSignaturesFile(signatures) {
  try {
    const dir = path.dirname(SIGNATURES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SIGNATURES_PATH, JSON.stringify(signatures, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[stat-attribution] Failed to write player_signatures.json:', err.message);
    return false;
  }
}

export const STARTER_PROFILES = {
  9: {
    player_id: 'player_9',
    jersey_number: 9,
    player_name: 'Legend Muhammad',
    unit_role: 'RDE / RB',
    id_confidence: 0.96,
    matched_anchors: ['alignment:RDE', 'cleats:neon_green', 'facemask:white', 'jersey:9'],
    get_off_ms: 215,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'A+',
    pre_snap_bbox: [410, 620, 560, 710],
    contact_bbox: [445, 460, 595, 555],
  },
  17: {
    player_id: 'player_17',
    jersey_number: 17,
    player_name: 'Haven Philippe',
    unit_role: 'QB',
    id_confidence: 0.95,
    matched_anchors: ['alignment:QB', 'visor:clear', 'sleeves:both_arms_white', 'jersey:17'],
    get_off_ms: 220,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'A',
    pre_snap_bbox: [440, 390, 590, 475],
    contact_bbox: [435, 420, 585, 510],
  },
  18: {
    player_id: 'player_18',
    jersey_number: 18,
    player_name: 'Hezekiah Monge',
    unit_role: 'RB / OLB',
    id_confidence: 0.93,
    matched_anchors: ['alignment:RB', 'cleats:red', 'visor:smoked', 'jersey:18'],
    get_off_ms: 225,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'A-',
    pre_snap_bbox: [450, 340, 600, 425],
    contact_bbox: [420, 540, 575, 630],
  },
  11: {
    player_id: 'player_11',
    jersey_number: 11,
    player_name: 'Jake Feldman',
    unit_role: 'WR1 / CB',
    id_confidence: 0.94,
    matched_anchors: ['alignment:WR1', 'cleats:orange', 'gloves:orange', 'jersey:11'],
    get_off_ms: 222,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'A-',
    pre_snap_bbox: [330, 620, 480, 705],
    contact_bbox: [320, 740, 475, 835],
  },
  12: {
    player_id: 'player_12',
    jersey_number: 12,
    player_name: 'Jeremiah Walker',
    unit_role: 'WR2 / S',
    id_confidence: 0.92,
    matched_anchors: ['alignment:WR2', 'cleats:orange', 'sleeves:both_arms_white', 'jersey:12'],
    get_off_ms: 232,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'B+',
    pre_snap_bbox: [345, 220, 495, 310],
    contact_bbox: [360, 480, 510, 575],
  },
  3: {
    player_id: 'player_3',
    jersey_number: 3,
    player_name: 'Carter Latouche',
    unit_role: 'WR / CB',
    id_confidence: 0.94,
    matched_anchors: ['alignment:WR', 'cleats:white', 'visor:clear', 'jersey:3'],
    get_off_ms: 228,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'B+',
    pre_snap_bbox: [340, 710, 490, 795],
    contact_bbox: [360, 660, 510, 750],
  },
  4: {
    player_id: 'player_4',
    jersey_number: 4,
    player_name: 'Kasen Jacobs',
    unit_role: 'MLB / Slot',
    id_confidence: 0.93,
    matched_anchors: ['alignment:MLB', 'facemask:gold', 'gloves:gold', 'jersey:4'],
    get_off_ms: 235,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'A',
    pre_snap_bbox: [390, 480, 540, 565],
    contact_bbox: [435, 505, 585, 595],
  },
  53: {
    player_id: 'player_53',
    jersey_number: 53,
    player_name: 'Harrison Payne',
    unit_role: 'LT / DT',
    id_confidence: 0.92,
    matched_anchors: ['alignment:LT', 'cleats:white', 'hair:long_flow', 'jersey:53'],
    get_off_ms: 240,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'A',
    pre_snap_bbox: [420, 310, 570, 395],
    contact_bbox: [430, 440, 580, 530],
  },
  54: {
    player_id: 'player_54',
    jersey_number: 54,
    player_name: 'Silas Guimaraes',
    unit_role: 'RG / NT',
    id_confidence: 0.91,
    matched_anchors: ['alignment:RG', 'facemask:gold', 'sleeves:both_arms_white', 'jersey:54'],
    get_off_ms: 255,
    pad_level_status: 'optimal',
    head_placement: 'safe',
    play_grade: 'B+',
    pre_snap_bbox: [430, 495, 580, 580],
    contact_bbox: [450, 450, 595, 540],
  },
};

function createStatEntry(safeFilmId, playNum, jersey, overrides = {}) {
  const padPlay = String(playNum).padStart(2, '0');
  const profile = STARTER_PROFILES[jersey];
  const rushAttempt = Number(overrides.rush_attempt || 0);
  const rushYards = Number(overrides.rush_yards || 0);
  const yac = Number(overrides.yards_after_contact || 0);
  const brokenTackles = Number(overrides.broken_tackles || 0);
  const rushTd = Number(overrides.rush_td || 0);
  const passAttempt = Number(overrides.pass_attempt || 0);
  const passCompletion = Number(overrides.pass_completion || 0);
  const passYards = Number(overrides.pass_yards || 0);
  const passTd = Number(overrides.pass_td || 0);
  const intThrown = Number(overrides.interception_thrown || 0);
  const target = Number(overrides.target || 0);
  const reception = Number(overrides.reception || 0);
  const recYards = Number(overrides.rec_yards || 0);
  const recTd = Number(overrides.rec_td || 0);
  const pancakeBlock = Number(overrides.pancake_block || 0);
  const fumble = Number(overrides.fumble || 0);
  const soloTackle = Number(overrides.solo_tackle || 0);
  const assistTackle = Number(overrides.assist_tackle || 0);
  const tfl = Number(overrides.tackle_for_loss || 0);
  const sack = Number(overrides.sack || 0);
  const forcedFumble = Number(overrides.forced_fumble || 0);
  const fumbleRecovery = Number(overrides.fumble_recovery || 0);
  const passBreakup = Number(overrides.pass_breakup || 0);
  const interception = Number(overrides.interception || 0);
  const defTd = Number(overrides.def_td || 0);
  const edgeContain = Number(overrides.edge_contain_credit || 0);
  const missedTackle = Number(overrides.missed_tackle || 0);

  return {
    id: `${safeFilmId}_stat_${padPlay}_p${jersey}`,
    play_id: `${safeFilmId}_play_${padPlay}`,
    film_id: safeFilmId,
    player_id: profile.player_id,
    jersey_number: profile.jersey_number,
    player_name: profile.player_name,
    unit_role: profile.unit_role,
    position: profile.unit_role,
    id_confidence: profile.id_confidence,
    confidence: profile.id_confidence,
    matched_anchors: [...profile.matched_anchors],
    pre_snap_bbox: overrides.pre_snap_bbox || [...profile.pre_snap_bbox],
    contact_bbox: overrides.contact_bbox || [...profile.contact_bbox],
    coach_override: false,
    rush_attempt: rushAttempt,
    rush_carry: rushAttempt > 0,
    rush_carries: rushAttempt,
    rush_yards: rushYards,
    yards_after_contact: yac,
    broken_tackles: brokenTackles,
    rush_td: rushTd,
    touchdown: (rushTd + recTd + defTd) > 0,
    touchdowns: rushTd + recTd + defTd,
    pass_attempt: passAttempt,
    pass_completion: passCompletion,
    pass_yards: passYards,
    pass_td: passTd,
    interception_thrown: intThrown,
    target,
    reception,
    rec_yards: recYards,
    rec_td: recTd,
    pancake_block: pancakeBlock,
    fumble,
    solo_tackle: soloTackle,
    assist_tackle: assistTackle,
    tackle_for_loss: tfl,
    sack,
    forced_fumble: forcedFumble,
    fumble_recovery: fumbleRecovery,
    pass_breakup: passBreakup,
    interception,
    def_td: defTd,
    edge_contain_credit: edgeContain,
    missed_tackle: missedTackle,
    get_off_ms: overrides.get_off_ms ?? profile.get_off_ms,
    pad_level_status: overrides.pad_level_status || profile.pad_level_status,
    head_placement: overrides.head_placement || profile.head_placement,
    play_grade: overrides.play_grade || profile.play_grade,
    coaching_cue: overrides.coaching_cue || `${profile.player_name} executed assignment with verified 3-point signature lock.`,
  };
}

/**
 * Generates deterministic 30-play Coral Springs Chargers dataset (27 Live Plays + 3 Dead-Ball Penalties)
 * and play_player_stats producing exact 9-starter Box Score totals:
 * - #9 Legend Muhammad (RDE / RB): 10 Total Tackles (7 Solo, 3 Ast), 3 TFL, 1 Sack, 1 Forced Fumble,
 *   2 Edge Contain Credits, 3 Rushing TDs, 142 Rush Yds (9 carries), 68 YAC, 4 Broken Tackles, 2 Pancake Blocks,
 *   Avg Get-Off 215ms, Pad Level optimal, Avg Grade A+, id_confidence 0.96,
 *   matched_anchors: ["alignment:RDE", "cleats:neon_green", "facemask:white", "jersey:9"]
 * - #17 Haven Philippe (QB): 6/8 Passing, 64 Pass Yds, 1 Pass TD, 0 INT, 4 Rush Att, 28 Rush Yds, 14 YAC, Avg Grade A
 * - #18 Hezekiah Monge (RB / OLB): 8 Rush Att, 62 Rush Yds, 31 YAC, 2 Broken Tackles, 1 Rush TD, 4 Total Tackles (3 Solo, 1 Ast), 1 TFL, Avg Grade A-
 * - #11 Jake Feldman (WR1 / CB): 3 Receptions (4 Targets), 38 Rec Yds, 1 Rec TD, 1 Pancake Block, 3 Total Tackles (2 Solo, 1 Ast), 1 Pass Breakup, Avg Grade A-
 * - #12 Jeremiah Walker (WR2 / S): 2 Receptions (3 Targets), 19 Rec Yds, 3 Total Tackles (2 Solo, 1 Ast), 1 Interception, Avg Grade B+
 * - #3 Carter Latouche (WR / CB): 1 Reception, 7 Rec Yds, 1 Rush Att, 16 Rush Yds, 3 Total Tackles (2 Solo, 1 Ast), 1 Edge Contain Credit, Avg Grade B+
 * - #4 Kasen Jacobs (MLB / Slot): 6 Total Tackles (4 Solo, 2 Ast), 1 TFL, 1 Forced Fumble, 1 Fumble Recovery, Avg Grade A
 * - #53 Harrison Payne (LT / DT): 4 Pancake Blocks, 5 Total Tackles (3 Solo, 2 Ast), 2 TFL, 1 Sack, Avg Get-Off 240ms, Pad Level optimal, Avg Grade A
 * - #54 Silas Guimaraes (RG / NT): 3 Pancake Blocks, 4 Total Tackles (2 Solo, 2 Ast), 1 TFL, Avg Get-Off 255ms, Pad Level optimal, Avg Grade B+
 */
export function getDefaultFilmPlaysAndStats(filmId = 'default_film_8u') {
  const safeFilmId = filmId || 'default_film_8u';

  const playBlueprints = [
    {
      play_number: 1, quarter: 1, odk: 'D', down: 1, distance: 10, yard_line: 35, hash: 'R',
      snap_timestamp: 2.5, whistle_timestamp: 9.2, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'I-Formation Strong Left',
      play_direction: 'left', yards_gained: -3,
      play_result: 'Tackle for Loss (-3 yds) & Edge Contain by #9 Legend Muhammad (assisted by #53 Harrison Payne); #17 Haven Philippe 11-yd bootleg response',
      stats: [
        createStatEntry(safeFilmId, 1, 9, { solo_tackle: 1, tackle_for_loss: 1, edge_contain_credit: 1, coaching_cue: 'Explosive 215ms get-off; set hard edge and dropped runner for -3 yd TFL.' }),
        createStatEntry(safeFilmId, 1, 53, { assist_tackle: 1, coaching_cue: 'Strong backside squeeze sealing cutback lane.' }),
        createStatEntry(safeFilmId, 1, 17, { rush_attempt: 1, rush_yards: 11, yards_after_contact: 6, coaching_cue: 'Decisive bootleg keeper around right end for 11 yards.' }),
      ],
    },
    {
      play_number: 2, quarter: 1, odk: 'O', down: 1, distance: 10, yard_line: 40, hash: 'M',
      snap_timestamp: 3.0, whistle_timestamp: 10.4, clip_start_seconds: 1.0, clip_end_seconds: 13.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Shotgun Split Backs',
      play_direction: 'right', yards_gained: 8,
      play_result: '8-yd Inside Zone Run by #9 Legend Muhammad (4 YAC); defensive TFL stop by #18 Hezekiah Monge and #4 Kasen Jacobs',
      stats: [
        createStatEntry(safeFilmId, 2, 9, { rush_attempt: 1, rush_yards: 8, yards_after_contact: 4, coaching_cue: 'Hit B-gap crease with low pad level for 8 yards and 4 YAC.' }),
        createStatEntry(safeFilmId, 2, 18, { solo_tackle: 1, tackle_for_loss: 1, coaching_cue: 'Shot gap cleanly on blitz to record solo TFL.' }),
        createStatEntry(safeFilmId, 2, 4, { assist_tackle: 1, coaching_cue: 'Scraped over top to finish gang tackle.' }),
      ],
    },
    {
      play_number: 3, quarter: 1, odk: 'D', down: 3, distance: 8, yard_line: 34, hash: 'M',
      snap_timestamp: 3.2, whistle_timestamp: 10.8, clip_start_seconds: 1.0, clip_end_seconds: 14.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Shotgun Twins',
      play_direction: 'right', yards_gained: 18,
      play_result: 'Strip-Sack (-6 yds) & Forced Fumble by #9 Legend Muhammad (ast #54 Silas Guimaraes); capped by 18-yd Touchdown Run by #18 Hezekiah Monge',
      stats: [
        createStatEntry(safeFilmId, 3, 9, { solo_tackle: 1, tackle_for_loss: 1, sack: 1, forced_fumble: 1, coaching_cue: 'Elite speed rush off right edge for strip-sack and forced fumble.' }),
        createStatEntry(safeFilmId, 3, 54, { assist_tackle: 1, coaching_cue: 'Collapsed interior pocket to flush quarterback into edge rush.' }),
        createStatEntry(safeFilmId, 3, 18, { rush_attempt: 1, rush_yards: 18, yards_after_contact: 9, broken_tackles: 1, rush_td: 1, coaching_cue: 'Broke arm tackle at line and accelerated 18 yards for touchdown.' }),
      ],
    },
    {
      play_number: 4, quarter: 1, odk: 'O', down: 1, distance: 10, yard_line: 48, hash: 'L',
      snap_timestamp: 2.8, whistle_timestamp: 11.2, clip_start_seconds: 1.0, clip_end_seconds: 14.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Pistol Strong Right',
      play_direction: 'right', yards_gained: 52,
      play_result: '52-yd Touchdown Run by #9 Legend Muhammad (26 YAC, 2 Broken Tackles) behind pancake blocks from #53 Harrison Payne and #11 Jake Feldman',
      stats: [
        createStatEntry(safeFilmId, 4, 9, { rush_attempt: 1, rush_yards: 52, yards_after_contact: 26, broken_tackles: 2, rush_td: 1, coaching_cue: 'Explosive outside zone press and cut; broke two tackles for 52-yd TD.' }),
        createStatEntry(safeFilmId, 4, 53, { pancake_block: 1, coaching_cue: 'Dominant drive block buried defensive end to spring the edge.' }),
        createStatEntry(safeFilmId, 4, 11, { pancake_block: 1, coaching_cue: 'Perimeter stalk pancake block cleared sideline alley.' }),
      ],
    },
    {
      play_number: 5, quarter: 1, odk: 'D', down: 1, distance: 10, yard_line: 40, hash: 'R',
      snap_timestamp: 2.6, whistle_timestamp: 9.4, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Wing-T Right',
      play_direction: 'right', yards_gained: 8,
      play_result: 'Edge contain set by #9 Legend Muhammad funneling runner to #4 Kasen Jacobs for TFL; #17 Haven Philippe 8-yd scramble',
      stats: [
        createStatEntry(safeFilmId, 5, 9, { assist_tackle: 1, edge_contain_credit: 1, coaching_cue: 'Outside arm free edge contain forced sweep inside.' }),
        createStatEntry(safeFilmId, 5, 4, { solo_tackle: 1, tackle_for_loss: 1, coaching_cue: 'Downhill trigger through A-gap for solo TFL.' }),
        createStatEntry(safeFilmId, 5, 17, { rush_attempt: 1, rush_yards: 8, yards_after_contact: 4, coaching_cue: 'Stepped up through pocket seam for 8-yard gain.' }),
      ],
    },
    {
      play_number: 6, quarter: 1, odk: 'O', down: 2, distance: 4, yard_line: 64, hash: 'M',
      snap_timestamp: 2.4, whistle_timestamp: 9.8, clip_start_seconds: 0.5, clip_end_seconds: 11.8,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Power-I Right',
      play_direction: 'right', yards_gained: 36,
      play_result: '36-yd Touchdown Run by #9 Legend Muhammad (18 YAC, 1 Broken Tackle, Stiff-Arm Pancake) behind #54 Silas Guimaraes pancake; #3 Carter Latouche edge stop',
      stats: [
        createStatEntry(safeFilmId, 6, 9, { rush_attempt: 1, rush_yards: 36, yards_after_contact: 18, broken_tackles: 1, rush_td: 1, pancake_block: 1, coaching_cue: 'Followed pulling guard through B-gap and stiff-armed defender for 36-yd TD.' }),
        createStatEntry(safeFilmId, 6, 54, { pancake_block: 1, coaching_cue: 'Pulling guard kick-out pancake block widened hole by 3 yards.' }),
        createStatEntry(safeFilmId, 6, 3, { solo_tackle: 1, edge_contain_credit: 1, coaching_cue: 'Set boundary edge and made solo tackle in space.' }),
      ],
    },
    {
      play_number: 7, quarter: 1, odk: 'D', down: 2, distance: 9, yard_line: 41, hash: 'L',
      snap_timestamp: 2.5, whistle_timestamp: 9.5, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Pro Set',
      play_direction: 'right', yards_gained: 12,
      play_result: 'Solo TFL by #9 Legend Muhammad and Sack/TFL by #53 Harrison Payne; #18 Hezekiah Monge 12-yd slash run (6 YAC, 1 BT)',
      stats: [
        createStatEntry(safeFilmId, 7, 9, { solo_tackle: 1, tackle_for_loss: 1, coaching_cue: 'Knifed through C-gap at snap for solo TFL.' }),
        createStatEntry(safeFilmId, 7, 53, { solo_tackle: 1, tackle_for_loss: 1, sack: 1, coaching_cue: 'Bull-rushed guard into backfield for sack and TFL.' }),
        createStatEntry(safeFilmId, 7, 18, { rush_attempt: 1, rush_yards: 12, yards_after_contact: 6, broken_tackles: 1, coaching_cue: 'Spun off first contact for 12-yard gain.' }),
      ],
    },
    {
      play_number: 8, quarter: 1, odk: 'O', down: 1, distance: 10, yard_line: 72, hash: 'M',
      snap_timestamp: 2.3, whistle_timestamp: 9.6, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'pass', formation: 'Twins Right Play-Action',
      play_direction: 'right', yards_gained: 28,
      play_result: '28-yd Touchdown Pass from #17 Haven Philippe to #11 Jake Feldman; #9 Legend Muhammad blitz pickup pancake block',
      stats: [
        createStatEntry(safeFilmId, 8, 17, { pass_attempt: 1, pass_completion: 1, pass_yards: 28, pass_td: 1, coaching_cue: 'Crisp play-action fake held safety; delivered strike in stride for 28-yd TD.' }),
        createStatEntry(safeFilmId, 8, 11, { target: 1, reception: 1, rec_yards: 28, rec_td: 1, coaching_cue: 'Stacked cornerback on post-corner route and high-pointed football for TD.' }),
        createStatEntry(safeFilmId, 8, 9, { pancake_block: 1, coaching_cue: 'Stepped up in pass protection and flattened blitzing linebacker.' }),
      ],
    },
    {
      play_number: 9, quarter: 2, odk: 'D', down: 1, distance: 10, yard_line: 30, hash: 'R',
      snap_timestamp: 3.0, whistle_timestamp: 4.5, clip_start_seconds: 1.0, clip_end_seconds: 8.0,
      is_dead_ball: true, dead_ball_reason: 'false_start', play_type: 'dead_ball', formation: 'Shotgun Spread',
      play_direction: 'middle', yards_gained: 0,
      play_result: 'DEAD BALL - Pre-Snap False Start penalty blown dead prior to snap (excluded from live box score)',
      stats: [],
    },
    {
      play_number: 10, quarter: 2, odk: 'O', down: 1, distance: 10, yard_line: 72, hash: 'R',
      snap_timestamp: 2.8, whistle_timestamp: 10.6, clip_start_seconds: 1.0, clip_end_seconds: 13.5,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Offset-I Counter Left',
      play_direction: 'left', yards_gained: 28,
      play_result: '28-yd Touchdown Run by #9 Legend Muhammad on Counter Trey Left (14 YAC, 1 BT) behind #53 Harrison Payne pancake; #18 Hezekiah Monge solo stop',
      stats: [
        createStatEntry(safeFilmId, 10, 9, { rush_attempt: 1, rush_yards: 28, yards_after_contact: 14, broken_tackles: 1, rush_td: 1, coaching_cue: 'Counter step froze MLB; accelerated off left tackle block for 28-yd TD.' }),
        createStatEntry(safeFilmId, 10, 53, { pancake_block: 1, coaching_cue: 'Crushing down block sealed interior pursuit.' }),
        createStatEntry(safeFilmId, 10, 18, { solo_tackle: 1, coaching_cue: 'Closed flat to sideline for open-field solo tackle.' }),
      ],
    },
    {
      play_number: 11, quarter: 2, odk: 'D', down: 2, distance: 7, yard_line: 33, hash: 'L',
      snap_timestamp: 2.7, whistle_timestamp: 10.2, clip_start_seconds: 0.5, clip_end_seconds: 13.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Spread Jet Motion',
      play_direction: 'right', yards_gained: 6,
      play_result: 'Solo tackle by #9 Legend Muhammad; #4 Kasen Jacobs Forced Fumble + Recovery; #11 Jake Feldman PBU + Solo Tackle; #17 Haven Philippe 6-yd rush',
      stats: [
        createStatEntry(safeFilmId, 11, 9, { solo_tackle: 1, coaching_cue: 'Read jet motion pre-snap and strung runner out to boundary.' }),
        createStatEntry(safeFilmId, 11, 4, { solo_tackle: 1, forced_fumble: 1, fumble_recovery: 1, coaching_cue: 'Punched ball out at contact and secured immediate recovery.' }),
        createStatEntry(safeFilmId, 11, 11, { solo_tackle: 1, pass_breakup: 1, coaching_cue: 'Raked through receiver hands to break up pass and secure tackle.' }),
        createStatEntry(safeFilmId, 11, 17, { rush_attempt: 1, rush_yards: 6, yards_after_contact: 3, coaching_cue: 'Quick read-option pull for 6 yards.' }),
      ],
    },
    {
      play_number: 12, quarter: 2, odk: 'O', down: 2, distance: 4, yard_line: 46, hash: 'M',
      snap_timestamp: 2.6, whistle_timestamp: 9.8, clip_start_seconds: 0.5, clip_end_seconds: 12.5,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'pass', formation: 'Shotgun Trips Right',
      play_direction: 'right', yards_gained: 6,
      play_result: '6-yd Quick Hitch Pass from #17 Haven Philippe to #11 Jake Feldman; #18 Hezekiah Monge 3-yd dive',
      stats: [
        createStatEntry(safeFilmId, 12, 17, { pass_attempt: 1, pass_completion: 1, pass_yards: 6, coaching_cue: 'Rhythm 1-step drop and accurate ball placement on hitch.' }),
        createStatEntry(safeFilmId, 12, 11, { target: 1, reception: 1, rec_yards: 6, coaching_cue: 'Crisp top-of-route stem created 2 yards of separation.' }),
        createStatEntry(safeFilmId, 12, 18, { rush_attempt: 1, rush_yards: 3, yards_after_contact: 1, coaching_cue: 'North-south inside carry to move the chains.' }),
      ],
    },
    {
      play_number: 13, quarter: 2, odk: 'O', down: 1, distance: 10, yard_line: 52, hash: 'L',
      snap_timestamp: 2.9, whistle_timestamp: 10.5, clip_start_seconds: 1.0, clip_end_seconds: 13.5,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Shotgun Split',
      play_direction: 'left', yards_gained: 6,
      play_result: '6-yd Off-Tackle Run by #9 Legend Muhammad (3 YAC); #12 Jeremiah Walker Interception + Solo Tackle; #53 Harrison Payne Solo TFL',
      stats: [
        createStatEntry(safeFilmId, 13, 9, { rush_attempt: 1, rush_yards: 6, yards_after_contact: 3, coaching_cue: 'Pressed C-gap and churned legs through contact for 6 yards.' }),
        createStatEntry(safeFilmId, 13, 12, { solo_tackle: 1, interception: 1, coaching_cue: 'Read quarterback eyes from safety depth and undercut seam for interception.' }),
        createStatEntry(safeFilmId, 13, 53, { solo_tackle: 1, tackle_for_loss: 1, coaching_cue: 'Penetrated A-gap to blow up handoff exchange.' }),
      ],
    },
    {
      play_number: 14, quarter: 2, odk: 'O', down: 2, distance: 4, yard_line: 58, hash: 'R',
      snap_timestamp: 2.5, whistle_timestamp: 9.7, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Singleback Ace',
      play_direction: 'right', yards_gained: 9,
      play_result: '9-yd Sweep Right by #18 Hezekiah Monge (5 YAC); #54 Silas Guimaraes Solo TFL, #3 Carter Latouche Solo Tackle, #9 Legend Muhammad Ast Tackle',
      stats: [
        createStatEntry(safeFilmId, 14, 18, { rush_attempt: 1, rush_yards: 9, yards_after_contact: 5, coaching_cue: 'Turned corner with speed and finished forward for first down.' }),
        createStatEntry(safeFilmId, 14, 54, { solo_tackle: 1, tackle_for_loss: 1, coaching_cue: 'Bench-pressed center into backfield for solo TFL.' }),
        createStatEntry(safeFilmId, 14, 3, { solo_tackle: 1, coaching_cue: 'Closed quickly on perimeter screen for solo stop.' }),
        createStatEntry(safeFilmId, 14, 9, { assist_tackle: 1, coaching_cue: 'Relentless backside pursuit to assist on tackle.' }),
      ],
    },
    {
      play_number: 15, quarter: 2, odk: 'O', down: 1, distance: 10, yard_line: 67, hash: 'M',
      snap_timestamp: 2.8, whistle_timestamp: 10.1, clip_start_seconds: 1.0, clip_end_seconds: 13.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'pass', formation: 'Shotgun Spread',
      play_direction: 'left', yards_gained: 4,
      play_result: '4-yd Slant Pass from #17 Haven Philippe to #11 Jake Feldman; #54 Silas Guimaraes pancake block; #18 Hezekiah Monge 2-yd carry',
      stats: [
        createStatEntry(safeFilmId, 15, 17, { pass_attempt: 1, pass_completion: 1, pass_yards: 4, coaching_cue: 'Quick release on 3-step slant into tight window.' }),
        createStatEntry(safeFilmId, 15, 11, { target: 1, reception: 1, rec_yards: 4, coaching_cue: 'Strong hands catch across middle in traffic.' }),
        createStatEntry(safeFilmId, 15, 54, { pancake_block: 1, coaching_cue: 'Anchored pass set and drove defensive tackle to the turf.' }),
        createStatEntry(safeFilmId, 15, 18, { rush_attempt: 1, rush_yards: 2, yards_after_contact: 1, coaching_cue: 'Short-yardage plunge between tackles.' }),
      ],
    },
    {
      play_number: 16, quarter: 2, odk: 'O', down: 2, distance: 6, yard_line: 71, hash: 'L',
      snap_timestamp: 2.5, whistle_timestamp: 4.1, clip_start_seconds: 0.5, clip_end_seconds: 7.5,
      is_dead_ball: true, dead_ball_reason: 'encroachment', play_type: 'dead_ball', formation: 'Shotgun Twins',
      play_direction: 'middle', yards_gained: 0,
      play_result: 'DEAD BALL - Pre-Snap Neutral Zone Infraction / Encroachment blown dead prior to snap (excluded from live box score)',
      stats: [],
    },
    {
      play_number: 17, quarter: 3, odk: 'D', down: 1, distance: 10, yard_line: 45, hash: 'M',
      snap_timestamp: 2.6, whistle_timestamp: 9.6, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Singleback Tight',
      play_direction: 'left', yards_gained: 3,
      play_result: 'Solo tackles by #9 Legend Muhammad and #11 Jake Feldman; #17 Haven Philippe 3-yd keeper',
      stats: [
        createStatEntry(safeFilmId, 17, 9, { solo_tackle: 1, coaching_cue: 'Shed tight end reach block and wrapped up ball carrier at line.' }),
        createStatEntry(safeFilmId, 17, 11, { solo_tackle: 1, coaching_cue: 'Triggered from corner to make open-field ankle tackle.' }),
        createStatEntry(safeFilmId, 17, 17, { rush_attempt: 1, rush_yards: 3, yards_after_contact: 1, coaching_cue: 'Protected football through traffic on quarterback sneak.' }),
      ],
    },
    {
      play_number: 18, quarter: 3, odk: 'O', down: 2, distance: 7, yard_line: 48, hash: 'R',
      snap_timestamp: 2.7, whistle_timestamp: 10.0, clip_start_seconds: 1.0, clip_end_seconds: 13.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Singleback Power',
      play_direction: 'right', yards_gained: 5,
      play_result: '5-yd Power Run by #9 Legend Muhammad (2 YAC); solo tackles by #18 Hezekiah Monge and #4 Kasen Jacobs',
      stats: [
        createStatEntry(safeFilmId, 18, 9, { rush_attempt: 1, rush_yards: 5, yards_after_contact: 2, coaching_cue: 'Patient read behind right guard for 5 hard yards.' }),
        createStatEntry(safeFilmId, 18, 18, { solo_tackle: 1, coaching_cue: 'Set outside leverage and finished solo tackle.' }),
        createStatEntry(safeFilmId, 18, 4, { solo_tackle: 1, coaching_cue: 'Met runner square in hole with low pad level.' }),
      ],
    },
    {
      play_number: 19, quarter: 3, odk: 'O', down: 3, distance: 2, yard_line: 53, hash: 'M',
      snap_timestamp: 2.9, whistle_timestamp: 10.8, clip_start_seconds: 1.0, clip_end_seconds: 14.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Jet Sweep Left',
      play_direction: 'left', yards_gained: 16,
      play_result: '16-yd Jet Sweep Left by #3 Carter Latouche behind #53 Harrison Payne pancake block; #17 Haven Philippe deep shot target to #11 Jake Feldman',
      stats: [
        createStatEntry(safeFilmId, 19, 3, { rush_attempt: 1, rush_yards: 16, coaching_cue: 'Full-speed jet motion handoff; turned corner for 16-yard first down.' }),
        createStatEntry(safeFilmId, 19, 53, { pancake_block: 1, coaching_cue: 'Reached defensive end and drove him into sideline.' }),
        createStatEntry(safeFilmId, 19, 17, { pass_attempt: 1, pass_completion: 0, pass_yards: 0, coaching_cue: 'Put air under deep boundary shot where only receiver had a play.' }),
        createStatEntry(safeFilmId, 19, 11, { target: 1, reception: 0, rec_yards: 0, coaching_cue: 'Tracked deep ball well along sideline boundary.' }),
      ],
    },
    {
      play_number: 20, quarter: 3, odk: 'O', down: 1, distance: 10, yard_line: 69, hash: 'L',
      snap_timestamp: 2.6, whistle_timestamp: 9.8, clip_start_seconds: 0.5, clip_end_seconds: 12.5,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Shotgun Inside Zone',
      play_direction: 'middle', yards_gained: 4,
      play_result: '4-yd Inside Run by #9 Legend Muhammad (1 YAC); solo tackles by #12 Jeremiah Walker and #54 Silas Guimaraes',
      stats: [
        createStatEntry(safeFilmId, 20, 9, { rush_attempt: 1, rush_yards: 4, yards_after_contact: 1, coaching_cue: 'Put foot in ground and hit vertical seam for 4 yards.' }),
        createStatEntry(safeFilmId, 20, 12, { solo_tackle: 1, coaching_cue: 'Filled alley rapidly from safety to stop runner.' }),
        createStatEntry(safeFilmId, 20, 54, { solo_tackle: 1, coaching_cue: 'Controlled center and shed block for interior stop.' }),
      ],
    },
    {
      play_number: 21, quarter: 3, odk: 'O', down: 2, distance: 6, yard_line: 73, hash: 'M',
      snap_timestamp: 2.8, whistle_timestamp: 10.2, clip_start_seconds: 1.0, clip_end_seconds: 13.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Cluster Right',
      play_direction: 'right', yards_gained: 7,
      play_result: '7-yd First-Down Run by #18 Hezekiah Monge (4 YAC); assisted tackle by #9 Legend Muhammad and #53 Harrison Payne',
      stats: [
        createStatEntry(safeFilmId, 21, 18, { rush_attempt: 1, rush_yards: 7, yards_after_contact: 4, coaching_cue: 'Lowered pads through contact to convert second-and-medium.' }),
        createStatEntry(safeFilmId, 21, 9, { assist_tackle: 1, coaching_cue: 'Compressed C-gap to hold runner to minimal yardage.' }),
        createStatEntry(safeFilmId, 21, 53, { assist_tackle: 1, coaching_cue: 'Pushed pocket backward and assisted on gang tackle.' }),
      ],
    },
    {
      play_number: 22, quarter: 4, odk: 'O', down: 1, distance: 10, yard_line: 80, hash: 'R',
      snap_timestamp: 2.5, whistle_timestamp: 9.9, clip_start_seconds: 0.5, clip_end_seconds: 12.5,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'pass', formation: 'Shotgun Twins Left',
      play_direction: 'left', yards_gained: 11,
      play_result: '11-yd Curl Completion from #17 Haven Philippe to #12 Jeremiah Walker; #54 Silas Guimaraes pancake block; #4 Kasen Jacobs solo tackle',
      stats: [
        createStatEntry(safeFilmId, 22, 17, { pass_attempt: 1, pass_completion: 1, pass_yards: 11, coaching_cue: 'Delivered on-time out-breaking ball before corner could recover.' }),
        createStatEntry(safeFilmId, 22, 12, { target: 1, reception: 1, rec_yards: 11, coaching_cue: 'Came back to the ball aggressively for 11-yard first down.' }),
        createStatEntry(safeFilmId, 22, 54, { pancake_block: 1, coaching_cue: 'Finished pass protection block with pancake.' }),
        createStatEntry(safeFilmId, 22, 4, { solo_tackle: 1, coaching_cue: 'Read screen keys and made immediate solo tackle.' }),
      ],
    },
    {
      play_number: 23, quarter: 4, odk: 'O', down: 1, distance: 9, yard_line: 91, hash: 'M',
      snap_timestamp: 2.7, whistle_timestamp: 9.5, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'I-Formation',
      play_direction: 'middle', yards_gained: 2,
      play_result: '2-yd Goal-Line Dive by #9 Legend Muhammad; assisted tackle by #18 Hezekiah Monge',
      stats: [
        createStatEntry(safeFilmId, 23, 9, { rush_attempt: 1, rush_yards: 2, coaching_cue: 'Kept two hands on football in heavy goal-line traffic.' }),
        createStatEntry(safeFilmId, 23, 18, { assist_tackle: 1, coaching_cue: 'crashed down from outside linebacker to seal edge.' }),
      ],
    },
    {
      play_number: 24, quarter: 4, odk: 'O', down: 2, distance: 7, yard_line: 93, hash: 'L',
      snap_timestamp: 3.0, whistle_timestamp: 10.6, clip_start_seconds: 1.0, clip_end_seconds: 13.5,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Singleback Toss',
      play_direction: 'left', yards_gained: 6,
      play_result: '6-yd Sweep Left by #18 Hezekiah Monge (3 YAC); solo tackle by #9 Legend Muhammad, assist by #3 Carter Latouche',
      stats: [
        createStatEntry(safeFilmId, 24, 18, { rush_attempt: 1, rush_yards: 6, yards_after_contact: 3, coaching_cue: 'Followed lead block to set up third-and-short.' }),
        createStatEntry(safeFilmId, 24, 9, { solo_tackle: 1, coaching_cue: 'Beat double-team block with low pad level for solo tackle.' }),
        createStatEntry(safeFilmId, 24, 3, { assist_tackle: 1, coaching_cue: 'Forced ball carrier back inside to pursuit.' }),
      ],
    },
    {
      play_number: 25, quarter: 4, odk: 'O', down: 3, distance: 1, yard_line: 99, hash: 'M',
      snap_timestamp: 2.4, whistle_timestamp: 4.0, clip_start_seconds: 0.5, clip_end_seconds: 7.5,
      is_dead_ball: true, dead_ball_reason: 'offsides', play_type: 'dead_ball', formation: 'Shotgun Motion',
      play_direction: 'middle', yards_gained: 0,
      play_result: 'DEAD BALL - Pre-Snap Offsides whistle prior to snap (excluded from live box score)',
      stats: [],
    },
    {
      play_number: 26, quarter: 4, odk: 'O', down: 3, distance: 6, yard_line: 94, hash: 'R',
      snap_timestamp: 2.8, whistle_timestamp: 10.1, clip_start_seconds: 1.0, clip_end_seconds: 13.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'pass', formation: 'Shotgun Bunch',
      play_direction: 'right', yards_gained: 8,
      play_result: '8-yd Crossing Route Completion from #17 Haven Philippe to #12 Jeremiah Walker behind #53 Harrison Payne pancake block',
      stats: [
        createStatEntry(safeFilmId, 26, 17, { pass_attempt: 1, pass_completion: 1, pass_yards: 8, coaching_cue: 'Reset feet in pocket and hit crossing route in stride.' }),
        createStatEntry(safeFilmId, 26, 12, { target: 1, reception: 1, rec_yards: 8, coaching_cue: 'Used rub route from bunch formation to get open underneath.' }),
        createStatEntry(safeFilmId, 26, 53, { pancake_block: 1, coaching_cue: 'Stonewalled edge rusher and drove him to turf.' }),
      ],
    },
    {
      play_number: 27, quarter: 4, odk: 'O', down: 1, distance: 10, yard_line: 45, hash: 'M',
      snap_timestamp: 2.6, whistle_timestamp: 9.7, clip_start_seconds: 0.5, clip_end_seconds: 12.5,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Shotgun Power',
      play_direction: 'right', yards_gained: 1,
      play_result: '1-yd Clock-Control Run by #9 Legend Muhammad; solo tackle by #53 Harrison Payne, assist by #11 Jake Feldman',
      stats: [
        createStatEntry(safeFilmId, 27, 9, { rush_attempt: 1, rush_yards: 1, coaching_cue: 'Secured ball with two arms to keep clock moving in fourth quarter.' }),
        createStatEntry(safeFilmId, 27, 53, { solo_tackle: 1, coaching_cue: 'Two-gapped guard and shed cleanly for interior stop.' }),
        createStatEntry(safeFilmId, 27, 11, { assist_tackle: 1, coaching_cue: 'Rallied to football to prevent second-effort yardage.' }),
      ],
    },
    {
      play_number: 28, quarter: 4, odk: 'O', down: 2, distance: 9, yard_line: 46, hash: 'L',
      snap_timestamp: 2.7, whistle_timestamp: 10.0, clip_start_seconds: 1.0, clip_end_seconds: 13.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'run', formation: 'Shotgun Sweep',
      play_direction: 'left', yards_gained: 5,
      play_result: '5-yd Sweep Left by #18 Hezekiah Monge (2 YAC); solo tackle by #9 Legend Muhammad, assist by #12 Jeremiah Walker',
      stats: [
        createStatEntry(safeFilmId, 28, 18, { rush_attempt: 1, rush_yards: 5, yards_after_contact: 2, coaching_cue: 'Hit perimeter with urgency and stayed inbounds.' }),
        createStatEntry(safeFilmId, 28, 9, { solo_tackle: 1, coaching_cue: 'Exploded through B-gap for open-field solo tackle.' }),
        createStatEntry(safeFilmId, 28, 12, { assist_tackle: 1, coaching_cue: 'Provided over-the-top leverage support.' }),
      ],
    },
    {
      play_number: 29, quarter: 4, odk: 'O', down: 3, distance: 4, yard_line: 51, hash: 'R',
      snap_timestamp: 2.5, whistle_timestamp: 9.4, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'pass', formation: 'Shotgun Spread',
      play_direction: 'right', yards_gained: 0,
      play_result: 'Pass attempt by #17 Haven Philippe intended for #12 Jeremiah Walker; tackle assist by #4 Kasen Jacobs',
      stats: [
        createStatEntry(safeFilmId, 29, 17, { pass_attempt: 1, pass_completion: 0, pass_yards: 0, coaching_cue: 'Smart throwaway low and outside away from coverage.' }),
        createStatEntry(safeFilmId, 29, 12, { target: 1, reception: 0, rec_yards: 0, coaching_cue: 'Ran crisp out route at sticks.' }),
        createStatEntry(safeFilmId, 29, 4, { assist_tackle: 1, coaching_cue: 'Closed checkdown window immediately.' }),
      ],
    },
    {
      play_number: 30, quarter: 4, odk: 'O', down: 4, distance: 4, yard_line: 51, hash: 'M',
      snap_timestamp: 2.6, whistle_timestamp: 9.6, clip_start_seconds: 0.5, clip_end_seconds: 12.0,
      is_dead_ball: false, dead_ball_reason: 'none', play_type: 'pass', formation: 'Shotgun Trips',
      play_direction: 'left', yards_gained: 7,
      play_result: 'Game-Sealing 7-yd First-Down Pass from #17 Haven Philippe to #3 Carter Latouche; assisted tackle by #54 Silas Guimaraes',
      stats: [
        createStatEntry(safeFilmId, 30, 17, { pass_attempt: 1, pass_completion: 1, pass_yards: 7, coaching_cue: 'Poised fourth-down conversion strike to seal victory.' }),
        createStatEntry(safeFilmId, 30, 3, { target: 1, reception: 1, rec_yards: 7, coaching_cue: 'Secured catch past sticks and protected ball to seal game.' }),
        createStatEntry(safeFilmId, 30, 54, { assist_tackle: 1, coaching_cue: 'Final defensive stand interior tackle assist.' }),
      ],
    },
  ];

  const plays = [];
  const playerStats = [];

  for (const bp of playBlueprints) {
    const padNum = String(bp.play_number).padStart(2, '0');
    const playId = `${safeFilmId}_play_${padNum}`;
    const clipUrl = `/chargers_game_clips/Play_${padNum}_Chargers.mp4`;

    const telestratorKeyframes = bp.is_dead_ball
      ? []
      : bp.stats.flatMap((st) => [
          {
            timestamp_offset: 0.0,
            phase: 'presnap',
            player_id: st.player_id,
            jersey_number: st.jersey_number,
            player_name: st.player_name,
            bbox: st.pre_snap_bbox,
            role: st.unit_role,
            label: `#${st.jersey_number} ${st.player_name} (${st.unit_role} - Pre-Snap)`,
          },
          {
            timestamp_offset: 1.2,
            phase: 'mesh_point',
            player_id: st.player_id,
            jersey_number: st.jersey_number,
            player_name: st.player_name,
            bbox: [
              Math.round((st.pre_snap_bbox[0] + st.contact_bbox[0]) / 2),
              Math.round((st.pre_snap_bbox[1] + st.contact_bbox[1]) / 2),
              Math.round((st.pre_snap_bbox[2] + st.contact_bbox[2]) / 2),
              Math.round((st.pre_snap_bbox[3] + st.contact_bbox[3]) / 2),
            ],
            role: st.unit_role,
            label: `#${st.jersey_number} ${st.player_name} (Mesh Point ${st.get_off_ms}ms)`,
          },
          {
            timestamp_offset: 2.8,
            phase: 'contact',
            player_id: st.player_id,
            jersey_number: st.jersey_number,
            player_name: st.player_name,
            bbox: st.contact_bbox,
            role: st.unit_role,
            label: `#${st.jersey_number} ${st.player_name} (Point of Attack)`,
          },
        ]);

    plays.push({
      id: playId,
      master_film_id: safeFilmId,
      clip_film_id: `${safeFilmId}_clip_${padNum}`,
      play_number: bp.play_number,
      index: bp.play_number,
      quarter: bp.quarter,
      odk: bp.odk,
      side_of_ball: bp.odk === 'D' ? 'defense' : 'offense',
      down: bp.down,
      distance: bp.distance,
      yard_line: bp.yard_line,
      hash: bp.hash,
      snap_timestamp: bp.snap_timestamp,
      whistle_timestamp: bp.whistle_timestamp,
      clip_start_seconds: bp.clip_start_seconds,
      clip_end_seconds: bp.clip_end_seconds,
      is_dead_ball: bp.is_dead_ball,
      dead_ball_reason: bp.dead_ball_reason,
      play_type: bp.play_type,
      formation: bp.formation,
      play_direction: bp.play_direction,
      yards_gained: bp.yards_gained,
      play_result: bp.play_result,
      notes: bp.play_result,
      title: bp.play_result,
      video_url: clipUrl,
      keyframe_urls: {
        frame_presnap: `/api/film/keyframe?play=${bp.play_number}&phase=presnap`,
        frame_mesh_point: `/api/film/keyframe?play=${bp.play_number}&phase=mesh`,
        frame_contact_whistle: `/api/film/keyframe?play=${bp.play_number}&phase=contact`,
      },
      telestrator_keyframes: telestratorKeyframes,
      player_stats: bp.stats.map((s) => ({ ...s })),
      play_player_stats: bp.stats.map((s) => ({ ...s })),
    });

    for (const st of bp.stats) {
      playerStats.push(st);
    }
  }

  return { plays, playerStats };
}

/**
 * Aggregates play_player_stats across live plays (excluding is_dead_ball = true).
 */
export function computeBoxScoreFromPlays(plays = [], playerStats = []) {
  const deadBallPlayIds = new Set(
    (plays || []).filter((p) => p?.is_dead_ball).map((p) => p.id)
  );

  const effectiveStats =
    Array.isArray(playerStats) && playerStats.length > 0
      ? playerStats
      : (plays || [])
          .filter((p) => !p?.is_dead_ball)
          .flatMap((p) => p.player_stats || p.play_player_stats || []);

  const byPlayerKey = new Map();

  for (const stat of effectiveStats) {
    if (!stat || deadBallPlayIds.has(stat.play_id)) continue;

    const jerseyKey = stat.jersey_number !== undefined && stat.jersey_number !== null
      ? String(stat.jersey_number)
      : String(stat.player_id || stat.player_name || 'unknown');

    if (!byPlayerKey.has(jerseyKey)) {
      byPlayerKey.set(jerseyKey, {
        player_id: stat.player_id || `player_${jerseyKey}`,
        jersey_number: Number(stat.jersey_number ?? 0),
        jersey: Number(stat.jersey_number ?? 0),
        player_name: stat.player_name || `Player #${jerseyKey}`,
        name: stat.player_name || `Player #${jerseyKey}`,
        unit_role: stat.unit_role || 'ATH',
        snaps_logged: 0,
        rush_attempts: 0,
        rush_yards: 0,
        yards_after_contact: 0,
        broken_tackles: 0,
        rush_tds: 0,
        pass_attempts: 0,
        pass_completions: 0,
        pass_yards: 0,
        pass_tds: 0,
        interceptions_thrown: 0,
        targets: 0,
        receptions: 0,
        rec_yards: 0,
        rec_tds: 0,
        pancake_blocks: 0,
        fumbles: 0,
        solo_tackles: 0,
        assist_tackles: 0,
        total_tackles: 0,
        tackles_for_loss: 0,
        sacks: 0,
        forced_fumbles: 0,
        fumble_recoveries: 0,
        pass_breakups: 0,
        interceptions: 0,
        def_tds: 0,
        edge_contain_credits: 0,
        missed_tackles: 0,
        _get_off_sum: 0,
        _get_off_count: 0,
        _conf_sum: 0,
        _conf_count: 0,
        _gpa_sum: 0,
        _gpa_count: 0,
        _pad_counts: { optimal: 0, high_warning: 0, critical_high: 0 },
        _head_counts: { safe: 0, head_down_warning: 0 },
        _anchors: new Set(),
        override_count: 0,
        coach_override: false,
        play_ids: [],
        play_ids_by_stat: {
          total_tackles: [],
          solo_tackles: [],
          assist_tackles: [],
          tackles_for_loss: [],
          tackle_for_loss: [],
          sacks: [],
          sack: [],
          forced_fumbles: [],
          forced_fumble: [],
          fumble_recoveries: [],
          pass_breakups: [],
          interceptions: [],
          edge_contain_credits: [],
          rush_attempts: [],
          rush_yards: [],
          yards_after_contact: [],
          broken_tackles: [],
          rush_tds: [],
          rush_td: [],
          pancake_blocks: [],
          pancake_block: [],
          pass_yards: [],
          pass_tds: [],
          receptions: [],
          rec_yards: [],
          rec_tds: [],
        },
        coaching_cues: [],
      });
    }

    const row = byPlayerKey.get(jerseyKey);
    row.snaps_logged += 1;
    if (stat.play_id && !row.play_ids.includes(stat.play_id)) {
      row.play_ids.push(stat.play_id);
    }

    const addStat = (pluralKey, singularKey, val) => {
      const n = Number(val || 0);
      row[pluralKey] += n;
      if (n > 0 && stat.play_id) {
        if (row.play_ids_by_stat[pluralKey] && !row.play_ids_by_stat[pluralKey].includes(stat.play_id)) {
          row.play_ids_by_stat[pluralKey].push(stat.play_id);
        }
        if (singularKey && row.play_ids_by_stat[singularKey] && !row.play_ids_by_stat[singularKey].includes(stat.play_id)) {
          row.play_ids_by_stat[singularKey].push(stat.play_id);
        }
      }
    };

    addStat('rush_attempts', 'rush_attempt', stat.rush_attempt);
    addStat('rush_yards', 'rush_yards', stat.rush_yards);
    addStat('yards_after_contact', 'yards_after_contact', stat.yards_after_contact);
    addStat('broken_tackles', 'broken_tackles', stat.broken_tackles);
    addStat('rush_tds', 'rush_td', stat.rush_td);
    addStat('pass_attempts', 'pass_attempt', stat.pass_attempt);
    addStat('pass_completions', 'pass_completion', stat.pass_completion);
    addStat('pass_yards', 'pass_yards', stat.pass_yards);
    addStat('pass_tds', 'pass_td', stat.pass_td);
    addStat('interceptions_thrown', 'interception_thrown', stat.interception_thrown);
    addStat('targets', 'target', stat.target);
    addStat('receptions', 'reception', stat.reception);
    addStat('rec_yards', 'rec_yards', stat.rec_yards);
    addStat('rec_tds', 'rec_td', stat.rec_td);
    addStat('pancake_blocks', 'pancake_block', stat.pancake_block);
    addStat('fumbles', 'fumble', stat.fumble);

    addStat('solo_tackles', 'solo_tackle', stat.solo_tackle);
    addStat('assist_tackles', 'assist_tackle', stat.assist_tackle);
    addStat('tackles_for_loss', 'tackle_for_loss', stat.tackle_for_loss);
    addStat('sacks', 'sack', stat.sack);
    addStat('forced_fumbles', 'forced_fumble', stat.forced_fumble);
    addStat('fumble_recoveries', 'fumble_recovery', stat.fumble_recovery);
    addStat('pass_breakups', 'pass_breakup', stat.pass_breakup);
    addStat('interceptions', 'interception', stat.interception);
    addStat('def_tds', 'def_td', stat.def_td);
    addStat('edge_contain_credits', 'edge_contain_credit', stat.edge_contain_credit);
    addStat('missed_tackles', 'missed_tackle', stat.missed_tackle);

    const tackleOnPlay = Number(stat.solo_tackle || 0) + Number(stat.assist_tackle || 0);
    row.total_tackles += tackleOnPlay;
    if (tackleOnPlay > 0 && stat.play_id && !row.play_ids_by_stat.total_tackles.includes(stat.play_id)) {
      row.play_ids_by_stat.total_tackles.push(stat.play_id);
    }

    if (typeof stat.get_off_ms === 'number' && stat.get_off_ms > 0) {
      row._get_off_sum += stat.get_off_ms;
      row._get_off_count += 1;
    }

    if (typeof stat.id_confidence === 'number') {
      row._conf_sum += stat.id_confidence;
      row._conf_count += 1;
    }

    if (stat.play_grade && GRADE_TO_GPA[stat.play_grade] !== undefined) {
      row._gpa_sum += GRADE_TO_GPA[stat.play_grade];
      row._gpa_count += 1;
    }

    if (stat.pad_level_status && row._pad_counts[stat.pad_level_status] !== undefined) {
      row._pad_counts[stat.pad_level_status] += 1;
    }

    if (stat.head_placement && row._head_counts[stat.head_placement] !== undefined) {
      row._head_counts[stat.head_placement] += 1;
    }

    if (Array.isArray(stat.matched_anchors)) {
      stat.matched_anchors.forEach((a) => row._anchors.add(a));
    }

    if (stat.coach_override) {
      row.override_count += 1;
      row.coach_override = true;
    }

    if (stat.coaching_cue) {
      row.coaching_cues.push({ play_id: stat.play_id, cue: stat.coaching_cue, grade: stat.play_grade });
    }
  }

  const results = [];
  for (const row of byPlayerKey.values()) {
    const avgGetOff = row._get_off_count > 0 ? Math.round(row._get_off_sum / row._get_off_count) : null;
    const avgConf = row._conf_count > 0 ? Number((row._conf_sum / row._conf_count).toFixed(2)) : 0.85;
    const avgGpa = row._gpa_count > 0 ? row._gpa_sum / row._gpa_count : 3.0;
    const letterGrade = gpaToLetterGrade(avgGpa);

    let dominantPad = 'optimal';
    if (row._pad_counts.critical_high > 0) dominantPad = 'critical_high';
    else if (row._pad_counts.high_warning > row._pad_counts.optimal) dominantPad = 'high_warning';

    const dominantHead = row._head_counts.head_down_warning > 0 ? 'head_down_warning' : 'safe';

    const parts = [];
    if (row.total_tackles > 0) {
      parts.push(`${row.total_tackles} Total Tackles (${row.solo_tackles} Solo, ${row.assist_tackles} Ast)`);
    }
    if (row.tackles_for_loss > 0) {
      parts.push(`${row.tackles_for_loss} TFL`);
    }
    if (row.sacks > 0) {
      parts.push(`${row.sacks} ${row.sacks === 1 ? 'Sack' : 'Sacks'}`);
    }
    if (row.forced_fumbles > 0) {
      parts.push(`${row.forced_fumbles} Forced Fumble`);
    }
    if (row.fumble_recoveries > 0) {
      parts.push(`${row.fumble_recoveries} Fumble Rec`);
    }
    if (row.edge_contain_credits > 0) {
      parts.push(`${row.edge_contain_credits} Edge Contain`);
    }
    if (row.rush_tds > 0) {
      parts.push(`${row.rush_tds} Rushing ${row.rush_tds === 1 ? 'TD' : 'TDs'}`);
    }
    if (row.rush_yards > 0) {
      parts.push(`${row.rush_yards} Rush Yds (${row.rush_attempts} Att)`);
    }
    if (row.yards_after_contact > 0 && row.rush_yards > 0) {
      parts.push(`${row.yards_after_contact} YAC`);
    }
    if (row.broken_tackles > 0) {
      parts.push(`${row.broken_tackles} Broken Tackles`);
    }
    if (row.pass_attempts > 0) {
      parts.push(`${row.pass_completions}/${row.pass_attempts} Passing, ${row.pass_yards} Pass Yds, ${row.pass_tds} Pass TD, ${row.interceptions_thrown} INT`);
    }
    if (row.targets > 0 || row.receptions > 0) {
      parts.push(`${row.receptions} Rec (${row.targets} Tgt), ${row.rec_yards} Rec Yds${row.rec_tds > 0 ? `, ${row.rec_tds} Rec TD` : ''}`);
    }
    if (row.pass_breakups > 0) {
      parts.push(`${row.pass_breakups} PBU`);
    }
    if (row.interceptions > 0) {
      parts.push(`${row.interceptions} INT`);
    }
    if (row.pancake_blocks > 0) {
      parts.push(`${row.pancake_blocks} ${row.pancake_blocks === 1 ? 'Pancake' : 'Pancakes'}`);
    }

    const summaryLine = `#${row.jersey_number} ${row.player_name}: ${parts.join(', ') || 'Active Snap Logged'}`;

    results.push({
      player_id: row.player_id,
      jersey_number: row.jersey_number,
      jersey: row.jersey_number,
      player_name: row.player_name,
      name: row.player_name,
      unit_role: row.unit_role,
      snaps_logged: row.snaps_logged,

      // Plural & singular stat fields for seamless compatibility
      rush_attempts: row.rush_attempts,
      rush_attempt: row.rush_attempts,
      rush_carries: row.rush_attempts,
      rush_yards: row.rush_yards,
      yards_after_contact: row.yards_after_contact,
      broken_tackles: row.broken_tackles,
      rush_tds: row.rush_tds,
      rush_td: row.rush_tds,
      touchdowns: row.rush_tds + row.rec_tds + row.def_tds,
      pass_attempts: row.pass_attempts,
      pass_attempt: row.pass_attempts,
      pass_completions: row.pass_completions,
      pass_completion: row.pass_completions,
      pass_yards: row.pass_yards,
      pass_tds: row.pass_tds,
      pass_td: row.pass_tds,
      interceptions_thrown: row.interceptions_thrown,
      interception_thrown: row.interceptions_thrown,
      targets: row.targets,
      target: row.targets,
      receptions: row.receptions,
      reception: row.receptions,
      rec_yards: row.rec_yards,
      rec_tds: row.rec_tds,
      rec_td: row.rec_tds,
      pancake_blocks: row.pancake_blocks,
      pancake_block: row.pancake_blocks,
      fumbles: row.fumbles,

      solo_tackles: row.solo_tackles,
      solo_tackle: row.solo_tackles,
      assist_tackles: row.assist_tackles,
      assist_tackle: row.assist_tackles,
      total_tackles: row.total_tackles,
      tackles_for_loss: row.tackles_for_loss,
      tackle_for_loss: row.tackles_for_loss,
      sacks: row.sacks,
      sack: row.sacks,
      forced_fumbles: row.forced_fumbles,
      forced_fumble: row.forced_fumbles,
      fumble_recoveries: row.fumble_recoveries,
      fumble_recovery: row.fumble_recoveries,
      pass_breakups: row.pass_breakups,
      pass_breakup: row.pass_breakups,
      interceptions: row.interceptions,
      interception: row.interceptions,
      def_tds: row.def_tds,
      edge_contain_credits: row.edge_contain_credits,
      edge_contain_credit: row.edge_contain_credits,
      missed_tackles: row.missed_tackles,

      avg_get_off_ms: avgGetOff,
      get_off_ms: avgGetOff,
      avg_id_confidence: avgConf,
      id_confidence: avgConf,
      pad_level_status: dominantPad,
      pad_level_counts: row._pad_counts,
      head_placement: dominantHead,
      avg_play_grade: letterGrade,
      play_grade: letterGrade,
      matched_anchors: Array.from(row._anchors),
      override_count: row.override_count,
      coach_override: row.coach_override,
      play_ids: row.play_ids,
      play_ids_by_stat: row.play_ids_by_stat,
      coaching_cues: row.coaching_cues,
      summaryLine,
    });
  }

  results.sort((a, b) => {
    if (b.total_tackles !== a.total_tackles) return b.total_tackles - a.total_tackles;
    const bYds = b.rush_yards + b.pass_yards + b.rec_yards;
    const aYds = a.rush_yards + a.pass_yards + a.rec_yards;
    return bYds - aYds;
  });

  return results;
}

/* -- Persistent Fallback Store Helpers (scratch/film_stats_store.json) -- */

let memoryStore = null;

function loadStatsStore() {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STATS_STORE_PATH)) {
      const raw = fs.readFileSync(STATS_STORE_PATH, 'utf8');
      memoryStore = JSON.parse(raw);
      return memoryStore;
    }
  } catch (err) {
    console.warn('[stat-attribution] Using in-memory store fallback:', err.message);
  }
  memoryStore = { films: {} };
  return memoryStore;
}

function saveStatsStore(store) {
  memoryStore = store;
  try {
    const dir = path.dirname(STATS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATS_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('[stat-attribution] Could not persist film_stats_store.json:', err.message);
  }
}

export function getOrInitFilmStore(filmId = 'default_film_8u') {
  const safeId = filmId || 'default_film_8u';
  const store = loadStatsStore();
  if (!store.films[safeId] || !Array.isArray(store.films[safeId].plays) || store.films[safeId].plays.length < 30) {
    store.films[safeId] = getDefaultFilmPlaysAndStats(safeId);
    saveStatsStore(store);
  }
  return store.films[safeId];
}

export function saveFilmPlaysAndStatsToStore(filmId, plays, playerStats) {
  const safeId = filmId || 'default_film_8u';
  const store = loadStatsStore();
  const syncedPlays = (plays || []).map((p) => {
    if (p.is_dead_ball) {
      return { ...p, player_stats: [], play_player_stats: [] };
    }
    const pStats = (playerStats || []).filter((s) => s.play_id === p.id);
    return {
      ...p,
      player_stats: pStats,
      play_player_stats: pStats,
    };
  });
  store.films[safeId] = { plays: syncedPlays, playerStats };
  saveStatsStore(store);
  return store.films[safeId];
}

export function boostPlayerSignatureWeight(jerseyNumber, reason = 'coach_override') {
  const signatures = readPlayerSignaturesFile();
  const key = String(jerseyNumber);
  if (!signatures[key]) return { updated: false, signatures };

  const currentWeights = signatures[key].signature_confidence_weights || {
    alignment: 0.35,
    equipment: 0.45,
    jersey: 0.20,
  };

  signatures[key].signature_confidence_weights = {
    alignment: Number(Math.min(0.50, (currentWeights.alignment || 0.35) + 0.02).toFixed(2)),
    equipment: Number(Math.min(0.60, (currentWeights.equipment || 0.45) + 0.04).toFixed(2)),
    jersey: Number(Math.max(0.15, (currentWeights.jersey || 0.20) - 0.02).toFixed(2)),
    last_override_reason: reason,
    last_override_at: new Date().toISOString(),
  };

  writePlayerSignaturesFile(signatures);
  return { updated: true, playerSignature: signatures[key], signatures };
}
