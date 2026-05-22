import { NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { focus_areas, upcoming_opponent, recent_post_game, duration_minutes } = await req.json();

    const duration = duration_minutes || 90;
    const focusList = (focus_areas || []).join(', ') || 'general fundamentals';

    let postGameContext = '';
    if (recent_post_game) {
      const pg = recent_post_game;
      postGameContext = `
RECENT POST-GAME DATA:
${pg.headline ? `- Game Summary: ${pg.headline}` : ''}
${pg.offenseGrade ? `- Offense Grade: ${pg.offenseGrade}` : ''}
${pg.defenseGrade ? `- Defense Grade: ${pg.defenseGrade}` : ''}
${pg.troublePlays?.length ? `- Trouble Plays: ${pg.troublePlays.join('; ')}` : ''}
${pg.adjustments?.length ? `- Recommended Adjustments: ${pg.adjustments.join('; ')}` : ''}
${pg.playerDevelopment?.length ? `- Player Development Areas: ${pg.playerDevelopment.join('; ')}` : ''}
${pg.runGameAnalysis ? `- Run Game: ${pg.runGameAnalysis}` : ''}
${pg.passGameAnalysis ? `- Pass Game: ${pg.passGameAnalysis}` : ''}
${pg.nextGamePlan ? `- Next Game Plan: ${pg.nextGamePlan}` : ''}`;
    }

    const prompt = `You are an 8U youth football practice coordinator for the Delray Rocks. Generate a structured practice plan.

PRACTICE PARAMETERS:
- Total Duration: ${duration} minutes
- Focus Areas: ${focusList}
${upcoming_opponent ? `- Upcoming Opponent: ${upcoming_opponent}` : ''}
${postGameContext}

RULES FOR 8U PRACTICE:
- Keep drills age-appropriate (7-8 year olds)
- Emphasize fundamentals and fun
- No drill should exceed 15 minutes (short attention spans)
- Include water breaks every 20-25 minutes
- Start with dynamic warmup, end with conditioning/cooldown
- Balance individual skill work with team periods
- If post-game data shows weak areas, address them with targeted drills

Generate the practice plan as JSON with this exact format:
{
  "blocks": [
    {
      "type": "warmup|individual|team|special|conditioning",
      "title": "Block title",
      "duration_minutes": 5,
      "description": "What this block covers and coaching points",
      "drills": [
        {
          "name": "Drill name",
          "description": "How to run the drill and what to coach",
          "reps": "e.g. 3 sets of 5, or 2 minutes each, or 6 reps per player"
        }
      ]
    }
  ]
}

Make sure the total of all block durations equals approximately ${duration} minutes. Include 5-7 blocks.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
        }),
      }
    );

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return NextResponse.json({ error: 'No practice plan generated' }, { status: 500 });

    return NextResponse.json({ plan: JSON.parse(rawText) });
  } catch (err) {
    console.error('Practice plan generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
