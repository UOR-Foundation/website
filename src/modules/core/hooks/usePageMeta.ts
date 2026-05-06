import { useEffect } from "react";

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageAlt?: string;
  type?: "article" | "website";
  twitterCard?: "summary" | "summary_large_image";
}

/**
 * Imperatively set OpenGraph / Twitter Card meta tags for a page.
 * Restores previous values on unmount so navigation between pages is clean.
 */
export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = meta.title;

    const tags: Array<{ selector: string; attr: "name" | "property"; key: string; value: string }> = [
      { selector: 'meta[name="description"]', attr: "name", key: "description", value: meta.description },
      { selector: 'meta[property="og:title"]', attr: "property", key: "og:title", value: meta.title },
      { selector: 'meta[property="og:description"]', attr: "property", key: "og:description", value: meta.description },
      { selector: 'meta[property="og:url"]', attr: "property", key: "og:url", value: meta.url },
      { selector: 'meta[property="og:type"]', attr: "property", key: "og:type", value: meta.type ?? "article" },
      { selector: 'meta[name="twitter:card"]', attr: "name", key: "twitter:card", value: meta.twitterCard ?? "summary_large_image" },
      { selector: 'meta[name="twitter:title"]', attr: "name", key: "twitter:title", value: meta.title },
      { selector: 'meta[name="twitter:description"]', attr: "name", key: "twitter:description", value: meta.description },
    ];

    if (meta.image) {
      tags.push(
        { selector: 'meta[property="og:image"]', attr: "property", key: "og:image", value: meta.image },
        { selector: 'meta[name="twitter:image"]', attr: "name", key: "twitter:image", value: meta.image },
      );
      if (meta.imageAlt) {
        tags.push(
          { selector: 'meta[property="og:image:alt"]', attr: "property", key: "og:image:alt", value: meta.imageAlt },
          { selector: 'meta[name="twitter:image:alt"]', attr: "name", key: "twitter:image:alt", value: meta.imageAlt },
        );
      }
    }

    // Canonical link
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonical?.href ?? null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = meta.url;

    const previous: Array<{ el: HTMLMetaElement; previous: string | null; created: boolean }> = [];
    for (const t of tags) {
      let el = document.querySelector<HTMLMetaElement>(t.selector);
      const created = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(t.attr, t.key);
        document.head.appendChild(el);
      }
      previous.push({ el, previous: el.getAttribute("content"), created });
      el.setAttribute("content", t.value);
    }

    return () => {
      document.title = previousTitle;
      for (const p of previous) {
        if (p.created) p.el.remove();
        else if (p.previous !== null) p.el.setAttribute("content", p.previous);
      }
      if (canonical) {
        if (previousCanonical === null) canonical.remove();
        else canonical.href = previousCanonical;
      }
    };
  }, [meta.title, meta.description, meta.url, meta.image, meta.imageAlt, meta.type, meta.twitterCard]);
}