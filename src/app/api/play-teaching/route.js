import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { playId, positionKey } = await req.json();
    if (!playId || !positionKey) return NextResponse.json({ error: 'Missing playId or positionKey' }, { status: 400 });

    // Check cache
    const { data: existing } = await supabase
      .from('play_teachings')
      .select('*')
      .eq('play_id', playId)
      .eq('position_key', positionKey)
      .single();
    if (existing) return NextResponse.json({ teaching: existing });

    // Load play data
    const { data: play } = await supabase.from('playbook_plays').select('*, playbook_formations(name, side)').eq('id', playId).single();
    if (!play) return NextResponse.json({ error: 'Play not found' }, { status: 404 });

    const assignment = play.assignments?.[positionKey] || 'No specific assignment listed';
    const formationName = play.playbook_formations?.name || 'Unknown';

    const prompt = `You are a youth football coaching expert teaching 8-year-old kids (8U tackle football).

PLAY: "${play.name}"
FORMATION: "${formationName}"
PLAY TYPE: ${play.play_type} ${play.direction ? `(${play.direction})` : ''}
FULL PLAY DESCRIPTION: ${play.description}

POSITION BEING TAUGHT: ${positionKey}
THIS PLAYER'S ASSIGNMENT: ${assignment}

ALL PLAYER ASSIGNMENTS:
${Object.entries(play.assignments || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}

Generate a teaching breakdown for an 8-year-old playing the ${positionKey} position on this play. Use simple, fun language they can understand. Be specific about body mechanics and what they should see/do.

Respond in this exact JSON format:
{
  "title": "Your Job on ${play.name}",
  "narration": "A 3-4 sentence explanation written TO the kid. Example: 'Hey buddy! On this play, YOUR job is the most important. You're going to...' Make it exciting and encouraging.",
  "steps": [
    {
      "step": 1,
      "action": "What to do (2-3 words like 'Get in Stance')",
      "detail": "Detailed instruction written for an 8-year-old. Include body position, where to look, what to feel.",
      "visual_prompt": "A detailed prompt to generate an illustration of a youth football player performing this exact action. Include: jersey color (green), age (8 years old), body position, camera angle, field context."
    }
  ],
  "coaching_tips": ["Tip 1 for coaches watching this player", "Tip 2"],
  "common_mistakes": ["Mistake kids make and how to fix it", "Another common mistake"],
  "strength_vs": "What defensive look this play works best against and why",
  "weakness_vs": "What defensive look stops this play and what to watch for"
}

Include 4-6 steps that cover the FULL sequence from pre-snap to finish. Each step should be a key moment.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return NextResponse.json({ error: 'Gemini returned no content' }, { status: 500 });

    const teaching = JSON.parse(rawText);

    // Save to DB
    const row = {
      play_id: playId,
      position_key: positionKey,
      title: teaching.title,
      narration: teaching.narration,
      steps: teaching.steps,
      coaching_tips: teaching.coaching_tips || [],
      common_mistakes: teaching.common_mistakes || [],
    };

    const { data: saved, error: saveErr } = await supabase.from('play_teachings').insert(row).select().single();
    if (saveErr) console.error('Save error:', saveErr);

    return NextResponse.json({ teaching: { ...row, ...teaching, id: saved?.id } });
  } catch (err) {
    console.error('Teaching API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
