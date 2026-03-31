import { Link } from "@/lib/i18n/navigation";
import { Logo } from "../atoms/Logo";

export interface FooterLink {
  href: string;
  label: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterProps {
  appName: string;
  sections: FooterSection[];
  copyright: string;
  className?: string;
}

export function Footer({
  appName,
  sections,
  copyright,
  className = "",
}: FooterProps) {
  return (
    <footer className={`border-t border-gray-200 bg-white ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo appName={appName} />
          </div>
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-900">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-400">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
