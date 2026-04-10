/**
 * ShadowHtmlRenderer — Renders raw HTML inside a Shadow DOM container
 * for complete CSS isolation from the app's Tailwind styles.
 *
 * Sanitizes scripts and event handlers for security while preserving
 * the original page's styles, layout, images, and visual structure.
 */

import React, { useRef, useEffect, useState } from "react";

interface ShadowHtmlRendererProps {
  html: string;
  baseUrl?: string;
  maxHeight?: number;
}

/** Strip <script> tags, on* event attributes, and javascript: URLs */
function sanitizeHtml(html: string): string {
  // Remove all <script>...</script> blocks (including multiline)
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove inline event handlers (on*)
  clean = clean.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  // Remove javascript: URLs in href/src/action
  clean = clean.replace(/(href|src|action)\s*=\s*["']?\s*javascript:[^"'>]*/gi, '$1=""');
  return clean;
}

/** Extract origin from a URL for use as <base> */
function getBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    // Use up to the last path segment to resolve relative URLs correctly
    const pathParts = u.pathname.split("/");
    pathParts.pop(); // remove last segment (the page itself)
    return `${u.origin}${pathParts.join("/")}/`;
  } catch {
    return url;
  }
}

const ShadowHtmlRenderer: React.FC<ShadowHtmlRendererProps> = ({
  html,
  baseUrl,
  maxHeight = 600,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(maxHeight);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Attach shadow root only once
    if (!shadowRef.current) {
      shadowRef.current = el.attachShadow({ mode: "open" });
    }

    const shadow = shadowRef.current;
    const sanitized = sanitizeHtml(html);

    // Build the base tag for resolving relative URLs
    const base = baseUrl ? `<base href="${getBaseUrl(baseUrl)}" target="_blank">` : "";

    // Inject a wrapper style to constrain the content and add basic resets
    const wrapperStyle = `
      <style>
        :host {
          display: block;
          overflow-y: auto;
          overflow-x: hidden;
          max-height: ${maxHeight}px;
          border-radius: 8px;
        }
        /* Ensure images and media don't overflow */
        img, video, iframe, embed, object {
          max-width: 100% !important;
          height: auto !important;
        }
        /* Make tables responsive */
        table {
          max-width: 100% !important;
          overflow-x: auto;
          display: block;
        }
      </style>
    `;

    shadow.innerHTML = base + wrapperStyle + sanitized;

    // Measure actual content height for smooth display
    requestAnimationFrame(() => {
      const wrapper = shadow.firstElementChild;
      if (wrapper) {
        const h = shadow.host.scrollHeight;
        setContentHeight(Math.min(h, maxHeight));
      }
    });
  }, [html, baseUrl, maxHeight]);

  return (
    <div
      style={{
        border: "1px solid hsl(var(--border) / 0.2)",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff", // Most web pages assume white background
        maxHeight,
      }}
    >
      <div ref={containerRef} />
    </div>
  );
};

export default ShadowHtmlRenderer;
