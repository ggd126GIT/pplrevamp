import { describe, it, expect } from "vitest";
import { organizationSchema } from "@/lib/orgSchema";
import { site } from "@/lib/site";

describe("organizationSchema", () => {
  it("carries the registered office as a PostalAddress", () => {
    const s = organizationSchema();

    expect(s.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: `${site.address.street}, ${site.address.district}`,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    });
  });

  it("takes every address part from site.address so the three copies cannot drift", () => {
    // The same constant feeds the privacy policy and every JobPosting. A
    // hardcoded string here is the regression this test exists to catch.
    const address = organizationSchema().address as Record<string, string>;
    const serialised = Object.values(address).join(" | ");

    expect(serialised).toContain(site.address.street);
    expect(serialised).toContain(site.address.locality);
    expect(serialised).toContain(site.address.postalCode);
  });

  it("states the country, which is what separates us from the US utility", () => {
    // Most Search Console impressions are brand confusion with PPL Electric
    // Utilities. A PH address is a hard disambiguation signal.
    expect((organizationSchema().address as { addressCountry: string })
      .addressCountry).toBe("PH");
  });

  it("still emits the identity fields it had before", () => {
    const s = organizationSchema();
    expect(s["@type"]).toBe("Organization");
    expect(s.name).toBe(site.name);
    expect(s.url).toBe(site.url);
    expect(s.email).toBe(site.email);
    expect(s.telephone).toBe(site.phone);
    expect(s.sameAs).toEqual([site.social.linkedin, site.social.facebook]);
  });
});
