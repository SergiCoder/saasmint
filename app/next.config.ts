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

const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    ...(isDev && { dangerouslyAllowLocalIP: true }),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(config);
