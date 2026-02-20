
# Security Audit — Session 2: UOR Foundation Website
## Reference Frameworks Applied
- NIST SP 800-53 Rev 5 (SI-10 Input Validation, SC-8 Transmission Integrity, AC-17 Remote Access, SA-15 Supply Chain Risk)
- OWASP Top 10 2021 (A03 Injection, A05 Security Misconfiguration, A06 Vulnerable Components, A08 Software and Data Integrity Failures)
- CIS Controls v8 (Control 4 Secure Configuration, Control 16 Application Software Security)

---

## What Has Been Hardened Since Session 1

The following items were confirmed fully remediated — these are closed findings:

- Content Security Policy meta tag: present and structurally correct
- X-Frame-Options SAMEORIGIN: present
- Referrer-Policy strict-origin-when-cross-origin: present
- Permissions-Policy: present, correctly scoped to payment=donorbox.org
- Google Fonts removed from CDN; fully self-hosted via @fontsource
- Donorbox dynamic script injection removed; replaced with static script tag in index.html
- Donorbox iframe sandbox attribute present with minimum required permissions
- RLS enabled on discord_events with explicit anonymous-write DENY policy
- All external links use rel="noopener noreferrer"
- No dangerouslySetInnerHTML on user-controlled content anywhere in the application
- No API keys exposed in client-side code (Supabase anon key is correctly publishable)
- CI/CD pipeline uses major-version-pinned GitHub Actions

---

## New and Remaining Findings

### SEVERITY: HIGH

**Finding 1 — Hardcoded Secret Token in Client-Side Source Code**

Location: `src/pages/Projects.tsx`, line 177

```typescript
token: "uor-f0undati0n-s3cure-t0ken-2024x",
```

This token is embedded in production JavaScript that is served to every browser. It is fully visible in the browser's developer tools, in the built `dist/` bundle, and in the public GitHub repository. Anyone who inspects the page source can extract it in under 10 seconds and submit unlimited fake project submissions directly to the Google Apps Script endpoint, completely bypassing the UI form.

**NIST reference:** SA-15(9) — Use of Live Data in Test and Development Environments; SI-10 — Information Input Validation.

**Risk:** Automated spam submissions to the Google Sheets backend. An attacker can write a loop that floods the sheet with thousands of fake project entries, overwhelming the technical committee review queue and poisoning the dataset.

**Recommended fix (two-part):**

Part A — the token itself is not a secret because it is already public. The correct fix is to move the validation gate server-side. Deploy a backend function that is the only endpoint accepting form submissions. That function validates the submission fields (length, format, content), applies rate-limiting per IP, and only then forwards to Google Sheets. The client never holds a token.

Part B — As an immediate, low-effort hardening step while the above is built: add a honeypot field (a hidden input that bots fill in but humans do not) and a rate-limit on the submit button (disabled for 10 seconds after each submission). This raises the cost of spam without requiring a backend change.

---

**Finding 2 — The Donorbox Static Script Lacks Subresource Integrity (SRI)**

Location: `index.html`, line 50

```html
<script src="https://donorbox.org/widgets.js" paypalExpress="false" defer></script>
```

The Session 1 audit correctly identified the risk and moved the script to a static tag. However, the `integrity` attribute was never added. The comment in the code says "loaded as static script for Subresource Integrity eligibility" — but SRI was not actually applied. This means the browser will still execute any version of this file served by Donorbox's CDN, including a compromised one. The structural fix (static tag) is in place but the protective mechanism (SRI hash) is missing.

**NIST reference:** SA-15(11) — Developer Testing and Evaluation; SC-28 — Protection of Information at Rest/Transit.

**Risk:** If Donorbox's CDN is compromised (this class of attack has occurred with payment widget providers), the malicious script executes with full page access including the ability to intercept the donation iframe context and exfiltrate visitor information.

**Recommended fix:** Fetch the current hash of `https://donorbox.org/widgets.js` and add the `integrity` and `crossorigin` attributes:

```html
<script
  src="https://donorbox.org/widgets.js"
  integrity="sha384-[COMPUTED_HASH]"
  crossorigin="anonymous"
  paypalExpress="false"
  defer
></script>
```

The hash is computed with: `curl -s https://donorbox.org/widgets.js | openssl dgst -sha384 -binary | openssl base64 -A`

**Important caveat:** If Donorbox updates their script frequently (as many widget providers do), the SRI hash will break the widget on every update. The practical recommendation is to compute the hash, add it, monitor for breakage, and establish a process for re-hashing on updates. Alternatively, use a Content Security Policy `require-sri-for script` directive to enforce SRI across all scripts (this requires the JSON-LD script in index.html to also be hashed or inlined — feasible since it is fully static content).

