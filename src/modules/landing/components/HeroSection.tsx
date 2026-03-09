import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { Heart } from "lucide-react";
import lobsterIcon from "@/assets/lobster-icon.png";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      {/* Golden ratio: top padding ~61.8% of bottom on mobile */}
      <div className="container pt-[7.5rem] md:pt-52 pb-8 md:pb-24 lg:pb-28">
        <div
          className="mt-4 md:mt-10 mb-10 md:mb-16 lg:mb-20 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <p
            className="text-[0.6875rem] md:text-base font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/60 mb-3 md:mb-5 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.2s" }}
          >
            open data standard.
          </p>
          <h1
            className="font-display text-[1.625rem] sm:text-[1.75rem] md:text-[3rem] lg:text-[3.75rem] font-bold leading-[1.12] tracking-tight text-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            {/* Mobile: golden-ratio line breaks — shorter first line, longer second */}
            <span className="block md:hidden">Your Universal</span>
            <span className="block md:hidden">Coordinate System</span>
            <span className="block md:hidden">for Information.</span>
            {/* Desktop */}
            <span className="hidden md:block">Your Universal Coordinate</span>
            <span className="hidden md:block">System for Information.</span>
          </h1>
          <p
            className="mt-5 md:mt-10 text-[0.9375rem] md:text-xl text-muted-foreground leading-[1.68] max-w-2xl mx-auto font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.45s" }}
          >
            The UOR Foundation is dedicated to developing universal data standard for the semantic web, open science, and frontier technologies.
          </p>
          <div
            className="mt-8 md:mt-14 flex flex-col sm:flex-row flex-wrap justify-center gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            <a href="#intro" className="btn-primary inline-flex items-center gap-2">
              <Heart size={16} className="fill-current text-red-400" />
              I'm a Human
            </a>
            <a
              href="/llms.md"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              <img src={lobsterIcon} alt="lobster" className="w-5 h-5 object-contain" />
              I'm an Agent
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
