import type { AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { isLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!isLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // Dynamic JSON imports surface as `any` to TypeScript (the module path is
    // computed). The cast is safe because all files under `messages/` follow
    // the next-intl messages schema enforced by the rest of the codebase
    // (typed translator keys originate from the same JSON).
    messages: (await import(`../../../messages/${locale}.json`))
      .default as AbstractIntlMessages,
  };
});
