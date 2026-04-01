import { Avatar } from "../atoms/Avatar";

export interface TrustBarUser {
  name: string;
  src?: string;
}

export interface TrustBarProps {
  users: TrustBarUser[];
  text: React.ReactNode;
  className?: string;
}

export function TrustBar({ users, text, className = "" }: TrustBarProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex -space-x-2">
        {users.map((user) => (
          <Avatar
            key={user.name}
            alt={user.name}
            src={user.src}
            size="sm"
            className="ring-2 ring-white"
          />
        ))}
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}
