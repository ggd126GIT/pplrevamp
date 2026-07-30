import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { InteractionTracker } from "@/components/analytics/InteractionTracker";
import { OrganizationSchema } from "@/components/OrganizationSchema";

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
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
