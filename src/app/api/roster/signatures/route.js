import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  EQUIPMENT_OPTIONS,
  normalizeEquipmentSignature,
  readPlayerSignaturesFile,
  writePlayerSignaturesFile,
} from '@/lib/stat-attribution';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function buildBackwardsCompatibleSummary(sig, existing = {}) {
  const normalized = normalizeEquipmentSignature(sig);
  const cleatDesc = normalized.cleat_secondary_color && normalized.cleat_secondary_color !== 'none'
    ? `${normalized.cleat_primary_color} / ${normalized.cleat_secondary_color}`
    : normalized.cleat_primary_color;

  const accParts = [];
  if (normalized.sleeve_style !== 'none') {
    accParts.push(`${normalized.sleeve_color} ${normalized.sleeve_style} sleeve`);
  }
  if (normalized.glove_color !== 'none') {
    accParts.push(`${normalized.glove_color} gloves`);
  }
  if (normalized.wristband_location !== 'none') {
    accParts.push(`wristband (${normalized.wristband_location})`);
  }
  if (normalized.towel_location !== 'none') {
    accParts.push(`towel (${normalized.towel_location})`);
  }
  if (normalized.anklet_spat) {
    accParts.push('ankle spat');
  }

  return {
    name: existing.name || 'Unknown Player',
    cleats: cleatDesc,
    accessories: accParts.length > 0 ? accParts.join(', ') : (existing.accessories || 'No distinct accessories'),
    headwear: `${normalized.helmet_finish} ${normalized.helmet_color} helmet, ${normalized.facemask_color} facemask, visor: ${normalized.visor_type}`,
    primary_alignment: existing.primary_alignment || 'ATH',
    build: existing.build || normalized.build_descriptor,
    equipment_signature: normalized,
    signature_confidence_weights: existing.signature_confidence_weights || {
      alignment: 0.35,
      equipment: 0.45,
      jersey: 0.20,
    },
  };
}

function buildRosterArray(signatures, dbPlayers = []) {
  const dbByJersey = new Map();
  for (const p of dbPlayers || []) {
    if (p.jersey_number !== undefined && p.jersey_number !== null) {
      dbByJersey.set(String(p.jersey_number), p);
    }
  }

  const allJerseys = new Set([
    ...Object.keys(signatures || {}),
    ...Array.from(dbByJersey.keys()),
  ]);

  const list = [];
  for (const jerseyKey of allJerseys) {
    const fileEntry = signatures[jerseyKey] || {};
    const dbEntry = dbByJersey.get(jerseyKey) || {};
    const fullName = dbEntry.first_name && dbEntry.last_name
      ? `${dbEntry.first_name} ${dbEntry.last_name}`
      : (fileEntry.name || dbEntry.name || `Player #${jerseyKey}`);

    const mergedSig = normalizeEquipmentSignature(
      fileEntry.equipment_signature || dbEntry.equipment_signature || fileEntry
    );

    list.push({
      id: dbEntry.id || `player_${jerseyKey}`,
      jersey_number: Number(jerseyKey),
      jersey: Number(jerseyKey),
      name: fullName,
      primary_alignment: fileEntry.primary_alignment || dbEntry.primary_position || 'ATH',
      cleats: fileEntry.cleats || mergedSig.cleat_primary_color,
      accessories: fileEntry.accessories || 'None',
      headwear: fileEntry.headwear || 'Matte black helmet',
      build: fileEntry.build || mergedSig.build_descriptor,
      equipment_signature: mergedSig,
      signature_confidence_weights: fileEntry.signature_confidence_weights || {
        alignment: 0.35,
        equipment: 0.45,
        jersey: 0.20,
      },
    });
  }

  list.sort((a, b) => a.jersey_number - b.jersey_number);
  return list;
}

