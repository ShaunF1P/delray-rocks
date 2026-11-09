import { NextResponse } from 'next/server';
import { defaultQwikCutClient } from '@/lib/qwikcut';

/**
 * GET /api/qwikcut/stats?filmId=qwik_film_8u_001
 * Returns aggregated game statistics, EPA, yards per play, snap telemetry, and player touch distribution.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filmId = searchParams.get('filmId') || 'qwik_film_8u_001';

    const stats = await defaultQwikCutClient.getGameStats(filmId);

    return NextResponse.json({
      success: true,
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('QwikCut stats GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to compute game stats from QwikCut', details: err.message },
      { status: 500 }
    );
  }
}
