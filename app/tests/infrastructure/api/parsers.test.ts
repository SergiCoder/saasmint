import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Org } from "@/domain/models/Org";
import type { OrgMember } from "@/domain/models/OrgMember";
import type { Invitation, PublicInvitation } from "@/domain/models/Invitation";

/**
 * Mock apiClient so fetchCurrentUser never hits the network.
 * The mock is hoisted above the module imports by Vitest.
 */
const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const {
  parseUser,
  fetchCurrentUser,
  makeParser,
  parseOrg,
  parseMember,
  parseInvitation,
  parsePublicInvitation,
} = await import("@/infrastructure/api/parsers");

// ------------------------------------------------------------------
// Shared raw fixtures (snake_case, as returned by the Django API)
// ------------------------------------------------------------------

const snakeUser = {
  id: "u1",
  email: "alice@example.com",
  full_name: "Alice",
  avatar_url: null,
  preferred_locale: "en",
  preferred_currency: "USD",
  phone: null,
  timezone: null,
  job_title: null,
  pronouns: null,
  bio: null,
  is_verified: true,
  registration_method: "email",
  linked_providers: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const camelUser = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  preferredLocale: "en",
  preferredCurrency: "USD",
  phonePrefix: null,
  phone: null,
  timezone: null,
  jobTitle: null,
  pronouns: null,
  bio: null,
  isVerified: true,
  registrationMethod: "email",
  linkedProviders: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const snakeOrg = {
  id: "o1",
  name: "Acme",
  slug: "acme",
  logo_url: null,
  created_at: "2024-01-01T00:00:00Z",
};

const camelOrg: Org = {
  id: "o1",
  name: "Acme",
  slug: "acme",
  logoUrl: null,
  createdAt: "2024-01-01T00:00:00Z",
};

const snakeMember = {
  id: "m1",
  org: snakeOrg,
  user: {
    id: "u1",
    email: "alice@example.com",
    full_name: "Alice",
    avatar_url: null,
  },
  role: "admin",
  is_billing: false,
  joined_at: "2024-01-01T00:00:00Z",
};

const snakeInvitation = {
  id: "inv1",
  org: snakeOrg,
  email: "bob@example.com",
  role: "member",
  status: "pending",
  invited_by: { id: "u1", full_name: "Alice" },
  created_at: "2024-01-01T00:00:00Z",
  expires_at: "2024-01-08T00:00:00Z",
};

const snakePublicInvitation = {
  id: "inv1",
  org: snakeOrg,
  role: "member",
  status: "pending",
  invited_by: { id: "u1", full_name: "Alice" },
  created_at: "2024-01-01T00:00:00Z",
  expires_at: "2024-01-08T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ------------------------------------------------------------------
// parseUser
// ------------------------------------------------------------------

describe("parseUser", () => {
  it("converts snake_case to camelCase and passes Zod schema validation", () => {
    const result = parseUser(snakeUser);
    expect(result).toEqual(camelUser);
  });

  it("flattens nested phone object into phonePrefix and phone fields", () => {
    const raw = { ...snakeUser, phone: { prefix: "+34", number: "612345678" } };
    const result = parseUser(raw);
    expect(result.phonePrefix).toBe("+34");
    expect(result.phone).toBe("612345678");
  });

  it("preserves null phone as null phonePrefix and null phone", () => {
    const result = parseUser(snakeUser);
    expect(result.phonePrefix).toBeNull();
    expect(result.phone).toBeNull();
  });

  it("throws a ZodError when a required field is missing", () => {
    const { id: _id, ...withoutId } = snakeUser;
    expect(() => parseUser(withoutId)).toThrow();
  });
});

// ------------------------------------------------------------------
// fetchCurrentUser
// ------------------------------------------------------------------

describe("fetchCurrentUser", () => {
  it("fetches GET /account/ and returns the parsed user", async () => {
    mockApiFetch.mockResolvedValue(snakeUser);

    const result = await fetchCurrentUser();

    expect(mockApiFetch).toHaveBeenCalledWith("/account/");
    expect(result).toEqual(camelUser);
  });

  it("propagates errors thrown by apiFetch", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    await expect(fetchCurrentUser()).rejects.toThrow("Network error");
  });
});

// ------------------------------------------------------------------
// makeParser — generic factory
// ------------------------------------------------------------------

describe("makeParser", () => {
  it("returns a function that converts snake_case keys and validates via the schema", () => {
    const result = parseOrg(snakeOrg);
    expect(result).toEqual(camelOrg);
  });

  it("throws when the raw object fails schema validation", () => {
    const { id: _id, ...withoutId } = snakeOrg;
    expect(() => parseOrg(withoutId)).toThrow();
  });
});

// ------------------------------------------------------------------
// parseOrg
// ------------------------------------------------------------------

describe("parseOrg", () => {
  it("converts a snake_case org response to a camelCase Org domain object", () => {
    const result: Org = parseOrg(snakeOrg);
    expect(result.id).toBe("o1");
    expect(result.slug).toBe("acme");
    expect(result.logoUrl).toBeNull();
    expect(result.createdAt).toBe("2024-01-01T00:00:00Z");
  });

  it("maps a non-null logoUrl", () => {
    const result: Org = parseOrg({
      ...snakeOrg,
      logo_url: "https://cdn/logo.png",
    });
    expect(result.logoUrl).toBe("https://cdn/logo.png");
  });
});

// ------------------------------------------------------------------
// parseMember
// ------------------------------------------------------------------

describe("parseMember", () => {
  it("converts a snake_case member response to a camelCase OrgMember", () => {
    const result: OrgMember = parseMember(snakeMember);
    expect(result.id).toBe("m1");
    expect(result.role).toBe("admin");
    expect(result.isBilling).toBe(false);
    expect(result.joinedAt).toBe("2024-01-01T00:00:00Z");
    expect(result.user.fullName).toBe("Alice");
    expect(result.org.name).toBe("Acme");
  });

  it("throws on an unknown role", () => {
    expect(() => parseMember({ ...snakeMember, role: "superuser" })).toThrow();
  });
});

// ------------------------------------------------------------------
// parseInvitation
// ------------------------------------------------------------------

describe("parseInvitation", () => {
  it("converts a snake_case invitation response to a camelCase Invitation", () => {
    const result: Invitation = parseInvitation(snakeInvitation);
    expect(result.id).toBe("inv1");
    expect(result.email).toBe("bob@example.com");
    expect(result.role).toBe("member");
    expect(result.invitedBy.fullName).toBe("Alice");
    expect(result.org.slug).toBe("acme");
  });

  it("throws on an unknown status", () => {
    expect(() =>
      parseInvitation({ ...snakeInvitation, status: "revoked" }),
    ).toThrow();
  });
});

// ------------------------------------------------------------------
// parsePublicInvitation
// ------------------------------------------------------------------

describe("parsePublicInvitation", () => {
  it("converts a snake_case public invitation response to a camelCase PublicInvitation", () => {
    const result: PublicInvitation = parsePublicInvitation(
      snakePublicInvitation,
    );
    expect(result.id).toBe("inv1");
    expect(result.role).toBe("member");
    expect(result.invitedBy.fullName).toBe("Alice");
    // PublicInvitation must not carry the invitee email
    expect(result).not.toHaveProperty("email");
  });
});
