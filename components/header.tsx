import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNav } from "@/components/auth-nav";
import { MobileMenu } from "@/components/mobile-menu";

/**
 * components/header.tsx — Main sticky header navigation.
 *
 * Features neo-brutalist styling, 3px borders, hard shadows, brand logo,
 * high-contrast nav links for light & dark mode, and responsive mobile drawer.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b-[3px] border-border bg-card text-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-heading text-xl font-black tracking-tight text-foreground"
          >
            <span className="bg-primary px-2.5 py-1 text-primary-foreground border-2 border-border shadow-[2px_2px_0_var(--shadow-color)]">
              CF
            </span>
            <span className="text-foreground font-black">
              Contribution Finder
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-2 text-sm font-bold">
            <Link
              href="/"
              className="px-3 py-1.5 text-foreground hover:bg-muted border-2 border-transparent hover:border-border transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/saved"
              className="px-3 py-1.5 text-foreground hover:bg-muted border-2 border-transparent hover:border-border transition-colors"
            >
              Saved Issues
            </Link>
            <Link
              href="/faq"
              className="px-3 py-1.5 text-foreground hover:bg-muted border-2 border-transparent hover:border-border transition-colors"
            >
              FAQ
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center">
            <AuthNav />
          </div>
          <div className="hidden md:flex items-center">
            <ThemeToggle />
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
