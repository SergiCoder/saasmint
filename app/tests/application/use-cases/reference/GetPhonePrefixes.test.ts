import { describe, it, expect, vi } from "vitest";
import { GetPhonePrefixes } from "@/application/use-cases/reference/GetPhonePrefixes";
import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";

const phonePrefixes: PhonePrefix[] = [
  { prefix: "+1", label: "🇺🇸 US/CA" },
  { prefix: "+34", label: "🇪🇸 ES" },
];

function makeGateway(
  overrides?: Partial<IReferenceGateway>,
): IReferenceGateway {
  return {
    getPhonePrefixes: vi.fn().mockResolvedValue(phonePrefixes),
    getPronouns: vi.fn(),
    ...overrides,
  };
}

describe("GetPhonePrefixes", () => {
  it("returns phone prefixes from gateway", async () => {
    const gateway = makeGateway();
    const result = await new GetPhonePrefixes(gateway).execute();
    expect(result).toEqual(phonePrefixes);
    expect(gateway.getPhonePrefixes).toHaveBeenCalledOnce();
  });
});
