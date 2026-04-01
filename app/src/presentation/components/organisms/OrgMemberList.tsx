import { Avatar } from "../atoms/Avatar";
import { Badge } from "../atoms/Badge";

const roleVariant = {
  owner: "info",
  admin: "warning",
  member: "success",
} as const;

export interface OrgMemberRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: keyof typeof roleVariant;
  roleLabel: string;
  actions?: React.ReactNode;
}

export interface OrgMemberListProps {
  members: OrgMemberRow[];
  columns: { name: string; role: string; actions: string };
  className?: string;
}

export function OrgMemberList({
  members,
  columns,
  className = "",
}: OrgMemberListProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.name}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.role}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatarUrl}
                    alt={member.fullName}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.fullName}
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={roleVariant[member.role]}>
                  {member.roleLabel}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                {member.actions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
