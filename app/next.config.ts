import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const apiHostname = apiUrl ? new URL(apiUrl).hostname : "";

const apiProtocol: "http" | "https" = apiUrl
  ? (() => {
      const proto = new URL(apiUrl).protocol.replace(":", "");
      if (proto !== "http" && proto !== "https") {
        throw new Error(`Unsupported API protocol: ${proto}`);
      }
      return proto;
    })()
  : "https";

// Belt-and-braces: a misconfigured deployment that ships with NODE_ENV unset
// or "development" must not relax the production CSP. Vercel sets
// VERCEL_ENV=production on the live deployment; on platforms without it the
// fallback is a strict NODE_ENV === "development" check.
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
const isDev =
  process.env.NODE_ENV === "development" && vercelEnv !== "production";

// Origins that need to appear in `img-src` and `connect-src`. The API origin
// covers user avatars served by Django and the JSON API itself; OAuth
// provider hosts cover externally-hosted user avatars.
const apiOrigin = apiUrl ? new URL(apiUrl).origin : "";
const oauthAvatarHosts = [
  "https://lh3.googleusercontent.com",
  "https://avatars.githubusercontent.com",
  "https://graph.microsoft.com",
];

// This static baseline only applies to routes outside the middleware matcher
// (currently none of the user-facing pages — `/_next/static`, `/favicon.ico`,
// etc. — fall in that bucket). The middleware emits a stricter, nonce-bearing
// CSP for every page response, overriding the value set here. Keep the static
// fallback `'unsafe-inline'` because Next's static asset routes don't carry a
// nonce. Dev additionally needs `'unsafe-eval'` for HMR.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${apiOrigin} ${oauthAvatarHosts.join(" ")}`.trim(),
  `font-src 'self' data:`,
  // API JSON calls + dev HMR websocket. Production never speaks ws.
  `connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`.trim(),
  `frame-ancestors 'none'`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  // Server actions post back to same origin; Stripe redirects use server-issued
  // 30x Location headers (not form actions), so Stripe origins don't belong here.
  `form-action 'self'`,
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Legacy belt-and-braces alongside CSP frame-ancestors; older browsers
  // (pre-Chromium Edge, old Safari) honour X-Frame-Options but not
  // frame-ancestors, so we emit both to prevent clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const config: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      ...(apiHostname
        ? [{ protocol: apiProtocol, hostname: apiHostname }]
        : []),
      ...(isDev ? [{ hostname: "localhost" }] : []),
      // OAuth provider avatars — one entry per provider we support.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "graph.microsoft.com" },
    ],
    ...(isDev && { dangerouslyAllowLocalIP: true }),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(config);
