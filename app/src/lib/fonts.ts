import { Inter } from "next/font/google";

// `preload` defaults to true for `next/font` imports at module scope, but
// we set it explicitly so the behaviour is self-documenting — the hero LCP
// is the h1 headline, so getting the display weight on the wire early wins
// ~50-150ms on cold marketing visits.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});
