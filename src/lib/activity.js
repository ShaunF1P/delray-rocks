/**
 * Activity Logger — Tracks coach/staff actions in Supabase
 */

/** Valid event types for activity tracking */
export const EVENT_TYPES = [
  'login',
  'film_view',
  'playbook_view',
  'evaluation',
  'roster_update',
  'award_given',
  'practice_plan',
  'report_generated',
];

/** Emoji map for Telegram notifications */
export const EVENT_EMOJI = {
  login: '🔐',
  film_view: '🎬',
  playbook_view: '📋',
  evaluation: '📊',
  roster_update: '📝',
  award_given: '🏆',
  practice_plan: '🏈',
  report_generated: '📄',
};

/**
 * Log an activity event to Supabase.
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - UUID of the user performing the action
 * @param {string} eventType - One of EVENT_TYPES
 * @param {object} details - Additional JSON data about the event
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function logActivity(supabase, userId, eventType, details = {}) {
  if (!EVENT_TYPES.includes(eventType)) {
    console.warn(`[Activity] Unknown event type: ${eventType}`);
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      event_type: eventType,
      details,
    })
    .select()
    .single();

  if (error) {
    console.error('[Activity] Failed to log:', error.message);
  }

  return { data, error };
}

/**
 * Get aggregated activity summary for the past N days.
 * @param {object} supabase - Supabase client instance
 * @param {number} daysBack - How many days to look back (default 7)
 * @returns {Promise<object>} Summary object with counts by event type, total, and recent entries
 */
export async function getActivitySummary(supabase, daysBack = 7) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('id, user_id, event_type, details, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Activity] Failed to fetch summary:', error.message);
    return { total: 0, byType: {}, recent: [], error };
  }

  // Aggregate counts by event type
  const byType = {};
  for (const log of logs) {
    byType[log.event_type] = (byType[log.event_type] || 0) + 1;
  }

  return {
    total: logs.length,
    byType,
    recent: logs.slice(0, 20),
    daysBack,
    since: since.toISOString(),
  };
}