---

### SEVERITY: MEDIUM

**Finding 3 — `unsafe-inline` in the Content Security Policy script-src Directive**

Location: `index.html`, line 47

```
script-src 'self' 'unsafe-inline' https://donorbox.org;
```

`'unsafe-inline'` in `script-src` permits any inline `<script>` block to execute on the page. This negates a significant portion of XSS protection that CSP is designed to provide. If an attacker can inject an inline script tag (e.g. via a future React state manipulation, a compromised component, or a dependency), the browser will execute it without restriction.

**Why it is currently present:** The SPA redirect script at the top of `index.html` (the GitHub Pages `spa-github-pages` redirect) is an inline `<script>` block. This is the only reason `unsafe-inline` is needed.

**NIST reference:** SI-10 — Information Input Validation; SC-18 — Mobile Code.

**Risk:** `unsafe-inline` is the flag that makes CSP substantially less effective against XSS. The browser cannot distinguish between a legitimate inline script and an attacker-injected one.

**Recommended fix:** Replace `'unsafe-inline'` with a `nonce` or `hash` approach:

- Compute the SHA-256 hash of the exact inline script content
- Add `'sha256-[HASH]'` to the CSP `script-src` instead of `'unsafe-inline'`
- The browser will only execute inline scripts whose content matches the declared hash

For the SPA redirect script specifically, since it is static content that never changes, this is a one-time operation:

```
script-src 'self' 'sha256-[HASH_OF_SPA_SCRIPT]' https://donorbox.org;
```

The hash for the current SPA redirect script and the JSON-LD structured data block should both be computed and declared. This eliminates `unsafe-inline` entirely.

---

**Finding 4 — `unsafe-inline` in the Content Security Policy style-src Directive**

Location: `index.html`, line 47

```
style-src 'self' 'unsafe-inline';
```

Similar to Finding 3 but for CSS. `'unsafe-inline'` in `style-src` permits any inline `style` attribute or `<style>` block to execute. This enables CSS injection attacks where an attacker who can influence rendered HTML (e.g. via a future markdown rendering feature, a 3rd-party component, or a compromised library) can use CSS selectors to exfiltrate data or manipulate the visual presentation of the donation flow to mislead users.

**NIST reference:** SC-18 — Mobile Code.

**Risk:** CSS injection can be used to: exfiltrate form field contents character by character using CSS attribute selectors (a documented attack), create overlays that trick users into clicking wrong elements (a CSS-only clickjacking variant), and modify the visual appearance of the payment flow.

**Recommended fix:** Tailwind CSS generates all its classes at build time and inserts them as a `<style>` block in the compiled bundle. This means `'unsafe-inline'` in `style-src` is currently required for Tailwind to function in production. The correct long-term fix is to configure Tailwind's CSS output as an external stylesheet (`/assets/index.css`) rather than an injected style block, which it already does in the Vite build. In that case, `'unsafe-inline'` in `style-src` should be removable and should be tested for removal. The `chart.tsx` component's `dangerouslySetInnerHTML` on a `<style>` element (Finding 5 below) is the other source.

---

**Finding 5 — `dangerouslySetInnerHTML` on a `<style>` Element in chart.tsx**

Location: `src/components/ui/chart.tsx`, lines 69-86

```tsx
<style
  dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES)
      .map(([theme, prefix]) => `${prefix} [data-chart=${id}] { ... }`)
      .join("\n"),
  }}
/>
```

While this is a shadcn/ui library component (not application code), it constructs CSS from values that flow from component props: `id` and `config`. The `id` comes from `ChartContainer`, which accepts it as a prop from the page. If `id` or `config` colors were ever sourced from user-supplied data (e.g. a future user-configurable dashboard or a database-driven chart), this would become a CSS injection vector.

**NIST reference:** SI-10 — Information Input Validation.

**Current risk level:** LOW, because the `id` and chart `config` values are currently hardcoded in the application. The risk is potential, not current.

**Recommended fix:** This component is from the shadcn/ui library and should not be modified. The mitigation is a policy-level control: document that the `id` and `config` props of `<ChartContainer>` must never be sourced from user-supplied or database-sourced values without sanitisation. If charts with dynamic data are added in future, this finding should be re-evaluated and the `id` should be validated as an alphanumeric-only string before being inserted.

---

**Finding 6 — Form Submission via Image Beacon Bypasses All Input Validation**

Location: `src/pages/Projects.tsx`, lines 185-191

```typescript
const img = new Image();
img.onload = img.onerror = () => { ... };
img.src = `${SCRIPT_URL}?${params.toString()}`;
```

