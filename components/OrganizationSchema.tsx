import { organizationSchema } from "@/lib/orgSchema";

/**
 * Organization structured data, rendered once per page from the site layout.
 * The object itself lives in `lib/orgSchema.ts` so it can be tested.
 */
export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      // Server-rendered from a static object literal — no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
    />
  );
}
