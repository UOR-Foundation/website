/**
 * project-submit edge function
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts validated project submission POSTs and forwards them to Google Sheets
 * via the existing Google Apps Script Web App endpoint.
 *
 * Security controls (F1 + F6 + F7):
 *  - All validation is server-side — client holds no token
 *  - Input length limits and format checks (email, URL, content)
 *  - Per-IP sliding-window rate limit (max 3 submissions per 15 minutes)
 *  - Returns a structured JSON response the client can inspect
 *  - Google Apps Script URL and token stored as Supabase secrets, never in
 *    client bundle
 *
 * NIST SP 800-53: SI-10 (Input Validation), AC-17 (Remote Access), SC-5 (DoS)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://uor.foundation',
  'Access-Control-Allow-Headers': 'content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// In-memory sliding-window rate limiter (resets on cold start — acceptable for
// a low-volume nonprofit form; persistent rate-limiting would require KV store)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;          // max submissions
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // per 15-minute window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// Field length limits
const LIMITS = {
  projectName: 100,
  repoUrl: 300,
  contactEmail: 254,
  description: 300,
  problemStatement: 2000,
};

// Simple email format check (RFC 5321 simplified)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// URL format check — must be http(s)
const URL_RE = /^https?:\/\/.{3,}/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown';

  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Too many submissions. Please wait 15 minutes and try again.' }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': '900',
        },
      }
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { projectName, repoUrl, contactEmail, description, problemStatement } = body as Record<string, string>;

  // ── Server-side validation ─────────────────────────────────────────────────
  const errors: string[] = [];

  if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
    errors.push('projectName is required.');
  } else if (projectName.trim().length > LIMITS.projectName) {
    errors.push(`projectName must be ${LIMITS.projectName} characters or fewer.`);
  }

  if (!repoUrl || typeof repoUrl !== 'string' || !URL_RE.test(repoUrl.trim())) {
    errors.push('repoUrl must be a valid https:// URL.');
  } else if (repoUrl.trim().length > LIMITS.repoUrl) {
    errors.push(`repoUrl must be ${LIMITS.repoUrl} characters or fewer.`);
  }

  if (!contactEmail || typeof contactEmail !== 'string' || !EMAIL_RE.test(contactEmail.trim())) {
    errors.push('contactEmail must be a valid email address.');
  } else if (contactEmail.trim().length > LIMITS.contactEmail) {
    errors.push(`contactEmail must be ${LIMITS.contactEmail} characters or fewer.`);
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('description is required.');
  } else if (description.trim().length > LIMITS.description) {
    errors.push(`description must be ${LIMITS.description} characters or fewer.`);
  }

  if (!problemStatement || typeof problemStatement !== 'string' || problemStatement.trim().length === 0) {
    errors.push('problemStatement is required.');
  } else if (problemStatement.trim().length > LIMITS.problemStatement) {
    errors.push(`problemStatement must be ${LIMITS.problemStatement} characters or fewer.`);
  }

  if (errors.length > 0) {
    return new Response(
      JSON.stringify({ error: 'Validation failed.', details: errors }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── Forward to Google Apps Script ──────────────────────────────────────────
  // Token and URL are stored as Supabase secrets — never in client code (F1, F7)
  const scriptUrl = Deno.env.get('GOOGLE_APPS_SCRIPT_URL');
  const scriptToken = Deno.env.get('GOOGLE_APPS_SCRIPT_TOKEN');

  if (!scriptUrl || !scriptToken) {
    console.error('project-submit: GOOGLE_APPS_SCRIPT_URL or GOOGLE_APPS_SCRIPT_TOKEN not configured');
    return new Response(
      JSON.stringify({ error: 'Service configuration error. Please contact the foundation.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const params = new URLSearchParams({
    token: scriptToken,
    projectName: projectName.trim(),
    repoUrl: repoUrl.trim(),
    contactEmail: contactEmail.trim(),
    description: description.trim(),
    problemStatement: problemStatement.trim(),
  });

  try {
    // Fire the GET request to the Apps Script endpoint
    await fetch(`${scriptUrl}?${params.toString()}`, {
      method: 'GET',
      redirect: 'follow',
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Submission received. Our technical committee will respond within 3 weeks.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('project-submit: upstream fetch failed:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to forward submission. Please try again or contact the foundation.' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
