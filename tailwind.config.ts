import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HRUNA brand palette (deep forest / moss / cream / rosy brown / midnight green),
        // site-wide as of this pass. Same 5 hexes the `scrapbook` namespace below already used for
        // the landing page — these are now also the core semantic tokens the rest of the app
        // (dashboards, forms, admin, auth, policy pages) reads via bg-surface/text-ink/bg-primary/
        // etc., so the whole site is visually one palette. Derived tonal shades (container/on-
        // container/dim/bright/etc.) follow the same lightness progression the old mauve/blush
        // tokens used — only the hues changed, not the structure.
        // Corrected from #F7F4D5 — that base has a wide R/G-vs-B gap (247,244,213), which reads as
        // a visible yellow cast, especially on mobile displays where the flat background fills
        // most of the viewport. #F8F6EE keeps the R/G-vs-B gap tight (248,246,238) so it reads as
        // neutral ivory rather than yellow, while still staying visibly creamy (not pure white).
        // The derived elevation shades below are chosen directly (not proportionally scaled from
        // the old base) specifically so the gap stays tight through the whole progression — scaling
        // the old yellow-leaning ratios down would have made the deeper shades MORE yellow, not less.
        surface: {
          DEFAULT: "#F8F6EE", // neutral ivory — primary page background
          bright: "#FBFAF5",
          lowest: "#ffffff",
          low: "#F2EFE4",
          container: "#ECE8DA",
          high: "#E6E1D0",
          highest: "#DFDAC5",
          dim: "#D8D2BC",
        },
        ink: {
          DEFAULT: "#0A3323", // deep forest — primary text/headings
          variant: "#3F5B4E",
        },
        outline: {
          DEFAULT: "#6E7B70",
          variant: "#D2D6C9",
        },
        primary: {
          // Deepened from the given #D3968C — the exact hex fails WCAG AA contrast (~2.4:1) as
          // text/links/icons, which this app uses `text-primary` for in ~80+ places app-wide
          // (every policy-page link, price displays, icon accents). This terracotta passes AA
          // (~5:1) as both text-on-white and text-on-cream, while staying visibly the same rosy-
          // brown family. The exact given hex is preserved below as `fixed` for large fills/
          // highlights that don't need to pass text contrast.
          DEFAULT: "#9C5347",
          container: "#F5E0DB",
          "on-container": "#7A4238",
          fixed: "#D3968C", // the exact given hex — large-fill/highlight use only, not text
          "fixed-dim": "#C17F73",
        },
        secondary: {
          DEFAULT: "#105666", // midnight green — links/selected states
          container: "#D7E7EA",
          "on-container": "#0A3D48",
        },
        tertiary: {
          DEFAULT: "#839958", // moss green — secondary backgrounds/tags
          container: "#E7ECD6",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          "on-container": "#93000a",
        },
        // Landing-page namespace — identical hexes to the core tokens above (same brand palette,
        // just a separate name), kept as-is since ~20 landing components + the shared Footer
        // already reference these exact class names (bg-scrapbook-forest, text-scrapbook-cream,
        // etc.). Not removed/merged: doing so would silently break every one of those classes.
        scrapbook: {
          forest: "#0A3323",
          moss: "#839958",
          cream: "#F8F6EE", // corrected alongside surface.DEFAULT above — same neutral-ivory fix
          rose: "#D3968C",
          midnight: "#105666",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        // Sparing use only — annotation/caption accents on the landing page, never body copy or
        // the HRUNA wordmark itself.
        hand: ["var(--font-caveat)", "cursive"],
      },
      fontSize: {
        // Hero-only display size — bigger, more dramatic than display-lg, for the luxury-editorial
        // pass. display-lg stays as-is since it's still used for section headlines (CTA, etc.).
        "display-xl": ["88px", { lineHeight: "92px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-xl-mobile": ["52px", { lineHeight: "56px", letterSpacing: "0em", fontWeight: "600" }],
        "display-lg": ["64px", { lineHeight: "72px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg-mobile": ["40px", { lineHeight: "48px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-sm": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500", letterSpacing: "0.05em" }],
      },
      borderRadius: {
        sm: "0.5rem",
        DEFAULT: "1rem",
        md: "1.5rem",
        lg: "2rem",
        xl: "3rem",
      },
      spacing: {
        gutter: "24px",
        "margin-mobile": "24px",
        "margin-desktop": "80px",
        "section-gap": "120px",
      },
      boxShadow: {
        soft: "0 20px 60px -20px rgba(10, 51, 35, 0.18)",
        lift: "0 10px 30px -10px rgba(10, 51, 35, 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
