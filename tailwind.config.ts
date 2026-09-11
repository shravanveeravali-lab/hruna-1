import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#fff8f5",
          dim: "#e0d9d3",
          bright: "#fff8f4",
          lowest: "#ffffff",
          low: "#fbf2ed",
          container: "#f4ece7",
          high: "#eee7e1",
          highest: "#e9e1dc",
        },
        ink: {
          DEFAULT: "#1e1b18",
          variant: "#4c4549",
        },
        outline: {
          DEFAULT: "#7e7579",
          variant: "#cfc3c8",
        },
        primary: {
          DEFAULT: "#51434c",
          container: "#f8e1ee",
          "on-container": "#74626d",
          fixed: "#f2dde9",
          "fixed-dim": "#d5c1cc",
        },
        secondary: {
          DEFAULT: "#5c5d6e",
          container: "#dedef2",
          "on-container": "#606172",
        },
        tertiary: {
          DEFAULT: "#494644",
          container: "#615e5b",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          "on-container": "#93000a",
        },
        // Landing-page-only palette for the scrapbook/editorial redesign — kept in its own
        // namespace rather than overwriting surface/primary/etc., so the rest of the app
        // (dashboards, forms, every other page) keeps its current mauve/blush identity untouched.
        scrapbook: {
          forest: "#0A3323",
          moss: "#839958",
          cream: "#F7F4D5",
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
        soft: "0 20px 60px -20px rgba(81, 67, 76, 0.18)",
        lift: "0 10px 30px -10px rgba(81, 67, 76, 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
