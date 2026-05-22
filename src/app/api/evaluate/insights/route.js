import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { playerId } = await req.json();
    if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });

    // Load player
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    // Load evaluations
    const { data: evals } = await supabase
      .from('evaluations')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (!evals || evals.length === 0) {
      return NextResponse.json({ insight: 'No evaluation history available yet. Complete a few evaluations to unlock AI development insights.' });
    }

    const evalHistory = evals.map(e => {
      const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${date}: Effort=${e.effort}/5, Discipline=${e.discipline}/5, Coachability=${e.coachability}/5, Technique=${e.technique}/5, Physicality=${e.physicality}/5${e.notes ? ` | Notes: ${e.notes}` : ''}`;
    }).join('\n');

    const prompt = `You are a youth football development coach for 8U tackle football.

Player: ${player.first_name} ${player.last_name}, #${player.jersey_number || '?'}, Position: ${player.position || 'Unassigned'}

Evaluation History (most recent first):
${evalHistory}

Based on this evaluation history, provide 2-3 sentences of development insight. Focus on:
- What areas are improving
- What areas need attention
- A specific, actionable recommendation for the next practice

Keep it concise, constructive, and appropriate for youth sports. Respond with plain text only, no JSON.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return NextResponse.json({ error: 'Gemini returned no content' }, { status: 500 });

    return NextResponse.json({ insight: rawText.trim() });
  } catch (err) {
    console.error('Evaluate insights API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
