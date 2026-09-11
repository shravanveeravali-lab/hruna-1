/** @type {import('next').NextConfig} */

// Phase 7 fix: next/image strictly validates that any remote image hostname is allow-listed in
// `images.remotePatterns` — otherwise it throws (a real, page-crashing 500, not a warning) the
// moment ANY page renders a real Supabase Storage-hosted image (avatar, studio photo, request
// image, diary photo, project update photo, etc.) through <Image>. Only images.unsplash.com and
// images.pexels.com (the mock seed data's placeholder image hosts) were ever allow-listed — the
// actual Supabase Storage host (127.0.0.1:54321 locally; a real project's *.supabase.co host in
// production) never was, so this broke every real image on every real page site-wide as soon as a
// row actually had an uploaded image, not just this phase's new discovery pages. Derived from
// NEXT_PUBLIC_SUPABASE_URL (the same env var the app already uses to talk to Supabase) rather than
// hardcoded, so this keeps working correctly for local dev and for whatever real project URL a
// production deployment sets — no per-environment edit required.
function supabaseImageRemotePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      port: parsed.port || "",
      pathname: "/storage/v1/object/**",
    };
  } catch {
    return null;
  }
}

const supabasePattern = supabaseImageRemotePattern();

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      ...(supabasePattern ? [supabasePattern] : []),
    ],
  },
};

module.exports = nextConfig;
