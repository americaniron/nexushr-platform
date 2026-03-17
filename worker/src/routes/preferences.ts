/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR User Preferences API — Theme, locale, and notification settings
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Env } from '../index';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handlePreferences(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;

  try {
    // ── Get Preferences ──
    if (path === '/api/preferences' && method === 'GET') {
      const prefs = await env.DB.prepare(
        'SELECT * FROM user_preferences WHERE user_id = ?'
      ).bind(userId).first();

      if (!prefs) {
        return json({
          success: true,
          data: { theme: 'system', locale: 'en', notifications: true, reducedMotion: false },
        });
      }

      return json({
        success: true,
        data: {
          theme: prefs.theme || 'system',
          locale: prefs.locale || 'en',
          notifications: prefs.notifications !== 0,
          reducedMotion: prefs.reduced_motion === 1,
          timezone: prefs.timezone,
          updatedAt: prefs.updated_at,
        },
      });
    }

    // ── Update Preferences ──
    if (path === '/api/preferences' && method === 'PUT') {
      const body = await request.json() as any;
      const now = new Date().toISOString();

      // Upsert preferences
      await env.DB.prepare(`
        INSERT INTO user_preferences (user_id, theme, locale, notifications, reduced_motion, timezone, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          theme = COALESCE(?, theme),
          locale = COALESCE(?, locale),
          notifications = COALESCE(?, notifications),
          reduced_motion = COALESCE(?, reduced_motion),
          timezone = COALESCE(?, timezone),
          updated_at = ?
      `).bind(
        userId,
        body.theme || 'system',
        body.locale || 'en',
        body.notifications !== undefined ? (body.notifications ? 1 : 0) : 1,
        body.reducedMotion ? 1 : 0,
        body.timezone || null,
        now,
        body.theme || null,
        body.locale || null,
        body.notifications !== undefined ? (body.notifications ? 1 : 0) : null,
        body.reducedMotion !== undefined ? (body.reducedMotion ? 1 : 0) : null,
        body.timezone || null,
        now,
      ).run();

      return json({ success: true, message: 'Preferences updated' });
    }

    return json({ error: 'Not Found' }, 404);
  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500);
  }
}

export const PREFERENCES_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'system',
    locale TEXT DEFAULT 'en',
    notifications INTEGER DEFAULT 1,
    reduced_motion INTEGER DEFAULT 0,
    timezone TEXT,
    updated_at TEXT
  )`,
];
