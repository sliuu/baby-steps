import { PrivacyDialog } from "@/components/PrivacyDialog";

const LINK = "hover:underline underline-offset-4";

const LINKS = [
  { label: "github", href: "https://github.com/sliuu/baby-steps" },
  { label: "contact", href: "mailto:stxphanieliu@gmail.com" },
];

export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-s4 gap-y-s1 pt-(--frame-pad) text-caption text-on-frame">
      <span>© {new Date().getFullYear()} baby steps</span>
      <nav aria-label="Site" className="flex gap-s4">
        <PrivacyDialog className={LINK} />
        {LINKS.map(({ label, href }) => (
          <a key={label} href={href} className={LINK}>
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
