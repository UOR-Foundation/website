import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LIMITS = {
  projectName: 100,
  repoUrl: 300,
  contactEmail: 254,
  description: 300,
  problemStatement: 2000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE = /^https?:\/\/.{3,}/;

// In-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many submissions. Please wait 15 minutes.' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '900' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { projectName, repoUrl, contactEmail, description, problemStatement } = body as Record<string, string>;

  const errors: string[] = [];
  if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) errors.push('projectName is required.');
  else if (projectName.trim().length > LIMITS.projectName) errors.push(`projectName must be ${LIMITS.projectName} chars or fewer.`);

  if (!repoUrl || typeof repoUrl !== 'string' || !URL_RE.test(repoUrl.trim())) errors.push('repoUrl must be a valid URL.');
  else if (repoUrl.trim().length > LIMITS.repoUrl) errors.push(`repoUrl must be ${LIMITS.repoUrl} chars or fewer.`);

  if (!contactEmail || typeof contactEmail !== 'string' || !EMAIL_RE.test(contactEmail.trim())) errors.push('contactEmail must be a valid email.');
  else if (contactEmail.trim().length > LIMITS.contactEmail) errors.push(`contactEmail must be ${LIMITS.contactEmail} chars or fewer.`);

  if (!description || typeof description !== 'string' || description.trim().length === 0) errors.push('description is required.');
  else if (description.trim().length > LIMITS.description) errors.push(`description must be ${LIMITS.description} chars or fewer.`);

  if (!problemStatement || typeof problemStatement !== 'string' || problemStatement.trim().length === 0) errors.push('problemStatement is required.');
  else if (problemStatement.trim().length > LIMITS.problemStatement) errors.push(`problemStatement must be ${LIMITS.problemStatement} chars or fewer.`);

  if (errors.length > 0) {
    return new Response(JSON.stringify({ error: 'Validation failed.', details: errors }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: dbError } = await supabase.from('project_submissions').insert({
      project_name: projectName.trim(),
      repo_url: repoUrl.trim(),
      contact_email: contactEmail.trim(),
      description: description.trim(),
      problem_statement: problemStatement.trim(),
    });

    if (dbError) {
      console.error('project-submit: db insert failed:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save submission.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Submission received. Our technical committee will respond within 3 weeks.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('project-submit: unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal error. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
