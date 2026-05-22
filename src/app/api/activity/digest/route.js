import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';
import { getActivitySummary, EVENT_EMOJI } from '@/lib/activity';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.5-flash';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  // Allow if CRON_SECRET matches OR if no CRON_SECRET is set (for manual testing)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '7', 10);

    const supabase = getSupabase();
    const summary = await getActivitySummary(supabase, daysBack);

    if (summary.total === 0) {
      const noActivityMsg = `📊 *Delray Rocks — Activity Digest*\n\nNo activity recorded in the last ${daysBack} day(s). Time to get to work! 💪🏈`;
      await sendTelegramMessage(noActivityMsg);
      return NextResponse.json({ digest: noActivityMsg, total: 0 });
    }

    // Build breakdown for the AI prompt
    const breakdown = Object.entries(summary.byType)
      .map(([type, count]) => `- ${EVENT_EMOJI[type] || '📌'} ${type}: ${count}`)
      .join('\n');

    const recentSample = summary.recent
      .slice(0, 10)
      .map((r) => {
        const name = r.details?.coachName || 'Unknown';
        return `- ${name}: ${r.event_type} at ${new Date(r.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' })}`;
      })
      .join('\n');

    const prompt = `You are the digital assistant for the Delray Rocks 8U youth football coaching staff. Generate an engaging, motivating ${daysBack <= 1 ? 'daily' : 'weekly'} activity digest for the Telegram group chat.

ACTIVITY DATA (last ${daysBack} days):
Total activities: ${summary.total}

Breakdown by type:
${breakdown}

Recent activity sample:
${recentSample}

RULES:
- Use football and coaching-themed language
- Include relevant emojis (🏈 🏆 💪 ⭐ 🎬 📋)
- Start with a headline like "🏈 DELRAY ROCKS — ${daysBack <= 1 ? 'DAILY' : 'WEEKLY'} DIGEST"
- Highlight top contributors by name if available
- Mention standout numbers (e.g., "12 film sessions reviewed!")
- End with a motivating one-liner
- Keep it under 300 words
- Format for Telegram Markdown (use *bold*, _italic_)
- Do NOT use headers with # — Telegram doesn't support them`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const digest = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate digest.';

    // Post the digest to Telegram
    await sendTelegramMessage(digest);

    return NextResponse.json({
      digest,
      summary: {
        total: summary.total,
        byType: summary.byType,
        daysBack,
      },
      model: GEMINI_MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Activity Digest] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
