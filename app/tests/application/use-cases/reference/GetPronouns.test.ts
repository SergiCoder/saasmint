import { describe, it, expect, vi } from "vitest";
import { GetPronouns } from "@/application/use-cases/reference/GetPronouns";
import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";

const pronouns = ["he/him", "she/her", "they/them"];

function makeGateway(
  overrides?: Partial<IReferenceGateway>,
): IReferenceGateway {
  return {
    getPhonePrefixes: vi.fn(),
    getPronouns: vi.fn().mockResolvedValue(pronouns),
    ...overrides,
  };
}

describe("GetPronouns", () => {
  it("returns pronouns from gateway", async () => {
    const gateway = makeGateway();
    const result = await new GetPronouns(gateway).execute();
    expect(result).toEqual(pronouns);
    expect(gateway.getPronouns).toHaveBeenCalledOnce();
  });
});
