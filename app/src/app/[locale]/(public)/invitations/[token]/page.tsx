import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GetInvitationByToken } from "@/application/use-cases/invitation/GetInvitationByToken";
import { invitationGateway } from "@/infrastructure/registry";
import { Button } from "@/presentation/components/atoms/Button";
import { declineInvitation } from "@/app/actions/invitation";
import { AcceptInvitationForm } from "./_components/AcceptInvitationForm";

interface InvitationPageProps {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({
  params,
}: InvitationPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invitation" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const [t, invitation] = await Promise.all([
    getTranslations("invitation"),
    new GetInvitationByToken(invitationGateway).execute(token),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">
          {t("description", { orgName: invitation.orgName })}
        </p>

        <AcceptInvitationForm token={token} />

        <form action={declineInvitation} className="mt-3">
          <input type="hidden" name="token" value={token} />
          <Button
            type="submit"
            variant="secondary"
            className="w-full cursor-pointer"
          >
            {t("decline")}
          </Button>
        </form>
      </div>
    </div>
  );
}
