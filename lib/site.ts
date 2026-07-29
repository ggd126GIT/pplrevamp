export const site = {
  name: ".ppl Solutions, Inc.",
  shortName: ".ppl Solutions",
  tagline: "We are here to partner with you to achieve your business goals.",
  /** General/sales enquiries — shown on the contact page. */
  email: "sales@pplsolutionsinc.com",
  /** Recruitment — shown on careers. Separate inbox so applications don't
   *  land in the sales queue. */
  careersEmail: "careers@pplsolutionsinc.com",
  phone: "+1.814.747.5335",
  phoneHref: "tel:+18147475335",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com",
  social: {
    linkedin: "https://www.linkedin.com/company/ppl-solutions-inc/",
    // Profile-style URL — the vanity handle /pplsolutionsinc is NOT ours.
    // Tracking param (?mibextid=) intentionally stripped.
    facebook:
      "https://www.facebook.com/people/PPL-SOLUTIONS-INC/61550929425450/",
  },
};

export type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
};

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Careers", href: "/careers" },
  {
    label: "Resources",
    href: "/resources/how-to-get-started",
    children: [
      { label: "How to Get Started", href: "/resources/how-to-get-started" },
      { label: "FAQ", href: "/resources/faq" },
      { label: "Blog", href: "/blog" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

/**
 * Footer "Quick Links". The Explore column renders `primaryNav` minus anything
 * with children, which drops the whole Resources group — so this column carries
 * those, plus Privacy Policy. Keep it free of entries Explore already shows
 * (Services, Contact) or the two columns duplicate each other.
 *
 * Referral is deliberately absent: the page exists but is unlinked pending
 * legal sign-off on its conditions.
 */
export const footerLinks: NavItem[] = [
  { label: "How to Get Started", href: "/resources/how-to-get-started" },
  { label: "FAQ", href: "/resources/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];
