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
  const allLinks = sections.flatMap((s) => s.links);

  return (
    <footer className={`border-t border-gray-200 bg-gray-50 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-8 sm:px-8 lg:px-16">
        <Logo appName={appName} />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {allLinks.map((link) => {
            const Comp = link.href.startsWith("#") ? "a" : Link;
            return (
              <Comp
                key={link.label}
                href={link.href}
                className="text-[13px] text-gray-500 transition-colors hover:text-gray-900"
              >
                {link.label}
              </Comp>
            );
          })}
        </div>

        <p className="text-[13px] text-gray-400">{copyright}</p>
      </div>
    </footer>
  );
}
