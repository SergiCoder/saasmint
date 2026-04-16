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
};

export default withNextIntl(config);
