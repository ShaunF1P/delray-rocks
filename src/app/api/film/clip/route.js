import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const maxDuration = 120;

export async function POST(request) {
  try {
    const {
      parentFilmId,
      startTime,
      endTime,
      title,
      description,
      filmType,
      opponent,
      filmDate
    } = await request.json();

    if (!parentFilmId || startTime == null || endTime == null || !title) {
      return NextResponse.json({ error: 'parentFilmId, startTime, endTime, and title are required' }, { status: 400 });
    }

    const duration = Math.round(endTime - startTime);
    if (duration <= 0) {
      return NextResponse.json({ error: 'Invalid duration: endTime must be greater than startTime' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Fetch parent film details
    const { data: parentFilm, error: fetchErr } = await supabase
      .from('game_films')
      .select('*')
      .eq('id', parentFilmId)
      .single();

    if (fetchErr || !parentFilm) {
      return NextResponse.json({ error: `Parent film not found: ${fetchErr?.message || ''}` }, { status: 404 });
    }

    // 2. Prepare temp paths
    const tempDir = path.join(os.tmpdir(), 'delray_clips');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const clipFilename = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.mp4`;
    const tempFilePath = path.join(tempDir, clipFilename);

    console.log(`[API Slicing] Extracting: ${startTime}s to ${endTime}s from ${parentFilm.video_url}`);
    
    // 3. Slice remotely using ffmpeg
    try {
      execSync(`ffmpeg -y -ss ${startTime} -i "${parentFilm.video_url}" -t ${duration} -c copy -movflags +faststart "${tempFilePath}"`);
    } catch (ffmpegErr) {
      console.error('[API Slicing] ffmpeg execution failed:', ffmpegErr);
      return NextResponse.json({ error: `ffmpeg slice failed: ${ffmpegErr.message}` }, { status: 500 });
    }

    // Verify file exists and has size
    if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
      return NextResponse.json({ error: 'Failed to create sliced video file' }, { status: 500 });
    }

    // 4. Upload sliced file to Supabase Storage
    const fileBuffer = fs.readFileSync(tempFilePath);
    const storagePath = `play_clips/${clipFilename}`;
    
    console.log(`[API Slicing] Uploading sliced file to Supabase Storage: ${storagePath}`);
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('game-films')
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadErr) {
      // Cleanup temp file
      try { fs.unlinkSync(tempFilePath); } catch {}
      console.error('[API Slicing] Supabase storage upload failed:', uploadErr);
      return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('game-films')
      .getPublicUrl(storagePath);
    
    const publicUrl = urlData.publicUrl;

    // 5. Cleanup temp file
    try { fs.unlinkSync(tempFilePath); } catch {}

    // 6. Save clip record in database
    console.log(`[API Slicing] Inserting film record for play clip: "${title}"`);
    const { data: newClip, error: insertErr } = await supabase
      .from('game_films')
      .insert({
        title,
        description: description || `Physically cut clip from ${parentFilm.title}`,
        film_type: filmType || 'drill',
        opponent: opponent || parentFilm.opponent,
        film_date: filmDate || parentFilm.film_date,
        video_url: publicUrl,
        parent_film_id: parentFilmId,
        clip_start_seconds: null, // Nullified since it starts at 0s
        clip_end_seconds: null,
        duration_seconds: duration,
        ai_status: 'completed'
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[API Slicing] Database insert failed:', insertErr);
      return NextResponse.json({ error: `Database insert failed: ${insertErr.message}` }, { status: 500 });
    }

    console.log(`[API Slicing] Slicing and database creation complete for clip ID: ${newClip.id}`);
    return NextResponse.json({ success: true, clip: newClip });
  } catch (err) {
    console.error('[API Slicing] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
