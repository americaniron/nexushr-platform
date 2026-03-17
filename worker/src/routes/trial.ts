/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Trial & Conversion API Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Env } from '../index';
import { TrialService, TRIAL_SCHEMA } from '../lib/trial';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleTrial(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const trialService = new TrialService(env);
  const method = request.method;
  const url = new URL(request.url);

  try {
    // ── Schema Init ──
    if (path === '/api/trial/init' && method === 'POST') {
      for (const sql of TRIAL_SCHEMA) {
        await env.DB.prepare(sql).run();
      }
      return json({ success: true, message: 'Trial schema initialized', tables: TRIAL_SCHEMA.length });
    }

    // ── Create Trial ──
    if (path === '/api/trial/start' && method === 'POST') {
      const body = await request.json() as any;
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '0.0.0.0';
      const userAgent = request.headers.get('User-Agent') || '';

      if (!body.email) return json({ error: 'Email is required' }, 400);
      if (!body.fingerprint) return json({ error: 'Device fingerprint is required' }, 400);

      const result = await trialService.createTrial({
        userId,
        email: body.email,
        fingerprint: body.fingerprint,
        ip,
        userAgent,
        referralSource: body.referralSource,
      });

      if (result.blocked) {
        return json({
          success: false,
          error: 'Trial creation blocked',
          code: 'ABUSE_DETECTED',
          signals: result.signals?.map(s => ({ type: s.type, severity: s.severity })),
        }, 403);
      }

      return json({
        success: true,
        data: {
          trial: result.trial,
          verificationRequired: true,
          message: 'Check your email to verify your account and start your trial',
        },
      });
    }

    // ── Verify Email ──
    if (path === '/api/trial/verify' && method === 'POST') {
      const body = await request.json() as any;
      if (!body.token) return json({ error: 'Verification token is required' }, 400);

      const trial = await trialService.verifyEmail(body.token);
      if (!trial) return json({ error: 'Invalid or expired verification token' }, 400);

      return json({ success: true, data: { trial, message: 'Email verified — your trial is now active!' } });
    }

    // ── Get Trial Status ──
    if (path === '/api/trial/status' && method === 'GET') {
      const status = await trialService.getTrialStatus(userId);
      return json({ success: true, data: status });
    }

    // ── Extend Trial (admin/sales) ──
    if (path === '/api/trial/extend' && method === 'POST') {
      const body = await request.json() as any;
      const targetUserId = body.userId || userId;

      if (!body.additionalDays || !body.reason) {
        return json({ error: 'additionalDays and reason are required' }, 400);
      }

      const trial = await trialService.extendTrial({
        userId: targetUserId,
        additionalDays: body.additionalDays,
        reason: body.reason,
        approvedBy: userId,
      });

      if (!trial) return json({ error: 'Trial not found' }, 404);
      return json({ success: true, data: { trial, message: `Trial extended by ${body.additionalDays} days` } });
    }

    // ── Convert Trial ──
    if (path === '/api/trial/convert' && method === 'POST') {
      const body = await request.json() as any;
      if (!body.planId) return json({ error: 'planId is required' }, 400);

      const trial = await trialService.convertTrial(userId, body.planId);
      if (!trial) return json({ error: 'Trial not found' }, 404);

      return json({ success: true, data: { trial, message: `Converted to ${body.planId}` } });
    }

    // ── Record Behavioral Event ──
    if (path === '/api/trial/behavior' && method === 'POST') {
      const body = await request.json() as any;
      const trial = await trialService.getTrial(userId);
      if (!trial) return json({ error: 'No active trial' }, 404);

      await trialService.recordBehavior({
        trialId: trial.id,
        userId,
        event: body.event,
        category: body.category || 'engagement',
        properties: body.properties,
        sessionId: body.sessionId || `sess_${Date.now().toString(36)}`,
      });

      return json({ success: true });
    }

    // ── Get Email Campaign History ──
    if (path === '/api/trial/emails' && method === 'GET') {
      const trial = await trialService.getTrial(userId);
      if (!trial) return json({ error: 'No trial found' }, 404);

      const emails = await trialService.getEmailHistory(trial.id);
      return json({ success: true, data: { emails } });
    }

    // ── Track Email Open (pixel) ──
    if (path.startsWith('/api/trial/emails/') && path.endsWith('/open') && method === 'GET') {
      const emailId = path.split('/')[4];
      await trialService.trackEmailOpen(emailId);
      // Return 1x1 transparent gif
      return new Response(
        Uint8Array.from([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,0,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59]),
        { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' } }
      );
    }

    // ── Track Email Click ──
    if (path.startsWith('/api/trial/emails/') && path.endsWith('/click') && method === 'GET') {
      const emailId = path.split('/')[4];
      await trialService.trackEmailClick(emailId);
      const redirect = url.searchParams.get('redirect') || '/';
      return Response.redirect(redirect, 302);
    }

    // ── Process Pending Emails (cron/scheduled) ──
    if (path === '/api/trial/emails/process' && method === 'POST') {
      const result = await trialService.processPendingEmails();
      return json({ success: true, data: result });
    }

    // ── Cohort Stats ──
    if (path === '/api/trial/cohorts' && method === 'GET') {
      const stats = await trialService.getCohortStats();
      return json({ success: true, data: { cohorts: stats } });
    }

    // ═══ A/B Testing Endpoints ═══

    // ── Create A/B Test ──
    if (path === '/api/trial/ab-tests' && method === 'POST') {
      const body = await request.json() as any;
      if (!body.name || !body.parameter || !body.variants) {
        return json({ error: 'name, parameter, and variants are required' }, 400);
      }
      const test = await trialService.createABTest(body);
      return json({ success: true, data: { test } });
    }

    // ── List Running A/B Tests ──
    if (path === '/api/trial/ab-tests' && method === 'GET') {
      const tests = await trialService.getRunningTests();
      return json({ success: true, data: { tests } });
    }

    // ── Get A/B Test Results ──
    if (path.match(/^\/api\/trial\/ab-tests\/[^/]+\/results$/) && method === 'GET') {
      const testId = path.split('/')[4];
      const results = await trialService.getABTestResults(testId);
      return json({ success: true, data: results });
    }

    // ── Conclude A/B Test ──
    if (path.match(/^\/api\/trial\/ab-tests\/[^/]+\/conclude$/) && method === 'POST') {
      const testId = path.split('/')[4];
      const body = await request.json() as any;
      const test = await trialService.concludeABTest(testId, body.winnerVariant);
      return json({ success: true, data: { test } });
    }

    // ── Trial Dashboard (admin) ──
    if (path === '/api/trial/dashboard' && method === 'GET') {
      const [trialCounts, cohortStats, abTests] = await Promise.all([
        env.DB.prepare(`
          SELECT status, COUNT(*) as cnt FROM trial_accounts GROUP BY status
        `).all(),
        trialService.getCohortStats(),
        trialService.getRunningTests(),
      ]);

      const statusMap: Record<string, number> = {};
      for (const r of trialCounts.results) {
        statusMap[r.status as string] = r.cnt as number;
      }

      // Email campaign effectiveness
      const emailStats = await env.DB.prepare(`
        SELECT step,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' OR status = 'opened' OR status = 'clicked' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'opened' OR status = 'clicked' THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked
        FROM trial_emails
        GROUP BY step
      `).all();

      const emailPerformance = emailStats.results.map(r => ({
        step: r.step,
        total: r.total,
        deliveredRate: (r.total as number) > 0 ? Math.round(((r.delivered as number) / (r.total as number)) * 100) : 0,
        openRate: (r.delivered as number) > 0 ? Math.round(((r.opened as number) / (r.delivered as number)) * 100) : 0,
        clickRate: (r.opened as number) > 0 ? Math.round(((r.clicked as number) / (r.opened as number)) * 100) : 0,
      }));

      // Conversion funnel
      const totalTrials = Object.values(statusMap).reduce((a, b) => a + b, 0);
      const verified = totalTrials - (statusMap['pending_verification'] || 0);
      const converted = statusMap['converted'] || 0;

      return json({
        success: true,
        data: {
          overview: {
            totalTrials,
            active: statusMap['active'] || 0,
            extended: statusMap['extended'] || 0,
            converted,
            expired: statusMap['expired'] || 0,
            suspended: statusMap['suspended'] || 0,
            pendingVerification: statusMap['pending_verification'] || 0,
          },
          funnel: {
            started: totalTrials,
            verified,
            verificationRate: totalTrials > 0 ? Math.round((verified / totalTrials) * 100) : 0,
            converted,
            conversionRate: verified > 0 ? Math.round((converted / verified) * 100) : 0,
          },
          cohorts: cohortStats,
          emailPerformance,
          abTests: abTests.map(t => ({
            id: t.id,
            name: t.name,
            parameter: t.parameter,
            variantCount: t.variants.length,
            totalImpressions: t.variants.reduce((sum, v) => sum + v.impressions, 0),
          })),
        },
      });
    }

    return json({ error: 'Not Found', code: 'TRIAL_NOT_FOUND' }, 404);
  } catch (err: any) {
    console.error('Trial route error:', err);
    return json({ error: err.message || 'Internal error', code: 'TRIAL_ERROR' }, 500);
  }
}
