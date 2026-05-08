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

const isDev = process.env.NODE_ENV === "development";

// Origins that need to appear in `img-src` and `connect-src`. The API origin
// covers user avatars served by Django and the JSON API itself; OAuth
// provider hosts cover externally-hosted user avatars.
const apiOrigin = apiUrl ? new URL(apiUrl).origin : "";
const oauthAvatarHosts = [
  "https://lh3.googleusercontent.com",
  "https://avatars.githubusercontent.com",
];

const csp = [
  `default-src 'self'`,
  // Next.js injects small inline bootstrap scripts for hydration; without
  // per-request nonce middleware we need `'unsafe-inline'`. Dev additionally
  // uses `eval` for HMR fast refresh.
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
    ],
    ...(isDev && { dangerouslyAllowLocalIP: true }),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(config);
