import { NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { opponent, notes } = await req.json();
    if (!opponent) return NextResponse.json({ error: 'Opponent name required' }, { status: 400 });

    const prompt = `You are an elite youth football scout and game-planning coordinator for an 8U tackle football team called the Delray Rocks. We run a "Beast" formation offense (Power I / Tight formation) with primarily run plays.

UPCOMING OPPONENT: ${opponent}

SCOUTING NOTES FROM COACHES:
${notes || 'No specific notes provided. Generate a general youth football scouting report with common 8U tendencies.'}

Based on this information, generate a comprehensive pregame scouting report and game plan.

Respond in this exact JSON format:
{
  "overview": "2-3 sentence overview of the opponent and what to expect",
  "expectedDefense": [
    "Their primary defensive alignment and what to expect",
    "How they typically handle run-heavy teams",
    "Blitz tendencies and when they send pressure",
    "Secondary coverage tendencies"
  ],
  "expectedOffense": [
    "Their primary offensive formation and style",
    "Their go-to plays and tendencies",
    "Key players to watch on their offense",
    "What they do in the red zone"
  ],
  "gamePlan": [
    "Specific play or strategy recommendation #1 with reasoning",
    "Specific play or strategy recommendation #2",
    "Specific play or strategy recommendation #3",
    "Halftime adjustment plan if we're behind",
    "Clock management strategy if we're ahead"
  ],
  "keyMatchups": [
    "Matchup 1 to exploit or worry about",
    "Matchup 2"
  ],
  "warnings": [
    "Thing to watch out for #1",
    "Thing to watch out for #2"
  ]
}

Be specific to 8U youth football. Reference actual play concepts (sweeps, dives, counters, etc.). Keep language practical for sideline use.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
        }),
      }
    );

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return NextResponse.json({ error: 'No report generated' }, { status: 500 });

    return NextResponse.json({ report: JSON.parse(rawText) });
  } catch (err) {
    console.error('Scouting error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
