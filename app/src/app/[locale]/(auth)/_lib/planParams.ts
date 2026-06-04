/**
 * Build the `plan` + `context=team` forwarding for the auth pages.
 * Both `/login` and `/signup` need to pass the upstream selection through to
 * each other (footer "have an account?" / "no account?" link) and into the
 * form submission as hidden fields. Returns a `href(basePath)` builder so
 * the same params can target either page.
 */
export function buildPlanParams(
  plan: string | undefined,
  isTeam: boolean,
): {
  href: (basePath: string) => string;
  hiddenFields: Record<string, string> | undefined;
} {
  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  if (isTeam) params.set("context", "team");

  const fields: Record<string, string> = {};
  if (plan) fields.plan = plan;
  if (isTeam) fields.context = "team";

  return {
    href: (basePath) =>
      params.size > 0 ? `${basePath}?${params.toString()}` : basePath,
    hiddenFields: Object.keys(fields).length > 0 ? fields : undefined,
  };
}
