import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.5-flash';

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { playerName, jerseyNumber, position, age, attendanceRate, evalScores, coachNotes, weekNumber } = await request.json();

    const prompt = `You are the head coach of an elite 8U youth football program called Delray Rocks. Generate a professional, warm, and encouraging "Weekly Player Development Report" for a parent to read.

PLAYER INFO:
- Name: ${playerName || 'Player'}
- Jersey: #${jerseyNumber || '?'}
- Position: ${position || 'Multiple'}
- Age: ${age || 8}
- Week: ${weekNumber || 1}
- Practice Attendance: ${attendanceRate || 'N/A'}%

EVALUATION SCORES (1-5 scale):
${evalScores ? Object.entries(evalScores).map(([k, v]) => `- ${k}: ${v}/5`).join('\n') : '- No evaluation data this week'}

COACH NOTES:
${coachNotes || 'No specific notes this week.'}

Generate the report with these EXACT sections:

# Weekly Development Report — ${playerName || 'Player'} (#${jerseyNumber || '?'})

## This Week's Highlights
2-3 specific positive things the player did well. Be encouraging and specific.

## Areas We're Working On
2 technique areas to improve. Frame positively — "We're building toward..." not "They failed at..."

## At-Home Practice Plan
3 simple, fun drills the parent can do with their child at home (backyard-friendly, no equipment needed). Include clear step-by-step instructions. Make them feel like games, not work.

## Game Day Nutrition Guide
Age-appropriate nutrition advice for an 8-year-old athlete:
- Pre-practice meal suggestion (2 hours before)
- Hydration target (oz of water)
- Post-practice recovery snack
- One weekly meal idea rich in protein for muscle recovery
Keep portions and foods realistic for a child (no supplements, no protein shakes).

## Coach's Message
A 2-3 sentence personal note from the coach to the parent. Warm, professional, motivating.

IMPORTANT RULES:
- This is for an 8-YEAR-OLD. Everything must be age-appropriate.
- Never recommend supplements, protein powder, or weight training.
- Emphasize FUN and development over competition.
- Use encouraging, positive language throughout.
- Keep the total report under 600 words.
- Format with clean markdown headers.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No report generated';

    return NextResponse.json({
      report: reportText,
      model: GEMINI_MODEL,
      playerName,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
