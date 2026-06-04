import { revalidatePath } from "next/cache";
import { routing } from "@/lib/i18n/routing";

/**
 * Revalidates a locale-independent path across every supported locale prefix.
 * `revalidatePath("/subscription", "layout")` does NOT match the actual cache
 * key `/en/subscription`, so a bare bare-path call silently no-ops in
 * production whenever the response is served under a `[locale]` segment.
 * This helper iterates the configured locale list so all variants are
 * invalidated. Pass `path` without a leading locale (e.g. "/subscription").
 */
export function revalidateLocalizedPath(
  path: string,
  type?: "layout" | "page",
): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}${path === "/" ? "" : path}`, type);
  }
}
