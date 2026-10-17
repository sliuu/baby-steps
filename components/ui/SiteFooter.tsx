// Privacy, terms and contact pages don't exist yet; links go to "#".
const LINKS = [
  { label: "privacy", href: "#" },
  { label: "terms", href: "#" },
  { label: "contact", href: "#" },
];

export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-(--frame-pad) text-caption text-on-frame">
      <span>© {new Date().getFullYear()} baby steps</span>
      <nav aria-label="Site" className="flex gap-6">
        {LINKS.map(({ label, href }) => (
          <a key={label} href={href} className="hover:underline underline-offset-4">
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
