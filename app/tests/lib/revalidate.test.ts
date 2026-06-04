import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/i18n/routing", () => ({
  routing: { locales: ["en", "es", "pt-BR"] },
}));

import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/revalidate";

const revalidatePathMock = vi.mocked(revalidatePath);

beforeEach(() => {
  revalidatePathMock.mockReset();
});

describe("revalidateLocalizedPath", () => {
  it("invalidates the path under every supported locale prefix", () => {
    revalidateLocalizedPath("/subscription", "layout");

    expect(revalidatePathMock).toHaveBeenCalledTimes(3);
    expect(revalidatePathMock).toHaveBeenNthCalledWith(
      1,
      "/en/subscription",
      "layout",
    );
    expect(revalidatePathMock).toHaveBeenNthCalledWith(
      2,
      "/es/subscription",
      "layout",
    );
    expect(revalidatePathMock).toHaveBeenNthCalledWith(
      3,
      "/pt-BR/subscription",
      "layout",
    );
  });

  it('treats "/" as the locale root, not "/locale/"', () => {
    revalidateLocalizedPath("/", "layout");

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/en", "layout");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/es", "layout");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/pt-BR", "layout");
  });

  it("forwards undefined type when omitted", () => {
    revalidateLocalizedPath("/dashboard");

    expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard", undefined);
  });
});
