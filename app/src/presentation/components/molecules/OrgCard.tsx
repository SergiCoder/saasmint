import Link from "next/link";

export interface OrgCardProps {
  slug: string;
  name: string;
  spotsLabel?: string;
}

export function OrgCard({ slug, name, spotsLabel }: OrgCardProps) {
  return (
    <Link
      href={`/org/${slug}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏢</span>
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          {spotsLabel && <p className="text-sm text-gray-500">{spotsLabel}</p>}
        </div>
      </div>
    </Link>
  );
}
