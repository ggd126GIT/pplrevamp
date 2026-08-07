import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { InteractionTracker } from "@/components/analytics/InteractionTracker";
import { OrganizationSchema } from "@/components/OrganizationSchema";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrganizationSchema />
      <Analytics />
      <InteractionTracker />
      {/* Both are public-site only. Mounting them here rather than in the root
          layout is what keeps Google off /admin, /login and /preview. */}
      <GoogleAnalytics />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </>
  );
}
