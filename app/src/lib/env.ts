/**
 * Boot-time environment validator. Intentionally zod-free so this module
 * can be imported from Edge middleware (`src/proxy.ts`) without pulling
 * zod into the per-request middleware bundle.
 */
function requireUrl(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  try {
    new URL(value);
  } catch {
    throw new Error(`Invalid URL in environment variable ${name}: ${value}`);
  }
  return value;
}

export const env = {
  NEXT_PUBLIC_API_URL: requireUrl("NEXT_PUBLIC_API_URL"),
  NEXT_PUBLIC_APP_URL: requireUrl("NEXT_PUBLIC_APP_URL"),
} as const;
