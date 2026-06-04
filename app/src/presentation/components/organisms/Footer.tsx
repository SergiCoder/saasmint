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

export interface FooterVersion {
  /** Display label, e.g. "v0.8.0". */
  label: string;
  /** External URL the label links to (e.g. a GitHub releases page). */
  href: string;
}

export interface FooterProps {
  appName: string;
  sections: FooterSection[];
  copyright: string;
  /**
   * Optional release tag rendered next to the copyright as a small external
   * link. Useful as a build-version stamp on a SaaS template so forkers can
   * see what version their copy is at.
   */
  version?: FooterVersion;
  className?: string;
}

export function Footer({
  appName,
  sections,
  copyright,
  version,
  className = "",
}: FooterProps) {
  const allLinks = sections.flatMap((s) => s.links);

  return (
    <footer className={`border-t border-gray-200 bg-white ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <Logo appName={appName} />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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

        <p className="flex flex-wrap items-center justify-center gap-x-2 text-[13px] text-gray-400 sm:justify-end">
          <span>{copyright}</span>
          {version && (
            <>
              <span aria-hidden="true">·</span>
              <a
                href={version.href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-gray-400 transition-colors hover:text-gray-700"
              >
                {version.label}
              </a>
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
