import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PolicyPage } from "@/presentation/components/templates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return { title: t("title") };
}

export default function TermsPage() {
  return <PolicyPage namespace="terms" />;
}
