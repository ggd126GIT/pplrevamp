import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "./ui/Container";
import { footerLinks, primaryNav, site } from "@/lib/site";
import { FacebookIcon, LinkedInIcon } from "@/components/icons/brand";
import { CookieSettingsButton } from "@/components/CookieConsent";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-ink text-white/80">
      <Container size="wide" className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo className="text-2xl" />
            <p className="mt-4 text-white/70 leading-relaxed">
              {site.tagline}
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={site.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-purple"
              >
                <LinkedInIcon className="size-5" />
              </a>
              <a
                href={site.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-purple"
              >
                <FacebookIcon className="size-5" />
              </a>
            </div>
            <p className="mt-6 text-sm">
              <a
                href={site.phoneHref}
                className="inline-block py-2 text-white/70 transition-colors hover:text-gold"
              >
                {site.phone}
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Explore
            </h2>
            {/* Tight spacing plus padded links: the tap target is the padding,
                so the visual rhythm stays close to the original. */}
            <ul className="mt-2 space-y-0.5">
              {primaryNav
                .filter((i) => !i.children)
                .map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-block py-2 text-white/70 transition-colors hover:text-gold"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h2>
            {/* Tight spacing plus padded links: the tap target is the padding,
                so the visual rhythm stays close to the original. */}
            <ul className="mt-2 space-y-0.5">
              {footerLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-block py-2 text-white/70 transition-colors hover:text-gold"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {site.name} All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <CookieSettingsButton className="py-2 text-white/50 transition-colors hover:text-gold" />
            <p>
              Happy <span className="ppl-lockup">.ppl</span> create Happy
              Customers.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
