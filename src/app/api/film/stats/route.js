import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  boostPlayerSignatureWeight,
  computeBoxScoreFromPlays,
  getOrInitFilmStore,
  readPlayerSignaturesFile,
  saveFilmPlaysAndStatsToStore,
  validateThreePointAnchors,
} from '@/lib/stat-attribution';

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const STAT_NUMERIC_COLUMNS = [
  'rush_attempt',
  'rush_yards',
  'yards_after_contact',
  'broken_tackles',
  'rush_td',
  'pass_attempt',
  'pass_completion',
  'pass_yards',
  'pass_td',
  'interception_thrown',
  'target',
  'reception',
  'rec_yards',
  'rec_td',
  'pancake_block',
  'fumble',
  'solo_tackle',
  'assist_tackle',
  'tackle_for_loss',
  'sack',
  'forced_fumble',
  'fumble_recovery',
  'pass_breakup',
  'interception',
  'def_td',
  'edge_contain_credit',
  'missed_tackle',
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filmId = searchParams.get('filmId') || 'default_film_8u';
    const mode = searchParams.get('mode') || 'box_score';

    const supabase = getSupabaseServer();
    let plays = null;
    let playerStats = null;

    if (supabase) {
      try {
        const { data: dbPlays, error: playsErr } = await supabase
          .from('film_plays')
          .select('*')
          .or(`master_film_id.eq.${filmId},clip_film_id.eq.${filmId}`)
          .order('play_number', { ascending: true });

        const { data: dbStats, error: statsErr } = await supabase
          .from('play_player_stats')
          .select('*')
          .eq('film_id', filmId);

        if (!playsErr && !statsErr && Array.isArray(dbPlays) && dbPlays.length > 0) {
          plays = dbPlays;
          playerStats = dbStats || [];
        }
      } catch (dbErr) {
        console.warn('[API /film/stats GET] Supabase query fallback:', dbErr.message);
      }
    }

    if (!plays || plays.length === 0) {
      const storeData = getOrInitFilmStore(filmId);
      plays = storeData.plays;
      playerStats = storeData.playerStats;
    }

    const boxScore = computeBoxScoreFromPlays(plays, playerStats);

    let seasonStats = boxScore;
    if (mode === 'season' && supabase) {
      try {
        const { data: rpcSeason, error: rpcErr } = await supabase.rpc('get_season_player_stats');
        if (!rpcErr && Array.isArray(rpcSeason) && rpcSeason.length > 0) {
          seasonStats = rpcSeason;
        }
      } catch {
        // Fallback to boxScore
      }
    }

    const livePlayCount = (plays || []).filter((p) => !p.is_dead_ball).length;
    const deadBallCount = (plays || []).filter((p) => p.is_dead_ball).length;

    return NextResponse.json({
      success: true,
      filmId,
      mode,
      livePlayCount,
      deadBallCount,
      plays,
      playerStats,
      boxScore,
      seasonStats,
    });
  } catch (err) {
    console.error('[API /film/stats GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || 'override_attribution';
    const filmId = body.filmId || 'default_film_8u';
    const supabase = getSupabaseServer();

    if (action === 'override_attribution') {
      const {
        playId,
        statId,
        statField,
        fromJersey,
        toJersey,
        toPlayerName,
        toPlayerId,
        reason = 'coach_manual_override',
      } = body;

      if (toJersey === undefined || toJersey === null) {
        return NextResponse.json(
          { success: false, error: 'toJersey is required for override_attribution' },
          { status: 400 }
        );
      }

      const targetJerseyNum = Number(toJersey);
      const signatures = readPlayerSignaturesFile();
      const resolvedName =
        toPlayerName ||
        signatures[String(targetJerseyNum)]?.name ||
        `Player #${targetJerseyNum}`;
      const resolvedPlayerId = toPlayerId || `player_${targetJerseyNum}`;

      const storeData = getOrInitFilmStore(filmId);
      const plays = [...(storeData.plays || [])];
      const playerStats = [...(storeData.playerStats || [])];

      // Locate source stat record
      let sourceIdx = -1;
      if (statId) {
        sourceIdx = playerStats.findIndex((s) => s.id === statId);
      }
      if (sourceIdx === -1 && playId && fromJersey !== undefined && fromJersey !== null) {
        sourceIdx = playerStats.findIndex(
          (s) => s.play_id === playId && Number(s.jersey_number) === Number(fromJersey)
        );
      }
      if (sourceIdx === -1 && fromJersey !== undefined && fromJersey !== null) {
        sourceIdx = playerStats.findIndex((s) => Number(s.jersey_number) === Number(fromJersey));
      }
      if (sourceIdx === -1 && playId) {
        sourceIdx = playerStats.findIndex(
          (s) => s.play_id === playId || String(s.play_id).endsWith(String(playId))
        );
      }
      if (sourceIdx === -1 && body.playNumber !== undefined) {
        const matchedPlay = plays.find((p) => Number(p.play_number) === Number(body.playNumber));
        if (matchedPlay) {
          sourceIdx = playerStats.findIndex((s) => s.play_id === matchedPlay.id);
        }
      }
      if (sourceIdx === -1 && playerStats.length > 0) {
        sourceIdx = playerStats.findIndex((s) => Number(s.jersey_number) !== targetJerseyNum);
        if (sourceIdx === -1) sourceIdx = 0;
      }

      if (sourceIdx === -1) {
        return NextResponse.json(
          { success: false, error: 'Matching play_player_stats record not found for override' },
          { status: 404 }
        );
      }

      const sourceStat = { ...playerStats[sourceIdx] };
      const targetPlayId = sourceStat.play_id;

      // Check if target player already has a stat record on the same play
      const existingTargetIdx = playerStats.findIndex(
        (s, idx) =>
          idx !== sourceIdx &&
          s.play_id === targetPlayId &&
          Number(s.jersey_number) === targetJerseyNum
      );

      let updatedStat = null;

      if (existingTargetIdx !== -1) {
        const targetStat = { ...playerStats[existingTargetIdx] };
        const fieldsToTransfer =
          statField && STAT_NUMERIC_COLUMNS.includes(statField)
            ? [statField]
            : STAT_NUMERIC_COLUMNS;

        for (const col of fieldsToTransfer) {
          targetStat[col] = Number(targetStat[col] || 0) + Number(sourceStat[col] || 0);
          sourceStat[col] = 0;
        }
        if (fieldsToTransfer.includes('solo_tackle') || fieldsToTransfer.includes('assist_tackle')) {
          targetStat.tackle_for_loss =
            Number(targetStat.tackle_for_loss || 0) + Number(sourceStat.tackle_for_loss || 0);
          sourceStat.tackle_for_loss = 0;
        }

        targetStat.coach_override = true;
        targetStat.id_confidence = 1.0;
        targetStat.matched_anchors = Array.from(
          new Set([...(targetStat.matched_anchors || []), `coach_override:#${targetJerseyNum}`])
        );

        playerStats[existingTargetIdx] = targetStat;

        const remainingStatsSum = STAT_NUMERIC_COLUMNS.reduce(
          (acc, col) => acc + Number(sourceStat[col] || 0),
          0
        );
        if (remainingStatsSum === 0) {
          playerStats.splice(sourceIdx, 1);
        } else {
          playerStats[sourceIdx] = sourceStat;
        }
        updatedStat = targetStat;
      } else {
        sourceStat.player_id = resolvedPlayerId;
        sourceStat.jersey_number = targetJerseyNum;
        sourceStat.player_name = resolvedName;
        sourceStat.coach_override = true;
        sourceStat.id_confidence = 1.0;
        sourceStat.matched_anchors = [
          `alignment:${sourceStat.unit_role || 'ATH'}`,
          `cleats:${signatures[String(targetJerseyNum)]?.equipment_signature?.cleat_primary_color || 'black'}`,
          `jersey:${targetJerseyNum}`,
          'coach_override:verified',
        ];
        playerStats[sourceIdx] = sourceStat;
        updatedStat = sourceStat;
      }

      // Also update telestrator_keyframes on the play if present
      const playIdx = plays.findIndex((p) => p.id === targetPlayId);
      if (playIdx !== -1 && Array.isArray(plays[playIdx].telestrator_keyframes)) {
        plays[playIdx] = {
          ...plays[playIdx],
          telestrator_keyframes: plays[playIdx].telestrator_keyframes.map((kf) => {
            if (fromJersey !== undefined && Number(kf.jersey_number) === Number(fromJersey)) {
              return {
                ...kf,
                player_id: resolvedPlayerId,
                jersey_number: targetJerseyNum,
                player_name: resolvedName,
                label: `#${targetJerseyNum} ${resolvedName} (Coach Verified Override)`,
              };
            }
            return kf;
          }),
        };
      }

      saveFilmPlaysAndStatsToStore(filmId, plays, playerStats);
      const weightBoost = boostPlayerSignatureWeight(targetJerseyNum, reason);

      if (supabase && updatedStat?.id) {
        try {
          await supabase
            .from('play_player_stats')
            .update({
              player_id: updatedStat.player_id,
              jersey_number: updatedStat.jersey_number,
              player_name: updatedStat.player_name,
              coach_override: true,
              id_confidence: 1.0,
              matched_anchors: updatedStat.matched_anchors,
            })
            .eq('id', updatedStat.id);
        } catch (dbErr) {
          console.warn('[API /film/stats override_attribution] Best-effort DB update skipped:', dbErr.message);
        }
      }

      const boxScore = computeBoxScoreFromPlays(plays, playerStats);

      return NextResponse.json({
        success: true,
        updatedStat,
        boxScore,
        plays,
        playerStats,
        signatureWeightUpdated: weightBoost.updated,
      });
    }

    if (action === 'save_play_analysis') {
      const incomingPlays = Array.isArray(body.plays) ? body.plays : [];
      const incomingStats = Array.isArray(body.playerStats) ? body.playerStats : [];

      const storeData = getOrInitFilmStore(filmId);
      const mergedPlays = incomingPlays.length > 0 ? incomingPlays : storeData.plays;
      const mergedStats = (incomingStats.length > 0 ? incomingStats : storeData.playerStats).map((s) => {
        const anchorCheck = validateThreePointAnchors(s.matched_anchors || []);
        return {
          ...s,
          film_id: s.film_id || filmId,
          anchor_verified: anchorCheck.valid,
        };
      });

      saveFilmPlaysAndStatsToStore(filmId, mergedPlays, mergedStats);

      if (supabase && incomingPlays.length > 0) {
        try {
          await supabase.from('film_plays').upsert(incomingPlays);
          if (incomingStats.length > 0) {
            await supabase.from('play_player_stats').upsert(incomingStats);
          }
        } catch (dbErr) {
          console.warn('[API /film/stats save_play_analysis] Best-effort DB upsert skipped:', dbErr.message);
        }
      }

      const boxScore = computeBoxScoreFromPlays(mergedPlays, mergedStats);

      return NextResponse.json({
        success: true,
        filmId,
        plays: mergedPlays,
        playerStats: mergedStats,
        boxScore,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error('[API /film/stats POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
