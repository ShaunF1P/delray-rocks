/**
 * Telegram Bot Integration — Server-side only
 * Sends messages and photos to the Delray Rocks coaching staff Telegram group.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Send a text message to the configured Telegram chat.
 * @param {string} text - The message text (supports Markdown or HTML based on parseMode)
 * @param {'Markdown'|'HTML'} parseMode - Telegram parse mode
 * @returns {Promise<object>} Telegram API response
 */
export async function sendTelegramMessage(text, parseMode = 'Markdown') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured — skipping notification.');
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('[Telegram] API error:', data.description);
    }

    return data;
  } catch (err) {
    console.error('[Telegram] Failed to send message:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Send a photo with caption to the configured Telegram chat.
 * Useful for award announcements and highlights.
 * @param {string} photoUrl - Public URL of the image
 * @param {string} caption - Photo caption text
 * @param {'Markdown'|'HTML'} parseMode - Telegram parse mode for caption
 * @returns {Promise<object>} Telegram API response
 */
export async function sendTelegramPhoto(photoUrl, caption = '', parseMode = 'Markdown') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured — skipping photo.');
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: parseMode,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('[Telegram] Photo API error:', data.description);
    }

    return data;
  } catch (err) {
    console.error('[Telegram] Failed to send photo:', err.message);
    return { ok: false, error: err.message };
  }
}
