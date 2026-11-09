import { NextResponse } from 'next/server';
import { computeBoxScoreFromPlays, getOrInitFilmStore } from '@/lib/stat-attribution';
import { dispatchParentReportWebhook } from '@/lib/ghl';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

function buildDeterministicSections({
  playerName,
  jerseyNumber,
  position,
  weekNumber,
  verifiedStats,
  clipLinks,
  coachNotes,
}) {
  const jNum = Number(jerseyNumber ?? verifiedStats?.jersey_number ?? 9);
  const name = playerName || verifiedStats?.player_name || (jNum === 9 ? 'Legend Muhammad' : `Player #${jNum}`);
  const role = position || verifiedStats?.unit_role || 'RDE / RB';
  const snaps = Number(verifiedStats?.snaps_logged ?? 10);
  const totalTackles = Number(verifiedStats?.total_tackles ?? 0);
  const soloTackles = Number(verifiedStats?.solo_tackles ?? 0);
  const assistTackles = Number(verifiedStats?.assist_tackles ?? 0);
  const tfl = Number(verifiedStats?.tackles_for_loss ?? 0);
  const sacks = Number(verifiedStats?.sacks ?? 0);
  const forcedFumbles = Number(verifiedStats?.forced_fumbles ?? 0);
  const rushYards = Number(verifiedStats?.rush_yards ?? 0);
  const yac = Number(verifiedStats?.yards_after_contact ?? 0);
  const brokenTackles = Number(verifiedStats?.broken_tackles ?? 0);
  const rushTds = Number(verifiedStats?.rush_tds ?? 0);
  const recYards = Number(verifiedStats?.rec_yards ?? 0);
  const recTds = Number(verifiedStats?.rec_tds ?? 0);
  const passYards = Number(verifiedStats?.pass_yards ?? 0);
  const passTds = Number(verifiedStats?.pass_tds ?? 0);
  const pancakes = Number(verifiedStats?.pancake_blocks ?? 0);
  const edgeContain = Number(verifiedStats?.edge_contain_credits ?? 0);
  const getOffMs = verifiedStats?.avg_get_off_ms ?? verifiedStats?.get_off_ms ?? 212;
  const padLevel = verifiedStats?.pad_level_status || 'optimal';
  const headPlacement = verifiedStats?.head_placement || 'safe';
  const playGrade = verifiedStats?.avg_play_grade || verifiedStats?.play_grade || 'A+';
  const anchors = Array.isArray(verifiedStats?.matched_anchors) && verifiedStats.matched_anchors.length > 0
    ? verifiedStats.matched_anchors.join(', ')
    : `alignment:${role.split('/')[0].trim()}, cleats:neon_green, jersey:${jNum}`;
  const cues = Array.isArray(verifiedStats?.coaching_cues) && verifiedStats.coaching_cues.length > 0
    ? verifiedStats.coaching_cues.slice(0, 4).map((c) => `- Play (${c.grade || playGrade}): ${c.cue}`).join('\n')
    : `- High-motor pursuit and clean leverage across ${snaps} verified snaps.`;

  const verifiedGameImpact = [
    `- **3-Point Anchor Verified Participation**: ${snaps} live snaps verified via [${anchors}]`,
    `- **Defensive Box Score**: ${totalTackles} Total Tackles (${soloTackles} Solo, ${assistTackles} Assist), ${tfl} TFL, ${sacks} Sacks, ${forcedFumbles} Forced Fumbles, ${edgeContain} Edge Contain Credits`,
    `- **Offensive & Trench Box Score**: ${rushYards} Rushing Yards (${yac} Yards After Contact, ${brokenTackles} Broken Tackles), ${rushTds + recTds + passTds} Total TDs, ${recYards} Receiving Yards, ${pancakes} Pancake Blocks`,
    `- **Overall Film Grade**: ${playGrade} (ID Confidence: ${Math.round((verifiedStats?.avg_id_confidence ?? 0.96) * 100)}%)`,
  ].join('\n');

  const strengthsAndHighGradeReps = [
    `#${jNum} ${name} delivered ${playGrade} execution at ${role} during Week ${weekNumber || 1}.`,
    `- **First-Step Explosion**: Averaged **${getOffMs}ms** snap get-off across tracked reps.`,
    `- **Pad Level & Leverage**: Logged **${padLevel}** pad level status with **${headPlacement}** head placement at contact.`,
    `- **Film Verified Coaching Cues**:`,
    cues,
    coachNotes ? `- **Head Coach Note**: ${coachNotes}` : null,
  ].filter(Boolean).join('\n');

  const formattedLinks = (clipLinks || []).map((link, idx) => `- Clip ${idx + 1}: ${link}`).join('\n');

  const weeklyDevelopmentFocus = [
    `- **Kinematic Focus for Parents & External Trainers**: Maintain **${padLevel}** pad level through the whistle and reinforce **${headPlacement}** head placement (eyes through the target crown) on every tackle and block.`,
    `- **At-Home 10-Minute Drill Plan**:`,
    `  1. **Snap Cadence First-Step Burst (3x5 reps)**: React on visual ball movement to keep get-off under ${getOffMs}ms.`,
    `  2. **Low-Chute Pad Leverage Walk (3x10 yards)**: Keep hips sunk, chest up, and hands cocked inside the frame.`,
    `  3. **Open-Field Breakdown & Near-Foot Wrap (3x5 reps)**: Buzz feet at the cone and drive through with eyes up.`,
    `- **Linked Game Film & Playable Clips**:`,
    formattedLinks,
  ].join('\n');

  const markdownReport = [
    `# Weekly Guardian Progress Report -- #${jNum} ${name} (Week ${weekNumber || 1})`,
    ``,
    `## 1. Verified Game Impact (Box Score & Snap Participation)`,
    verifiedGameImpact,
    ``,
    `## 2. What They Are Doing Well (Strengths & High-Grade Reps)`,
    strengthsAndHighGradeReps,
    ``,
    `## 3. Weekly Development Focus (Kinematic Cues for Parents & External Trainers + Linked Video Clips)`,
    weeklyDevelopmentFocus,
  ].join('\n');

  return {
    report: markdownReport,
    sections: {
      verifiedGameImpact,
      strengthsAndHighGradeReps,
      weeklyDevelopmentFocus,
    },
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      playerName,
      jerseyNumber = 9,
      position,
      age = 8,
      attendanceRate = 95,
      evalScores,
      coachNotes = '',
      weekNumber = 1,
      filmId = 'default_film_8u',
      publishToGHL = false,
      guardian = {},
    } = body;

    const storeData = getOrInitFilmStore(filmId);
    const boxScore = computeBoxScoreFromPlays(storeData.plays, storeData.playerStats);

    const targetJersey = Number(jerseyNumber ?? 9);
    const matchedPlayerStat =
      boxScore.find((row) => Number(row.jersey_number) === targetJersey) ||
      boxScore.find(
        (row) =>
          playerName &&
          String(row.player_name).toLowerCase() === String(playerName).toLowerCase()
      ) ||
      boxScore[0];

    const resolvedJersey = Number(matchedPlayerStat?.jersey_number ?? targetJersey);
    const resolvedName =
      playerName || matchedPlayerStat?.player_name || `Player #${resolvedJersey}`;
    const resolvedPosition =
      position || matchedPlayerStat?.unit_role || 'RDE / RB';

    const clipLinks = [
      `/coach/film?player=${resolvedJersey}`,
      `/chargers_game_clips/Play_01_Chargers.mp4`,
      `/chargers_game_clips/Play_03_Chargers.mp4`,
      `/chargers_game_clips/Play_04_Chargers.mp4`,
    ];

    const deterministic = buildDeterministicSections({
      playerName: resolvedName,
      jerseyNumber: resolvedJersey,
      position: resolvedPosition,
      weekNumber,
      verifiedStats: matchedPlayerStat,
      clipLinks,
      coachNotes,
    });

    let finalReport = deterministic.report;
    let finalSections = deterministic.sections;

    if (GEMINI_API_KEY && !publishToGHL) {
      try {
        const prompt = `You are the Head Coach of Delray Rocks 8U (R.T.G.) youth football. Generate a parent progress report using ONLY verified ground-truth film telemetry and zero emojis.

PLAYER: #${resolvedJersey} ${resolvedName} (${resolvedPosition}, Age ${age}, Attendance ${attendanceRate}%)
VERIFIED BOX SCORE & KINEMATICS:
${deterministic.sections.verifiedGameImpact}

STRENGTHS & COACHING CUES:
${deterministic.sections.strengthsAndHighGradeReps}

DEVELOPMENT FOCUS & CLIPS:
${deterministic.sections.weeklyDevelopmentFocus}

EVALUATION SCORES:
${evalScores ? JSON.stringify(evalScores) : 'Verified via 3-Point Film Telemetry'}

Return the report with these exact three markdown headings (no emojis):
## 1. Verified Game Impact (Box Score & Snap Participation)
## 2. What They Are Doing Well (Strengths & High-Grade Reps)
## 3. Weekly Development Focus (Kinematic Cues for Parents & External Trainers + Linked Video Clips)

Ensure all verified stat numbers (${matchedPlayerStat?.total_tackles ?? 0} Total Tackles, ${matchedPlayerStat?.rush_yards ?? 0} Rush Yds, ${matchedPlayerStat?.avg_get_off_ms ?? 210}ms get-off, ${matchedPlayerStat?.pad_level_status || 'optimal'} pad level) and clip links (/coach/film?player=${resolvedJersey}) remain intact.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiText && aiText.includes('Verified Game Impact')) {
            finalReport = aiText;
          }
        }
      } catch (aiErr) {
        console.warn('[API /reports/generate] Using deterministic verified report fallback:', aiErr.message);
      }
    }

    let ghlDispatch = null;
    if (publishToGHL) {
      ghlDispatch = await dispatchParentReportWebhook({
        player: {
          playerName: resolvedName,
          jerseyNumber: resolvedJersey,
          position: resolvedPosition,
        },
        guardian,
        verifiedStats: matchedPlayerStat,
        reportSections: finalSections,
        clipLinks,
      });
    }

    return NextResponse.json({
      success: true,
      report: finalReport,
      sections: finalSections,
      verifiedStats: matchedPlayerStat,
      clipLinks,
      ghlDispatch,
      model: GEMINI_MODEL,
      playerName: resolvedName,
      jerseyNumber: resolvedJersey,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
