/**
 * GoHighLevel API Client for Delray Rocks
 * Location ID: 5qs5M2XozDLuejIacDVD
 */

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || '5qs5M2XozDLuejIacDVD';

async function ghlFetch(endpoint, options = {}) {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    console.warn('GHL_API_KEY not set — GHL integration disabled');
    return { data: null, error: 'GHL not configured' };
  }

  try {
    const res = await fetch(`${GHL_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { data: null, error: `GHL API error ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// ─── Calendar ───────────────────────────────────────────────
export async function getCalendars() {
  return ghlFetch(`/calendars/?locationId=${GHL_LOCATION_ID}`);
}

export async function getCalendarEvents(calendarId, startDate, endDate) {
  const params = new URLSearchParams({
    locationId: GHL_LOCATION_ID,
    calendarId,
    startTime: startDate,
    endTime: endDate,
  });
  return ghlFetch(`/calendars/events?${params}`);
}

export async function createCalendarEvent(calendarId, eventData) {
  return ghlFetch(`/calendars/events`, {
    method: 'POST',
    body: JSON.stringify({
      locationId: GHL_LOCATION_ID,
      calendarId,
      ...eventData,
    }),
  });
}

// ─── Contacts ───────────────────────────────────────────────
export async function getContacts(query = '') {
  const params = new URLSearchParams({ locationId: GHL_LOCATION_ID });
  if (query) params.append('query', query);
  return ghlFetch(`/contacts/?${params}`);
}

export async function createContact(contactData) {
  return ghlFetch(`/contacts/`, {
    method: 'POST',
    body: JSON.stringify({
      locationId: GHL_LOCATION_ID,
      ...contactData,
    }),
  });
}

// ─── Opportunities / Campaigns ──────────────────────────────
export async function getPipelines() {
  return ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`);
}

// ─── Status ─────────────────────────────────────────────────
export async function checkGHLConnection() {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) return { connected: false, reason: 'No API key configured' };

  const { data, error } = await getCalendars();
  if (error) return { connected: false, reason: error };
  return { connected: true, calendars: data?.calendars || [] };
}

export const GHL_CONFIG = {
  locationId: GHL_LOCATION_ID,
  baseUrl: GHL_BASE_URL,
};