The project submission form sends all field data as URL query parameters via an image beacon (`new Image()` with a `src` set to the Google Apps Script URL). This technique was chosen to bypass CORS, which it does — but it also bypasses:

1. The ability to validate the response (both `onload` and `onerror` trigger success regardless of what the server actually did)
2. Any rate-limiting at the network layer (the request looks like an image load to proxies and network monitors)
3. Any future attempt to add CSRF protection (there is no request body, no headers, no session binding)

The form has basic HTML5 client-side validation (`required`, `type="url"`, `type="email"`) but no length limits, no sanitization of special characters, and no server-side validation. All five fields are submitted verbatim to Google Sheets.

**NIST reference:** SI-10 — Information Input Validation; AC-17 — Remote Access.

**Recommended fix:** Replace the image beacon with a backend function that:
- Accepts a POST request with a JSON body
- Validates all fields server-side (length limits, email format, URL format, content sanity checks)
- Applies rate-limiting per IP or per email address
- Returns a proper success/error response that the client can distinguish
- Forwards to Google Sheets only after validation passes

This also makes the hardcoded token (Finding 1) unnecessary since the backend function is the authentication boundary.

---

**Finding 7 — Google Apps Script URL Is a Permanent, Public, Unauthenticated Endpoint**

Location: `src/pages/Projects.tsx`, line 169

```typescript
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCwcvyZpCeGEnRyFiFiqoYvqx2VVenGORZRz9YbGoJ8LAN17Eafd63q1nUG_gx5TwpMg/exec";
```

The Google Apps Script Web App URL is fully public and permanently embedded in the client bundle. This URL accepts GET requests with any parameters and writes them to a Google Sheet. There is no rate-limiting at this layer, no field validation, and the only authentication is the client-side token (which is also public — see Finding 1). The URL cannot be rotated without a code deployment.

**NIST reference:** AC-17 — Remote Access; SI-10 — Information Input Validation.

**Risk:** Anyone can submit arbitrary data to your Google Sheet directly via curl, browser address bar, or a script. The token provides no meaningful protection since it is visible in the page source. The endpoint will accept and log anything until the script is manually disabled or the sheet is full.

**Recommended fix:** The Google Apps Script endpoint is the correct architecture for a simple nonprofit form with no backend infrastructure. The security improvement is to add server-side validation inside the script itself: check that `token` matches a value stored in the script's own Properties (not visible in client code), that all required fields are present and within length limits, and that the same email or IP has not submitted within the last 24 hours. This keeps the simplicity of the current approach while adding a meaningful server-side validation layer.

---

### SEVERITY: LOW

**Finding 8 — public/404.html Contains an Inline Script with No CSP**

Location: `public/404.html`, lines 6-18

The `404.html` file is served by GitHub Pages for any URL that does not match a file. It contains an inline JavaScript redirect script. This file is completely outside the React application and has no `Content-Security-Policy` meta tag. It is a separate HTML document with its own security surface.

**Risk:** If an attacker can find a path to influence content served at a 404 URL (unlikely on a static host, but theoretically possible via a compromised build artifact or a GitHub Pages configuration error), the 404 page has no browser-level script restrictions.

**Recommended fix:** Add the same security meta tags to `public/404.html` as are present in `index.html`: at minimum, CSP, X-Frame-Options, and Referrer-Policy.

---

**Finding 9 — The uor-verify Edge Function Has No Rate-Limiting**

Location: `supabase/functions/uor-verify/index.ts`

The edge function is stateless, publicly accessible, requires no authentication, and has no rate-limiting. Both endpoints (`?x=` and `?content=`) accept unlimited requests per second. This is by design for a public verification endpoint, but it creates a surface for:

- Denial-of-service against the Supabase edge function quota (Supabase free tier has a limit on edge function invocations)
- Content scraping: anyone can extract the full braille address encoding of arbitrary strings by cycling through content values

**NIST reference:** SC-5 — Denial-of-Service Protection.

**Recommended fix:** Add a `content` parameter length limit (currently unlimited — a 10MB string would be accepted and processed). At minimum, add this guard:

```typescript
if (contentParam.length > 1000) {
  return new Response(
    JSON.stringify({ error: 'content must be 1000 characters or fewer' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

For rate-limiting beyond this, Supabase Edge Functions do not natively support per-IP rate limiting. A lightweight approach is to add a `Retry-After` header on repeated requests from the same IP — but this requires state. The pragmatic recommendation for a public verification endpoint of this kind is to set a conservative payload size cap and accept the quota risk as acceptable given the nonprofit's use case.

---

**Finding 10 — No `sitemap.xml` File Despite robots.txt Declaring One**

Location: `public/robots.txt`, line 6

```
Sitemap: https://uor.foundation/sitemap.xml
```

The `robots.txt` file references a sitemap that does not exist. A request to `https://uor.foundation/sitemap.xml` returns a 404. This is a low-severity informational finding, but:

