/**
 * InteropBadges — Shows which web standards this UOR object is interoperable with.
 * Makes the "complete interoperability" promise visible and verifiable.
 */

import React from "react";

interface InteropBadgesProps {
  /** Object type (e.g. "WebPage", "KnowledgeCard") */
  objectType?: string;
  /** Whether a Wikidata QID is present */
  hasWikidata?: boolean;
  /** Whether the object has been IPFS-inscribed */
  hasIpfs?: boolean;
}

const STANDARDS = [
  { key: "ipfs",     label: "IPFS (CID)",    url: "https://docs.ipfs.tech/concepts/content-addressing/", always: true },
  { key: "jsonld",   label: "JSON-LD 1.1",   url: "https://www.w3.org/TR/json-ld11/",                   always: true },
  { key: "urdna",    label: "URDNA2015",      url: "https://www.w3.org/TR/rdf-canon/",                   always: true },
  { key: "provo",    label: "PROV-O",         url: "https://www.w3.org/TR/prov-o/",                      always: true },
  { key: "skos",     label: "SKOS",           url: "https://www.w3.org/TR/skos-reference/",              always: true },
  { key: "wikidata", label: "Wikidata",       url: "https://www.wikidata.org/",                          always: false },
];

const InteropBadges: React.FC<InteropBadgesProps> = ({ objectType, hasWikidata, hasIpfs }) => {
  const activeBadges = STANDARDS.filter(s => {
    if (s.key === "wikidata") return hasWikidata;
    return s.always;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}
        className="text-muted-foreground/40"
      >
        Interoperable With
      </span>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {activeBadges.map((std) => (
          <a
            key={std.key}
            href={std.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 9,
              fontFamily: "ui-monospace, monospace",
              padding: "2px 7px",
              borderRadius: 4,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            className="bg-primary/8 text-primary/50 hover:text-primary/80 hover:bg-primary/12 border border-primary/10"
          >
            {std.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default InteropBadges;
