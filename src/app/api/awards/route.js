import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';

const AWARD_TYPES = [
  'Film Guru 🎬',
  'Practice MVP 💪',
  'Playmaker 🏈',
  'Iron Man 🦾',
  'Rising Star ⭐',
  'Team Builder 🤝',
  'Defensive Mastermind 🛡️',
  'Offensive Genius 🧠',
];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');

    const supabase = getSupabase();

    let query = supabase
      .from('staff_awards')
      .select('*')
      .order('created_at', { ascending: false });

    if (recipientId) {
      query = query.eq('recipient_id', recipientId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ awards: data, awardTypes: AWARD_TYPES });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { recipientId, recipientName, awardType, reason, giverId, giverName } = await request.json();

    if (!recipientId || !awardType) {
      return NextResponse.json({ error: 'recipientId and awardType are required' }, { status: 400 });
    }

    if (!AWARD_TYPES.includes(awardType)) {
      return NextResponse.json({ error: `Invalid award type. Must be one of: ${AWARD_TYPES.join(', ')}` }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('staff_awards')
      .insert({
        recipient_id: recipientId,
        giver_id: giverId || null,
        award_type: awardType,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send celebratory Telegram message
    const name = recipientName || 'A staff member';
    const giver = giverName || 'The coaching staff';
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const message = [
      `🏆🏆🏆 *AWARD ALERT!* 🏆🏆🏆`,
      ``,
      `*${name}* just received the`,
      `✨ *${awardType}* ✨ award!`,
      ``,
      reason ? `📝 _"${reason}"_\n` : '',
      `Awarded by: *${giver}*`,
      `🕐 ${timestamp}`,
      ``,
      `🎉 Congratulations! Keep building CHAMPIONS! 💪🏈`,
    ].filter(Boolean).join('\n');

    sendTelegramMessage(message).catch((err) =>
      console.error('[Awards] Telegram notification failed:', err.message)
    );

    return NextResponse.json({ success: true, award: data });
  } catch (err) {
    console.error('[Awards] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
