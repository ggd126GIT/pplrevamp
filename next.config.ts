import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async redirects() {
    // Preserve link equity from the old WordPress URLs.
    return [
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/about-us/:path*", destination: "/about", permanent: true },
      { source: "/faq", destination: "/resources/faq", permanent: true },
      { source: "/faqs", destination: "/resources/faq", permanent: true },
      { source: "/referral", destination: "/resources/referral", permanent: true },
      { source: "/referral-program", destination: "/resources/referral", permanent: true },
      { source: "/how-to-get-started", destination: "/resources/how-to-get-started", permanent: true },
      { source: "/get-started", destination: "/resources/how-to-get-started", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      { source: "/blog/:path*/amp", destination: "/blog/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
