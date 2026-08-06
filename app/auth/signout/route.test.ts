import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

const { POST } = await import("./route");

describe("POST /auth/signout", () => {
  it("clears the session", async () => {
    await POST();
    expect(signOut).toHaveBeenCalled();
  });

  it("redirects to the login page", async () => {
    const res = await POST();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/login");
  });

  // The regression this file exists for. Building the target from
  // `request.url` sent production to https://localhost:3000/login, because
  // under `next start` that URL does not carry the public host. A relative
  // Location resolves against whatever the browser actually asked for, so it is
  // correct in every environment.
  it("keeps the Location relative, never absolute", async () => {
    const location = (await POST()).headers.get("location") ?? "";
    expect(location.startsWith("/")).toBe(true);
    expect(location).not.toMatch(/^https?:\/\//);
    expect(location).not.toContain("localhost");
  });
});
