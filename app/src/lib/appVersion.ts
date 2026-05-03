import pkg from "../../package.json";

/**
 * Current frontend release. Read once at module load from package.json so the
 * value the UI shows always matches what shipped — manual constants drift.
 */
export const APP_VERSION = pkg.version;

const REPO_RELEASES_URL =
  "https://github.com/SergiCoder/saasmint-app/releases/tag";

export function getReleaseUrl(version: string): string {
  return `${REPO_RELEASES_URL}/v${version}`;
}
