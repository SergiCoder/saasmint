import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";

const phonePrefixes: PhonePrefix[] = [
  { prefix: "+1", label: "🇺🇸 US/CA" },
  { prefix: "+34", label: "🇪🇸 ES" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { DjangoApiReferenceGateway } =
  await import("@/infrastructure/api/DjangoApiReferenceGateway");

describe("DjangoApiReferenceGateway", () => {
  const gateway = new DjangoApiReferenceGateway();

  describe("getPhonePrefixes", () => {
    it("fetches phone prefixes from GET /phone-prefixes/", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(phonePrefixes),
      });

      const result = await gateway.getPhonePrefixes();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/api/v1/phone-prefixes/",
      );
      expect(result).toEqual(phonePrefixes);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      await expect(gateway.getPhonePrefixes()).rejects.toThrow(
        "API 500: Internal Server Error",
      );
    });
  });

  describe("getPronouns", () => {
    it("fetches pronouns from GET /pronouns/", async () => {
      const pronouns = ["he/him", "she/her", "they/them"];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(pronouns),
      });

      const result = await gateway.getPronouns();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/api/v1/pronouns/",
      );
      expect(result).toEqual(pronouns);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      await expect(gateway.getPronouns()).rejects.toThrow(
        "API 500: Internal Server Error",
      );
    });
  });
});
