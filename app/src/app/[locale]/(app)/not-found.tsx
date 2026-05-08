import { getTranslations } from "next-intl/server";
import { ErrorView } from "@/presentation/components/organisms/ErrorView";

/**
 * 404 page shown when an authenticated route calls `notFound()` (e.g. an
 * org slug the user does not belong to). Co-located inside the `(app)`
 * route group so the AppLayout chrome — navbar, user menu — wraps the
 * error view, instead of falling back to the bare locale-level 404.
 */
export default async function AppNotFound() {
  const t = await getTranslations("notFound");

  return (
    <ErrorView
      title={t("title")}
      description={t("description")}
      homeLabel={t("home")}
      homeHref="/dashboard"
    />
  );
}