1. It is a broken reference in a machine-readable file (minor integrity issue)
2. Search engine crawlers will log the 404 and may deprioritise the site's crawl budget
3. Agent crawlers that parse robots.txt and follow Sitemap directives will encounter a dead link in the discovery chain

**Recommended fix:** Create `public/sitemap.xml` listing all 10 routes defined in `src/App.tsx`. This is a one-time 30-line XML file with no dynamic content required.

---

**Finding 11 — LinkedIn Profile URL Pattern Carries Path-Level Referrer Risk**

Location: Multiple files (Navbar.tsx, CTASection.tsx, Footer.tsx)

```html
<a href="https://www.linkedin.com/company/uor-foundation" target="_blank" rel="noopener noreferrer">
```

LinkedIn URLs are opened with `target="_blank"`. Despite `rel="noopener noreferrer"`, LinkedIn's own tracking parameters mean that when a visitor navigates from a donation page to LinkedIn, LinkedIn's referrer logging captures the originating page URL. This is acceptable for most pages but marginally notable for the `/donate` page context.

**NIST reference:** AC-17 — Remote Access.

**Status:** `rel="noopener noreferrer"` is correctly applied everywhere. The Referrer-Policy meta tag (`strict-origin-when-cross-origin`) mitigates this at the browser level — only the origin (`https://uor.foundation`) is sent, not the full path. This finding is therefore already mitigated by existing controls. It is recorded for completeness and closed.

---

## Consolidated Finding Table

```text
ID  | Severity | Title                                             | Effort | Status
----|----------|---------------------------------------------------|--------|--------
F1  | HIGH     | Hardcoded token in client-side code               | Medium | OPEN
F2  | HIGH     | Donorbox script missing SRI integrity hash        | Small  | OPEN
F3  | MEDIUM   | unsafe-inline in CSP script-src                  | Small  | OPEN
F4  | MEDIUM   | unsafe-inline in CSP style-src                   | Medium | OPEN
F5  | MEDIUM   | dangerouslySetInnerHTML in chart.tsx (library)   | Policy | OPEN (policy)
F6  | MEDIUM   | Image beacon bypasses response validation         | Medium | OPEN
F7  | MEDIUM   | Google Apps Script URL public, unauthenticated   | Medium | OPEN
F8  | LOW      | 404.html has no security headers                 | Trivial| OPEN
F9  | LOW      | uor-verify edge function has no payload size cap | Trivial| OPEN
F10 | LOW      | sitemap.xml missing despite robots.txt reference | Trivial| OPEN
F11 | INFO     | LinkedIn referrer — already mitigated            | None   | CLOSED
```

---

## Implementation Priority

**Implement immediately (no architectural change required):**

- F2 — Add SRI hash to Donorbox script tag (one attribute, ~15 min)
- F8 — Add security meta tags to 404.html (copy/paste from index.html, 5 min)
- F9 — Add content parameter length cap to edge function (3 lines, 5 min)
- F10 — Create sitemap.xml with all 10 routes (30 min)
- F3 — Replace unsafe-inline in script-src with inline script SHA-256 hashes (30 min)

**Implement next (requires backend planning):**

- F1 + F6 + F7 — These three findings are all facets of the same root problem: the form submission architecture uses a public client-side token and an image beacon to write to a public Google Apps Script endpoint. The fix is to migrate the form to a proper backend function (edge function) that validates input server-side, applies rate-limiting, and forwards to Google Sheets — removing the need for a client-side token entirely.

**Document as policy (no code change):**

- F4 — Until Tailwind's generated CSS can be confirmed as external-only (no injected style blocks), unsafe-inline in style-src is unavoidable. Test whether removing it breaks production rendering; if not, remove it. Document the result.
- F5 — Document that ChartContainer id and config must not accept user-supplied values without sanitisation.

---

## What Remains Fully Hardened

- Database RLS: clean, linter confirmed zero issues. Explicit deny policy for anon writes in place.
- All external links: rel="noopener noreferrer" present throughout.
- Fonts: fully self-hosted, no CDN calls.
- Donorbox iframe: sandbox attribute with minimum required permissions present.
- Payment processing: delegated entirely to Donorbox (PCI DSS scope excluded).
- No user authentication, no session management, no PII stored — minimal attack surface.
- CI/CD: major-version-pinned Actions, no secrets in workflow files.
- Supabase anon key: correctly publishable, properly scoped.
