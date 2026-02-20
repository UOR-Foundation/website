
# Security Audit: UOR Foundation Website
## Executive Summary

This is a **public-facing informational website** for a nonprofit foundation. It has no user authentication, no user-generated content, and no payment processing of its own (Donorbox handles payments via iframe). The attack surface is therefore narrow but specific. The audit covers six domains: backend data security, frontend content security, infrastructure hardening, supply chain risks, third-party integrations, and information disclosure.

---

## Audit Scope & Methodology

The analysis covered:
- All React/TypeScript source files
- Database schema, RLS policies, and Supabase linter results
- GitHub Actions CI/CD pipeline
- HTML document headers (`index.html`)
- Public-facing static files (`robots.txt`, `/.well-known/uor.json`, agent markdown files)
- Third-party integrations (Donorbox, Google Fonts, Google Calendar)
- Dependency manifest (`package.json`)

---

## Findings

### SEVERITY: MEDIUM

**1. Missing Content Security Policy (CSP) Headers**

The site has no `Content-Security-Policy` HTTP header or meta tag. CSP is the primary browser-enforced defense against Cross-Site Scripting (XSS). Without it, if any injected script were to execute (via a compromised CDN, supply chain attack, or future user-generated content), the browser has no instructions to block it.

*What it enables if exploited:* An attacker who can inject a script (e.g. via a compromised npm package or CDN) could exfiltrate data, hijack the Donorbox payment iframe context, or perform clickjacking on the donation flow.

*Recommended fix:*
Add a CSP `<meta>` tag to `index.html` that restricts script sources. For this site, an appropriate baseline would be:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://donorbox.org;
  frame-src https://donorbox.org;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://donorbox.org;
">
```

**2. Missing `X-Frame-Options` / Clickjacking Protection**

There is no `X-Frame-Options` or `frame-ancestors` CSP directive. This means the entire site could be embedded inside a hostile iframe on an attacker-controlled domain. A clickjacking attack could overlay invisible buttons over the Donate button, causing visitors to unknowingly interact with a fraudulent page while appearing to use the real one. This is a particularly meaningful risk for a donation-collecting foundation site.

*Recommended fix:* Add to `index.html`:
```html
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
```
And include `frame-ancestors 'self'` in the CSP.

**3. Dynamic Script Injection in DonatePopup**

In `src/components/layout/DonatePopup.tsx`, the Donorbox widget script is dynamically appended to `document.head` at runtime:
```typescript
const script = document.createElement("script");
script.src = "https://donorbox.org/widgets.js";
document.head.appendChild(script);
```
Dynamic script injection bypasses Subresource Integrity (SRI) checks. If Donorbox's CDN were ever compromised (a real-world attack vector — this has happened to other payment widget providers), the malicious script would execute with full page access.

*Recommended fix:* Load the Donorbox script as a static `<script>` tag in `index.html` with an `integrity` attribute (SRI hash). This ensures the browser refuses to execute the script if its content has been tampered with:
```html
<script
  src="https://donorbox.org/widgets.js"
  integrity="sha384-[HASH]"
  crossorigin="anonymous"
  defer
></script>
```

---

### SEVERITY: LOW

**4. Donorbox Payment Iframe — Missing `sandbox` Attribute**

The donation iframe in `DonatePopup.tsx` is loaded without a `sandbox` attribute:
```html
<iframe src="https://donorbox.org/embed/..." allow="payment" />
```
Without `sandbox`, the iframe has access to the parent page's origin context including cookies, JavaScript parent references, and form submission to the parent. For a payment context, this is appropriate IF Donorbox is fully trusted — but defense-in-depth recommends explicit permission grants.

*Recommended fix:* Add `sandbox="allow-scripts allow-forms allow-same-origin allow-popups"` and keep `allow="payment"`. This is the minimum set Donorbox requires to function.

**5. Database: RLS Write Policies Are Implicit, Not Explicit**

The `discord_events` table has RLS enabled with only a public SELECT policy. INSERT, UPDATE, and DELETE are blocked by default (because RLS is enabled and no permissive policy exists for them). This is *currently safe*, but relies on the implicit behavior of Supabase RLS — if a developer accidentally adds a permissive INSERT policy in the future, it would immediately open the event table to public writes.

*Recommended fix:* Add explicit DENY-style policies (or explicit admin-only policies) to document intent:
```sql
-- Explicitly block all writes from public/anon
CREATE POLICY "No public writes to discord_events"
ON public.discord_events
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
```

**6. Google Fonts Loaded from External CDN (Privacy & Availability Risk)**

`src/index.css` imports fonts directly from `https://fonts.googleapis.com`. This means:
- Every visitor's IP address is sent to Google (a GDPR/privacy consideration for EU visitors)
- If Google Fonts CDN has an outage, the site's typography degrades
- It is an external dependency that cannot have SRI applied