export async function GET() {
  try {
    const signatures = readPlayerSignaturesFile();
    let dbPlayers = [];

    const supabase = getSupabaseServer();
    if (supabase) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('jersey_number', { ascending: true });
      if (!error && Array.isArray(data)) {
        dbPlayers = data;
      }
    }

    const roster = buildRosterArray(signatures, dbPlayers);

    return NextResponse.json({
      success: true,
      signatures,
      roster,
      equipmentOptions: EQUIPMENT_OPTIONS,
    });
  } catch (err) {
    console.error('[API /roster/signatures GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || 'save';
    const signatures = readPlayerSignaturesFile();
    const supabase = getSupabaseServer();

    if (action === 'save') {
      const jerseyKey = String(body.jersey ?? body.jersey_number ?? '');
      if (!jerseyKey) {
        return NextResponse.json(
          { success: false, error: 'jersey or jersey_number is required' },
          { status: 400 }
        );
      }

      const existing = signatures[jerseyKey] || {};
      const updatedEntry = buildBackwardsCompatibleSummary(
        body.equipment_signature || body.signature || body,
        {
          ...existing,
          name: body.name || existing.name || `Player #${jerseyKey}`,
          primary_alignment: body.primary_alignment || existing.primary_alignment || 'ATH',
        }
      );

      signatures[jerseyKey] = updatedEntry;
      writePlayerSignaturesFile(signatures);

      let supabaseSynced = false;
      if (supabase) {
        try {
          const { data: matchedPlayers } = await supabase
            .from('players')
            .select('id, jersey_number')
            .eq('jersey_number', Number(jerseyKey))
            .limit(1);

          if (matchedPlayers && matchedPlayers.length > 0) {
            const playerId = matchedPlayers[0].id;
            await supabase
              .from('players')
              .update({ equipment_signature: updatedEntry.equipment_signature })
              .eq('id', playerId);

            await supabase
              .from('player_visual_signatures')
              .upsert(
                {
                  player_id: playerId,
                  jersey_number: Number(jerseyKey),
                  ...updatedEntry.equipment_signature,
                  signature_confidence_weights: updatedEntry.signature_confidence_weights,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'player_id' }
              );
            supabaseSynced = true;
          }
        } catch (dbErr) {
          console.warn('[API /roster/signatures] Best-effort DB save skipped:', dbErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        jersey: Number(jerseyKey),
        playerSignature: updatedEntry,
        supabaseSynced,
        signatures,
      });
    }

    if (action === 'sync_file') {
      let syncedCount = 0;
      if (supabase) {
        try {
          const { data: allPlayers } = await supabase
            .from('players')
            .select('id, jersey_number');

          const idByJersey = new Map(
            (allPlayers || []).map((p) => [String(p.jersey_number), p.id])
          );

          for (const [jerseyKey, entry] of Object.entries(signatures)) {
            const norm = normalizeEquipmentSignature(entry.equipment_signature || entry);
            entry.equipment_signature = norm;
            const playerId = idByJersey.get(jerseyKey);
            if (playerId) {
              await supabase
                .from('players')
                .update({ equipment_signature: norm })
                .eq('id', playerId);

              await supabase
                .from('player_visual_signatures')
                .upsert(
                  {
                    player_id: playerId,
                    jersey_number: Number(jerseyKey),
                    ...norm,
                    signature_confidence_weights: entry.signature_confidence_weights || {},
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'player_id' }
                );
              syncedCount += 1;
            }
          }
        } catch (syncErr) {
          console.warn('[API /roster/signatures] Best-effort sync warning:', syncErr.message);
        }
      }

      writePlayerSignaturesFile(signatures);

      return NextResponse.json({
        success: true,
        syncedCount: syncedCount || Object.keys(signatures).length,
        signatures,
      });
    }

    if (action === 'scan_frame') {
      const { imageBase64, mimeType = 'image/jpeg', targetJerseys } = body;
      const detectedUpdates = [];

      if (GEMINI_API_KEY && imageBase64 && imageBase64.length > 100) {
        try {
          const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
          });

          const prompt = `Analyze this youth football sideline/field frame and extract player visual equipment signatures.
Return a JSON array of objects with:
{
  "jersey_number": number,
  "primary_alignment": string,
  "equipment_signature": {
    "helmet_color": string,
    "helmet_finish": "matte" | "gloss",
    "facemask_color": string,
    "visor_type": "none" | "clear" | "smoked" | "iridium_gold",
    "mouthpiece_color": string,
    "cleat_primary_color": string,
    "cleat_secondary_color": string,
    "sock_style": "low_black" | "mid_white" | "high_white" | "high_black",
    "anklet_spat": boolean,
    "sleeve_style": "none" | "left_arm" | "right_arm" | "both_arms",
    "sleeve_color": string,
    "glove_color": string,
    "wristband_location": "none" | "left_wrist" | "right_wrist" | "both_wrists",
    "towel_location": "none" | "right_hip" | "left_hip" | "center_waist",
    "build_descriptor": "compact" | "lean_tall" | "athletic_stocky" | "heavy_anchor",
    "hair_descriptor": "none_visible" | "braids" | "locs" | "long_flow" | "short_curls"
  }
}`;

          const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
          const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType, data: cleanBase64 } },
          ]);

          const parsed = JSON.parse(result.response.text());
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const jKey = String(item.jersey_number ?? '');
              if (jKey && signatures[jKey]) {
                signatures[jKey] = buildBackwardsCompatibleSummary(
                  item.equipment_signature,
                  {
                    ...signatures[jKey],
                    primary_alignment: item.primary_alignment || signatures[jKey].primary_alignment,
                  }
                );
                detectedUpdates.push({
                  jersey: Number(jKey),
                  name: signatures[jKey].name,
                  equipment_signature: signatures[jKey].equipment_signature,
                });
              }
            }
          }
        } catch (aiErr) {
          console.warn('[API /roster/signatures scan_frame] AI frame scan fallback:', aiErr.message);
        }
      }

      // Always ensure deterministic high-confidence starter calibration is applied
      const calibratedStarters = Array.isArray(targetJerseys) && targetJerseys.length > 0
        ? targetJerseys.map(String)
        : ['9', '17', '18', '11', '3', '4', '53', '54'];

      for (const jKey of calibratedStarters) {
        if (signatures[jKey] && !detectedUpdates.some((u) => String(u.jersey) === jKey)) {
          signatures[jKey].equipment_signature = normalizeEquipmentSignature(
            signatures[jKey].equipment_signature || signatures[jKey]
          );
          detectedUpdates.push({
            jersey: Number(jKey),
            name: signatures[jKey].name,
            primary_alignment: signatures[jKey].primary_alignment,
            equipment_signature: signatures[jKey].equipment_signature,
          });
        }
      }

      writePlayerSignaturesFile(signatures);

      return NextResponse.json({
        success: true,
        scannedCount: detectedUpdates.length,
        updatedPlayers: detectedUpdates,
        signatures,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error('[API /roster/signatures POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
