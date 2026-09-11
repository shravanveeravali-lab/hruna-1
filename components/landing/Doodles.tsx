// A small set of simple, hand-drawn-style line doodles used sparingly across the scrapbook
// sections (stars, a flower, thread, scissors, a dress sketch). Plain inline SVG, `currentColor`
// stroke so each usage can tint via a text-* class, always aria-hidden (purely decorative).

type DoodleProps = { className?: string; size?: number };

export function StarDoodle({ className = "", size = 24 }: DoodleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2c.7 4 2 6.6 4.5 8.2 2 1.2 3.7 1.5 5.5 1.8-1.8.4-3.5.7-5.5 1.8-2.5 1.6-3.8 4.2-4.5 8.2-.7-4-2-6.6-4.5-8.2-2-1.2-3.7-1.5-5.5-1.8 1.8-.4 3.5-.7 5.5-1.8C10 8.6 11.3 6 12 2Z" />
    </svg>
  );
}

export function FlowerDoodle({ className = "", size = 28 }: DoodleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="14" cy="14" r="2.6" />
      <path d="M14 11.4c-1-2.6-1-5-0.2-7.4 1.8 1.6 2.8 3.6 2.8 7" />
      <path d="M16.6 14c2.6-1 5-1 7.4-0.2-1.6 1.8-3.6 2.8-7 2.8" />
      <path d="M14 16.6c1 2.6 1 5 0.2 7.4-1.8-1.6-2.8-3.6-2.8-7" />
      <path d="M11.4 14c-2.6 1-5 1-7.4 0.2 1.6-1.8 3.6-2.8 7-2.8" />
    </svg>
  );
}

export function ThreadDoodle({ className = "", size = 32 }: DoodleProps) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 48 28" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M2 14c4-8 8 8 12 0s8 8 12 0 8 8 12 0 6-6 8-2" />
    </svg>
  );
}

export function ScissorsDoodle({ className = "", size = 24 }: DoodleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <path d="M8 7.5 20 19M8 16.5 20 5" />
    </svg>
  );
}

export function DressSketchDoodle({ className = "", size = 40 }: DoodleProps) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M17 4c0 2-1.5 3-1.5 5s1.5 2 1.5 3.5c0 1-1.5 1.5-1.5 2.5M23 4c0 2 1.5 3 1.5 5s-1.5 2-1.5 3.5c0 1 1.5 1.5 1.5 2.5" />
      <path d="M15 15c-4 6-6 14-6 24 0 2 22 2 22 0 0-10-2-18-6-24" />
      <path d="M15 15c1.6 2 3.2 3 5 3s3.4-1 5-3" />
    </svg>
  );
}
