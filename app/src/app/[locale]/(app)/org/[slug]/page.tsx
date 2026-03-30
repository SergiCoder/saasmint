import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { ListOrgMembers } from "@/application/use-cases/org-member/ListOrgMembers";
import {
  authGateway,
  orgGateway,
  orgMemberGateway,
} from "@/infrastructure/registry";
import { OrgMemberList } from "@/presentation/components/organisms/OrgMemberList";
import { Button } from "@/presentation/components/atoms/Button";
import { removeMember } from "@/app/actions/org";
import { InviteMemberForm } from "./_components/InviteMemberForm";

interface OrgDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrgDetailPage({ params }: OrgDetailPageProps) {
  const { slug } = await params;

  const [t, user] = await Promise.all([
    getTranslations("org"),
    new GetCurrentUser(authGateway).execute(),
  ]);
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);
  const org = orgs.find((o) => o.slug === slug);

  if (!org) notFound();

  const members = await new ListOrgMembers(orgMemberGateway).execute(org.id);

  const memberRows = members.map((m) => ({
    id: m.userId,
    fullName: m.userId,
    email: "",
    role: m.role,
    roleLabel: t(
      `role${m.role.charAt(0).toUpperCase() + m.role.slice(1)}` as
        | "roleMember"
        | "roleAdmin"
        | "roleOwner",
    ),
    actions: (
      <form action={removeMember}>
        <input type="hidden" name="orgId" value={org.id} />
        <input type="hidden" name="userId" value={m.userId} />
        <Button type="submit" variant="danger" size="sm">
          {t("remove")}
        </Button>
      </form>
    ),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
        <p className="text-sm text-gray-500">{org.slug}</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("members")}
        </h2>
        <OrgMemberList
          members={memberRows}
          columns={{
            name: "Name",
            role: t("role"),
            actions: "",
          }}
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("invite")}
        </h2>
        <InviteMemberForm orgId={org.id} />
      </section>
    </div>
  );
}
