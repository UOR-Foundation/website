/**
 * SignalLeaders — Curated thought leaders per topic domain.
 *
 * In an attention-scarce world, following the right people is the
 * highest-leverage signal filter.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, Users } from "lucide-react";

interface Leader {
  name: string;
  role: string;
  why: string;
  link: string;
}

const DOMAIN_LEADERS: Record<string, Leader[]> = {
  physics: [
    { name: "Roger Penrose", role: "Mathematical Physicist", why: "Connects consciousness, geometry, and quantum mechanics", link: "https://en.wikipedia.org/wiki/Roger_Penrose" },
    { name: "Sabine Hossenfelder", role: "Theoretical Physicist", why: "Cuts through hype with rigorous skepticism", link: "https://www.youtube.com/@SabineHossenfelder" },
    { name: "Sean Carroll", role: "Cosmologist", why: "Makes quantum foundations and spacetime accessible", link: "https://www.preposterousuniverse.com" },
    { name: "Nima Arkani-Hamed", role: "Particle Theorist", why: "Pioneering new geometric principles in physics", link: "https://en.wikipedia.org/wiki/Nima_Arkani-Hamed" },
  ],
  cs: [
    { name: "Donald Knuth", role: "Computer Scientist", why: "The Art of Computer Programming — foundational rigor", link: "https://en.wikipedia.org/wiki/Donald_Knuth" },
    { name: "Andrej Karpathy", role: "AI Researcher", why: "Demystifies neural networks and LLMs with clarity", link: "https://karpathy.ai" },
    { name: "Leslie Lamport", role: "Distributed Systems", why: "Invented the foundations of distributed consensus", link: "https://en.wikipedia.org/wiki/Leslie_Lamport" },
    { name: "Timnit Gebru", role: "AI Ethics", why: "Essential voice on fairness and accountability in AI", link: "https://en.wikipedia.org/wiki/Timnit_Gebru" },
  ],
  philosophy: [
    { name: "Daniel Dennett", role: "Philosopher of Mind", why: "Rigorous materialist approach to consciousness", link: "https://en.wikipedia.org/wiki/Daniel_Dennett" },
    { name: "David Chalmers", role: "Philosophy of Mind", why: "Framed the hard problem of consciousness", link: "https://en.wikipedia.org/wiki/David_Chalmers" },
    { name: "Martha Nussbaum", role: "Political Philosopher", why: "Capabilities approach to human flourishing", link: "https://en.wikipedia.org/wiki/Martha_Nussbaum" },
    { name: "Peter Singer", role: "Ethicist", why: "Effective altruism and practical ethics pioneer", link: "https://en.wikipedia.org/wiki/Peter_Singer" },
  ],
  biology: [
    { name: "E.O. Wilson", role: "Biologist", why: "Unified sociobiology and biodiversity science", link: "https://en.wikipedia.org/wiki/E._O._Wilson" },
    { name: "Jennifer Doudna", role: "Biochemist", why: "Co-invented CRISPR gene editing", link: "https://en.wikipedia.org/wiki/Jennifer_Doudna" },
    { name: "Robert Sapolsky", role: "Neuroendocrinologist", why: "Masterful at connecting biology to behavior", link: "https://en.wikipedia.org/wiki/Robert_Sapolsky" },
    { name: "Suzanne Simard", role: "Forest Ecologist", why: "Discovered fungal networks connecting trees", link: "https://en.wikipedia.org/wiki/Suzanne_Simard" },
  ],
  math: [
    { name: "Terence Tao", role: "Mathematician", why: "Polymath — analytic number theory to compressed sensing", link: "https://en.wikipedia.org/wiki/Terence_Tao" },
    { name: "Maryam Mirzakhani", role: "Mathematician", why: "First woman to win the Fields Medal — hyperbolic geometry", link: "https://en.wikipedia.org/wiki/Maryam_Mirzakhani" },
    { name: "3Blue1Brown", role: "Math Educator", why: "Visual intuition for deep mathematical concepts", link: "https://www.3blue1brown.com" },
    { name: "Timothy Gowers", role: "Mathematician", why: "Combinatorics and accessible mathematical writing", link: "https://en.wikipedia.org/wiki/Timothy_Gowers" },
  ],
  history: [
    { name: "Yuval Noah Harari", role: "Historian", why: "Big-picture synthesis of human civilization", link: "https://en.wikipedia.org/wiki/Yuval_Noah_Harari" },
    { name: "Dan Carlin", role: "Podcaster/Historian", why: "Hardcore History — immersive deep dives", link: "https://www.dancarlin.com" },
    { name: "Mary Beard", role: "Classicist", why: "Makes ancient Rome vivid and relevant", link: "https://en.wikipedia.org/wiki/Mary_Beard_(classicist)" },
    { name: "Howard Zinn", role: "Historian", why: "History from the perspective of the marginalized", link: "https://en.wikipedia.org/wiki/Howard_Zinn" },
  ],
  art: [
    { name: "Ernst Gombrich", role: "Art Historian", why: "The Story of Art — essential visual literacy", link: "https://en.wikipedia.org/wiki/Ernst_Gombrich" },
    { name: "John Berger", role: "Art Critic", why: "Ways of Seeing — how images construct meaning", link: "https://en.wikipedia.org/wiki/John_Berger" },
    { name: "Neri Oxman", role: "Designer/Architect", why: "Bridges biology, computation, and material design", link: "https://en.wikipedia.org/wiki/Neri_Oxman" },
    { name: "Olafur Eliasson", role: "Artist", why: "Immersive installations on perception and nature", link: "https://en.wikipedia.org/wiki/Olafur_Eliasson" },
  ],
  economics: [
    { name: "Daron Acemoglu", role: "Economist", why: "Why Nations Fail — institutions and development", link: "https://en.wikipedia.org/wiki/Daron_Acemoglu" },
    { name: "Esther Duflo", role: "Economist", why: "Randomized experiments to fight global poverty", link: "https://en.wikipedia.org/wiki/Esther_Duflo" },
    { name: "Ray Dalio", role: "Investor", why: "Principles — systematic thinking about markets and life", link: "https://en.wikipedia.org/wiki/Ray_Dalio" },
    { name: "Mariana Mazzucato", role: "Economist", why: "The Entrepreneurial State — rethinking innovation", link: "https://en.wikipedia.org/wiki/Mariana_Mazzucato" },
  ],
};

interface SignalLeadersProps {
  domain: string;
}

const SignalLeaders: React.FC<SignalLeadersProps> = ({ domain }) => {
  const [expanded, setExpanded] = useState(false);
  const leaders = DOMAIN_LEADERS[domain];

  if (!leaders) return null;

  const domainLabel = domain.charAt(0).toUpperCase() + domain.slice(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <Users size={13} className="text-muted-foreground/40" />
        <span
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
          className="text-muted-foreground/50"
        >
          Signal Leaders in {domainLabel}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground/30"
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 10,
                padding: "8px 0",
              }}
            >
              {leaders.map((leader) => (
                <a
                  key={leader.name}
                  href={leader.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    border: "1px solid hsl(var(--border) / 0.12)",
                    transition: "all 0.2s",
                  }}
                  className="bg-muted/5 hover:bg-muted/15 group"
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span
                      style={{ fontSize: 13, fontWeight: 600 }}
                      className="text-foreground/80 group-hover:text-foreground transition-colors"
                    >
                      {leader.name}
                    </span>
                    <ExternalLink size={10} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors" />
                  </div>
                  <span
                    style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}
                    className="text-primary/50"
                  >
                    {leader.role}
                  </span>
                  <span
                    style={{ fontSize: 11, lineHeight: 1.4 }}
                    className="text-muted-foreground/60"
                  >
                    {leader.why}
                  </span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignalLeaders;
