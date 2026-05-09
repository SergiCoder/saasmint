import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { OrgMember } from "@/domain/models/OrgMember";
import { findTeamSubscription } from "@/domain/models/Subscription";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { formatLongDate } from "@/lib/formatLongDate";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { getOrgInvitations } from "../../_data/getOrgInvitations";
import { getOrgMembers } from "../../_data/getOrgMembers";
import { getSubscriptions } from "../../_data/getSubscriptions";
import { getUserOrgs } from "../../_data/getUserOrgs";
import { OrgMemberList } from "@/presentation/components/organisms/OrgMemberList";
import { InviteByEmailForm } from "./_components/InviteByEmailForm";
import { MemberActions } from "./_components/MemberActions";
import { InvitationList } from "./_components/InvitationList";
import { TransferOwnershipForm } from "./_components/TransferOwnershipForm";
import { DeleteOrgZone } from "./_components/DeleteOrgZone";
import { SeatManager } from "./_components/SeatManager";

const ROLE_LABEL_KEY = {
  owner: "roleOwner",
  admin: "roleAdmin",
  member: "roleMember",
} as const satisfies Record<
  OrgMember["role"],
  "roleOwner" | "roleAdmin" | "roleMember"
>;

interface OrgDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: OrgDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  // `getUserOrgs` is React.cache'd against the same key the page uses, so
  // resolving the org name here adds no extra round-trip when the page
  // renders successfully.
  const [t, orgs] = await Promise.all([
    getTranslations({ locale, namespace: "org" }),
    getUserOrgs(),
  ]);
  const org = orgs.find((o) => o.slug === slug);
  return { title: org?.name ?? t("members") };
}

export default async function OrgDetailPage({ params }: OrgDetailPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Kick off the subscription fetch alongside the user/orgs lookup so it
  // doesn't sit behind the `org.id` dependency in stage 2. The currency
  // argument matches the (app) layout's React.cache key so layout + page
  // share a single subscription roundtrip.
  const userPromise = getCurrentUser();
  const [t, tCommon, tPlans, user, orgs, subscriptions] = await Promise.all([
    getTranslations("org"),
    getTranslations("common"),
    getTranslations("plans"),
    userPromise,
    getUserOrgs(),
    userPromise.then((u) => getSubscriptions(u.preferredCurrency)),
  ]);
  const org = orgs.find((o) => o.slug === slug);

  if (!org) notFound();

  const [members, invitations] = await Promise.all([
    getOrgMembers(org.id),
    getOrgInvitations(org.id),
  ]);

  const teamSubscription = findTeamSubscription(subscriptions);
  const isTeamSubscription = teamSubscription !== null;
  const totalSpots = teamSubscription?.seatLimit ?? null;
  // Pre-compute the scheduled plan-switch context for the seat-update
  // success message. The seat update itself is always immediate; this info
  // describes a *separate* pending plan downgrade that may still apply at
  // period end. SeatManager only renders it when both facts coincide.
  const scheduledPlanName =
    teamSubscription?.scheduledPlan != null
      ? translatePlanName(tPlans, teamSubscription.scheduledPlan)
      : null;
  const scheduledChangeAtIso = teamSubscription?.scheduledChangeAt ?? null;
  const scheduledChangeDate =
    scheduledChangeAtIso !== null ? new Date(scheduledChangeAtIso) : null;
  const scheduledChangeDisplay =
    scheduledChangeDate !== null
      ? formatLongDate(scheduledChangeDate, locale) || null
      : null;

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
      roleLabel: t(ROLE_LABEL_KEY[m.role]),
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
            <SeatManager
              currentSeats={totalSpots}
              usedSeats={members.length}
              scheduledPlanName={scheduledPlanName}
              scheduledChangeDate={scheduledChangeDisplay}
            />
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
            confirmBody={t("transferOwnershipConfirmBody", {
              name: "{name}",
            })}
            confirmAction={tCommon("confirm")}
            confirmDismiss={tCommon("cancel")}
          />
        </section>
      )}

      {isOwner && <DeleteOrgZone orgId={org.id} orgName={org.name} />}
    </div>
  );
}
