import Link from "next/link";

export interface OrgCardProps {
  slug: string;
  name: string;
}

export function OrgCard({ slug, name }: OrgCardProps) {
  return (
    <Link
      href={`/org/${slug}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="font-medium text-gray-900">{name}</p>
      <p className="text-sm text-gray-500">{slug}</p>
    </Link>
  );
}
