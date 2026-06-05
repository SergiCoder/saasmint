/**
 * Shared translator stub for tests. Matches the behaviour installed
 * globally by `tests/setup.ts` (for `next-intl`'s `useTranslations`) so
 * tests that need to stub the server-side `next-intl/server`
 * `getTranslations` can import the same function and stay consistent.
 *
 * When called with no params it returns the key verbatim. With a params
 * object it substitutes `{name}` placeholders in the key, appending any
 * unused params space-separated at the end — this lets component tests
 * assert on interpolated values (e.g. `getByText(/Jane Doe/)`) without
 * coupling to any particular key-name format.
 */
export type TranslateParams = Record<string, string | number | Date>;

export function translate(key: string, params?: TranslateParams): string {
  if (!params) return key;
  const entries = Object.entries(params);
  if (entries.length === 0) return key;
  let out = key;
  const leftover: string[] = [];
  for (const [name, value] of entries) {
    const placeholder = `{${name}}`;
    const str = String(value);
    if (out.includes(placeholder)) {
      out = out.replaceAll(placeholder, str);
    } else {
      leftover.push(str);
    }
  }
  return leftover.length > 0 ? `${out} ${leftover.join(" ")}` : out;
}
