/**
 * Client-side activity tracker — fire-and-forget calls to /api/activity/log.
 * Import and call trackActivity() from any page to log an event and send a Telegram alert.
 */

export function trackActivity(eventType, details = {}) {
  // Fire-and-forget — don't await, don't block the UI
  fetch('/api/activity/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, details }),
  }).catch(() => {
    // Silently fail — activity logging should never break the UI
  });
}

// Convenience helpers
export const trackLogin = (name) => trackActivity('login', { name });
export const trackFilmView = (filmTitle) => trackActivity('film_view', { title: filmTitle });
export const trackPlaybookView = () => trackActivity('playbook_view', {});
export const trackEvaluation = (playerName) => trackActivity('evaluation', { player: playerName });
export const trackRosterUpdate = (action) => trackActivity('roster_update', { action });
export const trackPracticePlan = (title) => trackActivity('practice_plan', { title });
export const trackReportGenerated = (reportType) => trackActivity('report_generated', { type: reportType });
export const trackFilmUpload = (title) => trackActivity('film_upload', { title });
export const trackFilmAnalysis = (title) => trackActivity('film_analysis', { title });
