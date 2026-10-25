import Link from "next/link";

/**
 * components/footer.tsx — Global application footer.
 * Contains site links, open-source attribution, and a clean neo-brutalist border.
 */
export function Footer() {
  return (
    <footer className="w-full border-t-[3px] border-border bg-card py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8 text-sm">
        <p className="font-medium text-muted-foreground">
          Built for Hacktoberfest & open-source beginners. Free and open source.
        </p>
        <div className="flex items-center gap-6 font-semibold">
          <Link href="/faq" className="hover:underline">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
