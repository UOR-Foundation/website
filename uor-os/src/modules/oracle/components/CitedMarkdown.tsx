/**
 * CitedMarkdown — ReactMarkdown wrapper that replaces [N] markers with
 * InlineCitation components inside paragraph text.
 */

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import InlineCitation from "./InlineCitation";
import { splitByCitations, normalizeSource } from "../lib/citation-parser";
import type { SourceMeta } from "../lib/citation-parser";

interface CitedMarkdownProps {
  markdown: string;
  sources: SourceMeta[];
  /** Base ReactMarkdown components (lens-specific styling) */
  components?: Record<string, React.ComponentType<any>>;
}

/**
 * Wraps children of a React element to replace [N] citation markers
 * with InlineCitation components.
 */
function citifyChildren(
  children: React.ReactNode,
  sources: SourceMeta[]
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const segments = splitByCitations(child);
    if (segments.length === 1 && typeof segments[0] === "string") return child;

    return segments.map((seg, i) => {
      if (typeof seg === "string") return <React.Fragment key={i}>{seg}</React.Fragment>;
      const src = sources[seg.cite - 1];
      if (!src) return <React.Fragment key={i}>[{seg.cite}]</React.Fragment>;
      return <InlineCitation key={i} index={seg.cite} source={src} />;
    });
  });
}

/** Wrap a component to inject citation parsing into its children */
function withCitations<P extends { children?: React.ReactNode }>(
  Component: React.ComponentType<P> | string,
  sources: SourceMeta[]
): React.ComponentType<P> {
  return function CitedComponent(props: P) {
    const newChildren = citifyChildren(props.children, sources);
    return <Component {...props}>{newChildren}</Component>;
  } as unknown as React.ComponentType<P>;
}

const CitedMarkdown: React.FC<CitedMarkdownProps> = ({
  markdown,
  sources,
  components: baseComponents = {},
}) => {
  const citedComponents = useMemo(() => {
    if (!sources.length) return baseComponents;

    const wrap = (key: string) => {
      const Base = baseComponents[key] || key;
      return withCitations(Base, sources);
    };

    return {
      ...baseComponents,
      p: wrap("p"),
      li: wrap("li"),
      td: wrap("td"),
      blockquote: wrap("blockquote"),
    };
  }, [baseComponents, sources]);

  return <ReactMarkdown components={citedComponents}>{markdown}</ReactMarkdown>;
};

export default CitedMarkdown;
