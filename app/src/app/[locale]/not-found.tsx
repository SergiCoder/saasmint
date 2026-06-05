import { getTranslations } from "next-intl/server";
import { ErrorView } from "@/presentation/components/organisms/ErrorView";

export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <ErrorView
      title={t("title")}
      description={t("description")}
      homeLabel={t("home")}
      homeHref="/"
    />
  );
}
