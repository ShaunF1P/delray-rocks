import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-pro';

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  try {
    const { angles, drillType, playerName, position } = await request.json();

    const prompt = `You are an elite youth football (8U) biomechanics coach. A player just performed a ${drillType} drill and the MediaPipe Pose AI captured the following joint angle measurements from the video:

${Object.entries(angles).map(([key, val]) => `- ${key}: ${val}°`).join('\n')}

Player: ${playerName || 'Unknown'}
Position: ${position || 'Unknown'}
Drill Type: ${drillType}

Based on these biomechanical measurements, provide:

1. **Form Grade (A-F)**: Overall technique grade with brief justification.
2. **What's Working Well**: 2-3 specific things the player is doing correctly based on the angles.
3. **Corrections Needed**: 2-3 specific technique fixes with ideal angle ranges for an 8U player.
4. **At-Home Drill Prescription**: 2 simple drills the player (or parent) can do at home to improve the weak areas.
5. **Injury Risk Assessment**: Based on the body mechanics, flag any positions that could lead to injury (especially head/neck for tackling).

IMPORTANT: This is an 8-year-old. Keep all advice age-appropriate. Emphasize safety, especially proper head-up tackling technique (Heads Up Football). Never recommend weight training or advanced strength work for this age group.

Format with clear markdown headers.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated';

    return NextResponse.json({
      analysis: analysisText,
      model: GEMINI_MODEL,
      drillType,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
