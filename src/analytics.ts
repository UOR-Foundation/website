declare global {
  interface Window { dataLayer: unknown[]; }
}

// Google Analytics visitor tracking. The measurement ID is public by design.
// The measurement ID is public by design; the env var feeds it on Lovable, the fallback
// keeps analytics live on builds without project env, such as GitHub Actions.
const id = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined) ?? "G-T76JNQ5YB6";

if (id && typeof window !== "undefined") {
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  function gtag(..._args: unknown[]) { window.dataLayer.push(arguments); }
  gtag("set", "developer_id.dZjgwMW", true);
  gtag("js", new Date());
  gtag("config", id);
}

export {};