*Recommended fix:* Self-host the two fonts (`Playfair Display`, `DM Sans`) using `@fontsource` packages. This eliminates the external call, improves load performance, and removes the Google tracking vector:
```bash
bun add @fontsource/playfair-display @fontsource/dm-sans
```

**7. No `Referrer-Policy` Header**

All external links (GitHub, Discord, LinkedIn, Donorbox, Google Calendar) will pass the full `Referer` header including path information to those third parties by default. For a public site this is low risk, but for the donation flow specifically, the referrer can reveal that the user was viewing a donation page.

*Recommended fix:* Add to `index.html`:
```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```

**8. `robots.txt` Allows Full Crawling Including Agent Documentation**

`robots.txt` currently allows all crawlers unrestricted access (`Allow: /`). The agent-facing markdown files (`/llms.md`, `/llms-full.md`, `/agent-discovery.md`) are intentionally public — this is by design. However, there is no `Sitemap:` directive, which is a minor SEO and discoverability gap. (This is informational, not a security risk.)

---

### SEVERITY: INFORMATIONAL

**9. Discord Invite Links in Public Database**

The `discord_events` table's `discord_link` column is publicly readable and contains permanent Discord invite links. These can be scraped by bots for automated join spam. Discord's invite system mitigates some of this (rate limits, verification), but rotating invite links periodically reduces the exposure window.

**10. HTML Comment Block in `index.html` Contains Operational Details**

The large HTML comment block in `<body>` is intentional and serves a legitimate purpose (agent discovery). It does not expose credentials or secrets. This is noted as informational — it is a deliberate design choice, not a vulnerability.

**11. No `permissions-policy` Header**

The site has no `Permissions-Policy` header to restrict browser feature access (camera, microphone, geolocation, payment). For a site with a payment iframe, disabling features the site does not use is good defense-in-depth.

*Recommended fix:*
```html
<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=(self 'https://donorbox.org')">
```

---

## What is Done Well

- **RLS is enabled** on the only database table (`discord_events`) — the Supabase linter returned zero issues
- **All external links use `rel="noopener noreferrer"`** throughout the codebase — this prevents the `window.opener` exploit and stops the linked page from reading the referrer
- **No user authentication exists** — the site correctly avoids the complexity and attack surface of auth for a public read-only site
- **No sensitive data is stored** in the database (no emails, no user PII, no payment data)
- **No API keys are exposed** in client-side code
- **CI/CD pipeline** uses GitHub's official actions with pinned major versions
- **The `supabase` anon key** is correctly scoped as a publishable key — it cannot escalate privileges
- **Payment processing is fully delegated** to Donorbox (PCI DSS compliant) — the site never handles card data directly
- **Google Calendar links** use `encodeURIComponent` correctly, preventing URL injection
- **No `dangerouslySetInnerHTML`** usage found anywhere in the codebase

---

## Priority Remediation Plan

```text
Priority | Finding                                      | Effort
---------|----------------------------------------------|--------
HIGH     | Add Content Security Policy header           | Small
HIGH     | Add X-Frame-Options / clickjacking guard     | Trivial
MEDIUM   | Static Donorbox script with SRI              | Small
MEDIUM   | Add sandbox attribute to Donorbox iframe     | Trivial
LOW      | Self-host Google Fonts                       | Small
LOW      | Add Referrer-Policy meta tag                 | Trivial
LOW      | Add Permissions-Policy meta tag              | Trivial
LOW      | Explicit RLS deny policies on discord_events | Small
INFO     | Add Sitemap to robots.txt                    | Trivial
```

The highest-impact fixes (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) can all be implemented as `<meta>` tag additions to `index.html` — a single file change that covers the majority of the browser-layer hardening with minimal risk of breaking anything.

The Donorbox iframe sandbox and the static script loading require minor testing to confirm they do not interfere with the payment flow.

Self-hosting fonts is the most effort but has a secondary benefit of improved page load performance and GDPR compliance.

Shall I implement all of these fixes now?
