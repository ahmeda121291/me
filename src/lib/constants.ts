// Site identity (spec §1). SITE_NAME is configurable via env.
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "First Ballot";
export const TAGLINE = "One career a day. No names. Your call.";

// Server-side: prefer the explicit site URL, then Vercel's own URL envs.
// Client components should use window.location.origin instead.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

// Supabase URL + anon key are public-by-design (RLS + security-definer RPCs
// gate everything). Fallbacks keep a fresh deploy working with zero env setup.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://yggdfeoznuqettgfrfca.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZ2RmZW96bnVxZXR0Z2ZyZmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjk5OTEsImV4cCI6MjA5Njc0NTk5MX0.Bkl9SwFHxbIfFAuuDDIJw6q6QcLrty1iezFqBc5AdyU";

export const STRIPE_PRICE_MONTHLY =
  process.env.STRIPE_PRICE_MONTHLY ?? "price_1Th9LbRG0Z7ZCg7WU1YNAw4m";
export const STRIPE_PRICE_ANNUAL =
  process.env.STRIPE_PRICE_ANNUAL ?? "price_1Th9LdRG0Z7ZCg7WZ4KTywvT";

export const CLUB_MONTHLY_DISPLAY = "$8.99/mo";
export const CLUB_ANNUAL_DISPLAY = "$59.99/yr";
