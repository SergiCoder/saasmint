import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";

const mockPublicApiFetch = vi.fn();
vi.mock("@/infrastructure/api/apiClient", () => ({
  publicApiFetch: (...args: unknown[]) => mockPublicApiFetch(...args),
}));

const { DjangoApiReferenceGateway } =
  await import("@/infrastructure/api/DjangoApiReferenceGateway");

const phonePrefixes: PhonePrefix[] = [
  { prefix: "+1", label: "US/CA" },
  { prefix: "+34", label: "ES" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiReferenceGateway", () => {
  const gateway = new DjangoApiReferenceGateway();

  describe("getPhonePrefixes", () => {
    it("fetches phone prefixes from /phone-prefixes/", async () => {
      mockPublicApiFetch.mockResolvedValue(phonePrefixes);

      const result = await gateway.getPhonePrefixes();

      expect(mockPublicApiFetch).toHaveBeenCalledWith("/phone-prefixes/");
      expect(result).toEqual(phonePrefixes);
    });

    it("throws on error", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error("API 500: Internal Server Error"),
      );

      await expect(gateway.getPhonePrefixes()).rejects.toThrow(
        "API 500: Internal Server Error",
      );
    });
  });
});
