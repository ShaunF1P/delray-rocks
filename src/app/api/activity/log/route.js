import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';
import { logActivity, EVENT_EMOJI } from '@/lib/activity';

// Server-side Supabase client (service role for API routes)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(request) {
  try {
    const { userId, eventType, details } = await request.json();

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Log the activity to the database
    const { data, error } = await logActivity(supabase, userId, eventType, details || {});

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build a Telegram notification
    const emoji = EVENT_EMOJI[eventType] || '📌';
    const coachName = details?.coachName || 'A coach';
    const actionMap = {
      login: 'logged in to the portal',
      film_view: `reviewed game film${details?.filmTitle ? ` — _${details.filmTitle}_` : ''}`,
      playbook_view: `opened the playbook${details?.play ? ` — _${details.play}_` : ''}`,
      evaluation: `completed a player evaluation${details?.playerName ? ` for _${details.playerName}_` : ''}`,
      roster_update: `updated the roster${details?.action ? ` (${details.action})` : ''}`,
      award_given: `gave an award${details?.recipientName ? ` to _${details.recipientName}_` : ''}`,
      practice_plan: `created a practice plan${details?.date ? ` for ${details.date}` : ''}`,
      report_generated: `generated a player report${details?.playerName ? ` for _${details.playerName}_` : ''}`,
    };

    const action = actionMap[eventType] || `performed action: ${eventType}`;
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const message = `${emoji} *Delray Rocks Activity*\n\n*${coachName}* ${action}\n\n🕐 ${timestamp}`;

    // Fire-and-forget Telegram notification
    sendTelegramMessage(message).catch((err) =>
      console.error('[Activity Log] Telegram notification failed:', err.message)
    );

    return NextResponse.json({ success: true, activity: data });
  } catch (err) {
    console.error('[Activity Log] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
