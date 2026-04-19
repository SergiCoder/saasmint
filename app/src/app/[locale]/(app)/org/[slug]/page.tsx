import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListInvitations } from "@/application/use-cases/invitation/ListInvitations";
import { invitationGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { getOrgMembers } from "../../_data/getOrgMembers";
import { getSubscription } from "../../_data/getSubscription";
import { getUserOrgs } from "../../_data/getUserOrgs";
import { OrgMemberList } from "@/presentation/components/organisms/OrgMemberList";
import { InviteByEmailForm } from "./_components/InviteByEmailForm";
import { MemberActions } from "./_components/MemberActions";
import { InvitationList } from "./_components/InvitationList";
import { TransferOwnershipForm } from "./_components/TransferOwnershipForm";
import { SeatManager } from "./_components/SeatManager";

interface OrgDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function OrgDetailPage({ params }: OrgDetailPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, tCommon, user] = await Promise.all([
    getTranslations("org"),
    getTranslations("common"),
    getCurrentUser(),
  ]);
  const orgs = await getUserOrgs(user.id);
  const org = orgs.find((o) => o.slug === slug);

  if (!org) notFound();

  const [members, invitations, subscription] = await Promise.all([
    getOrgMembers(org.id),
    new ListInvitations(invitationGateway).execute(org.id).catch(() => []),
    getSubscription(),
  ]);

  const isTeamSubscription = subscription?.plan.context === "team";
  const totalSpots = isTeamSubscription ? subscription.quantity : null;

  const me = members.find((m) => m.user.id === user.id);
  const isOwner = me?.role === "owner";
  const isAdmin = me?.role === "admin";
  const canManage = isOwner || isAdmin;

  const memberRows = members.map((m) => {
    const isSelf = m.user.id === user.id;
    const isMemberOwner = m.role === "owner";

    let actions: React.ReactNode = null;
    if (canManage && !isMemberOwner && !isSelf) {
      actions = (
        <MemberActions
          orgId={org.id}
          userId={m.user.id}
          currentRole={m.role}
          labels={{
            menu: t("memberActionsMenu"),
            promoteToAdmin: t("promoteToAdmin"),
            demoteToMember: t("demoteToMember"),
            remove: t("remove"),
            removeConfirmTitle: t("removeMemberConfirmTitle"),
            removeConfirmBody: t("removeMemberConfirmBody"),
            removeConfirmAction: t("remove"),
            cancel: tCommon("cancel"),
          }}
        />
      );
    }

    return {
      id: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      roleLabel: t(
        `role${m.role.charAt(0).toUpperCase() + m.role.slice(1)}` as
          | "roleMember"
          | "roleAdmin"
          | "roleOwner",
      ),
      actions,
    };
  });

  const transferCandidates = members
    .filter((m) => m.role === "admin")
    .map((m) => ({ id: m.user.id, fullName: m.user.fullName }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("members")}
            </h2>
            {totalSpots !== null && (
              <span className="text-sm text-gray-500">
                {t("spotsUsed", { used: members.length, total: totalSpots })}
              </span>
            )}
          </div>
          {isOwner && isTeamSubscription && totalSpots !== null && (
            <SeatManager currentSeats={totalSpots} usedSeats={members.length} />
          )}
        </div>
        <OrgMemberList
          members={memberRows}
          columns={{
            name: t("name"),
            role: t("role"),
            actions: "",
          }}
        />
      </section>

      {canManage && invitations.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t("pendingInvitations")}
          </h2>
          <InvitationList
            invitations={invitations}
            orgId={org.id}
            locale={locale}
            columns={{
              email: t("email"),
              role: t("role"),
              invitedBy: t("invitedBy"),
              expiresAt: t("expiresAt"),
              actions: "",
            }}
            roleLabels={{
              admin: t("roleAdmin"),
              member: t("roleMember"),
            }}
            cancelLabel={t("cancelInvitation")}
          />
        </section>
      )}

      {canManage && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t("inviteByEmail")}
          </h2>
          <InviteByEmailForm orgId={org.id} />
        </section>
      )}

      {isOwner && transferCandidates.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t("transferOwnership")}
          </h2>
          <TransferOwnershipForm
            orgId={org.id}
            candidates={transferCandidates}
            label={t("transferOwnership")}
            selectLabel={t("selectNewOwner")}
            confirmTitle={t("transferOwnershipConfirmTitle")}
            confirmBody={t("transferOwnershipConfirmBody", { name: "{name}" })}
            confirmAction={tCommon("confirm")}
            confirmDismiss={tCommon("cancel")}
          />
        </section>
      )}
    </div>
  );
}
