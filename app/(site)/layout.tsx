import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { InteractionTracker } from "@/components/analytics/InteractionTracker";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Analytics />
      <InteractionTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
