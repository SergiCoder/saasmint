import { Badge } from "@/presentation/components/atoms/Badge";
import { Button } from "@/presentation/components/atoms/Button";
import { cancelInvitation } from "@/app/actions/org";
import type { Invitation } from "@/domain/models/Invitation";

interface InvitationListProps {
  invitations: Invitation[];
  orgId: string;
  locale: string;
  columns: {
    email: string;
    role: string;
    invitedBy: string;
    expiresAt: string;
    actions: string;
  };
  roleLabels: Record<string, string>;
  cancelLabel: string;
}

export function InvitationList({
  invitations,
  orgId,
  locale,
  columns,
  roleLabels,
  cancelLabel,
}: InvitationListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="w-full py-3 pr-6 pl-6 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.email}
            </th>
            <th className="py-3 pr-6 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.role}
            </th>
            <th className="py-3 pr-6 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.invitedBy}
            </th>
            <th className="py-3 pr-6 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.expiresAt}
            </th>
            <th className="py-3 pr-6 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {invitations.map((invitation) => (
            <tr key={invitation.id}>
              <td className="w-full py-4 pr-6 pl-6 text-sm whitespace-nowrap text-gray-900">
                {invitation.email}
              </td>
              <td className="py-4 pr-6 whitespace-nowrap">
                <Badge
                  variant={invitation.role === "admin" ? "warning" : "success"}
                >
                  {roleLabels[invitation.role] ?? invitation.role}
                </Badge>
              </td>
              <td className="py-4 pr-6 text-sm whitespace-nowrap text-gray-500">
                {invitation.invitedBy.fullName}
              </td>
              <td className="py-4 pr-6 text-sm whitespace-nowrap text-gray-500">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(new Date(invitation.expiresAt))}
              </td>
              <td className="py-4 pr-6 text-right whitespace-nowrap">
                <form action={cancelInvitation}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input
                    type="hidden"
                    name="invitationId"
                    value={invitation.id}
                  />
                  <Button type="submit" variant="danger" size="sm">
                    {cancelLabel}
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
