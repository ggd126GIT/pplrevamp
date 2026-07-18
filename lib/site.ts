export const site = {
  name: ".ppl Solutions, Inc.",
  shortName: ".ppl Solutions",
  tagline: "We are here to partner with you to achieve your business goals.",
  email: "hello@pplsolutionsinc.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com",
  social: {
    linkedin: "https://www.linkedin.com/company/ppl-solutions-inc",
    facebook: "https://www.facebook.com/pplsolutionsinc",
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
  { label: "Blog", href: "/blog" },
  {
    label: "Resources",
    href: "/resources/how-to-get-started",
    children: [
      { label: "How to Get Started", href: "/resources/how-to-get-started" },
      { label: "FAQ", href: "/resources/faq" },
      { label: "Referral Program", href: "/resources/referral" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

export const footerLinks: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];
