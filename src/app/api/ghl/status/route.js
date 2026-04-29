import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      connected: false,
      reason: 'GHL_API_KEY not configured in environment variables',
    });
  }

  try {
    const locationId = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || '5qs5M2XozDLuejIacDVD';
    const res = await fetch(`https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ connected: false, reason: `API returned ${res.status}` });
    }

    const data = await res.json();
    return NextResponse.json({
      connected: true,
      calendars: data.calendars || [],
      locationId,
    });
  } catch (err) {
    return NextResponse.json({ connected: false, reason: err.message });
  }
}
