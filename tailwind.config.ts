import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "section-dark": {
          DEFAULT: "hsl(var(--section-dark))",
          foreground: "hsl(var(--section-dark-foreground))",
        },
        pill: {
          DEFAULT: "hsl(var(--pill-border))",
        },
        rule: "hsl(var(--rule))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* Hologram palette as Tailwind utilities */
        hologram: {
          bg: "hsl(var(--hologram-bg))",
          surface: "hsl(var(--hologram-surface))",
          text: "hsl(var(--hologram-text))",
          "text-muted": "hsl(var(--hologram-text-muted))",
          gold: "hsl(var(--hologram-gold))",
          purple: "hsl(var(--hologram-purple-warm))",
        },
      },
      /* Hologram proportional font sizes */
      fontSize: {
        "holo-xs": "var(--holo-text-xs)",
        "holo-sm": "var(--holo-text-sm)",
        "holo-base": "var(--holo-text-base)",
        "holo-lg": "var(--holo-text-lg)",
        "holo-xl": "var(--holo-text-xl)",
        "holo-2xl": "var(--holo-text-2xl)",
        "holo-display": "var(--holo-text-display)",
      },
      /* Hologram proportional spacing */
      spacing: {
        "holo-1": "var(--holo-space-1)",
        "holo-2": "var(--holo-space-2)",
        "holo-3": "var(--holo-space-3)",
        "holo-4": "var(--holo-space-4)",
        "holo-5": "var(--holo-space-5)",
        "holo-6": "var(--holo-space-6)",
        "holo-8": "var(--holo-space-8)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
