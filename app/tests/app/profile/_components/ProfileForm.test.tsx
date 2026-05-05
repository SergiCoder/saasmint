import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";

// --- Mocks ---------------------------------------------------------------

const mockUpdateProfile = vi.fn();
const mockUpdateAvatarUrl = vi.fn();
const mockUploadAvatar = vi.fn();
const mockDeleteAvatar = vi.fn();
const mockCompressImage = vi.fn(
  async (file: File) => new File([file], "compressed.webp"),
);

vi.mock("@/app/actions/user", () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  updateAvatarUrl: (...args: unknown[]) => mockUpdateAvatarUrl(...args),
}));

vi.mock("@/app/actions/avatar", () => ({
  uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
  deleteAvatar: () => mockDeleteAvatar(),
}));

vi.mock("@/lib/compressImage", () => ({
  compressImage: (file: File) => mockCompressImage(file),
}));

// Keep the locale list predictable so the select has deterministic options.
vi.mock("@/lib/i18n/locales", () => ({
  LOCALES: [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
  ],
}));

// Keep the phone-prefix list short and predictable — the component now
// imports PHONE_PREFIXES directly from the domain data layer.
vi.mock("@/domain/data/phonePrefixes", () => ({
  PHONE_PREFIXES: [
    { prefix: "+1", label: "US" },
    { prefix: "+34", label: "ES" },
  ],
}));

const { ProfileForm } =
  await import("@/app/[locale]/(app)/profile/_components/ProfileForm");

// --- Helpers --------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "alice@example.com",
    fullName: "Alice",
    avatarUrl: null,
    preferredLocale: "en",
    preferredCurrency: "usd",
    phonePrefix: null,
    phone: null,
    timezone: "UTC",
    jobTitle: null,
    pronouns: null,
    bio: null,
    isVerified: true,
    registrationMethod: "email",
    linkedProviders: [],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderForm(userOverrides: Partial<User> = {}) {
  return render(
    <ProfileForm
      user={makeUser(userOverrides)}
      timezones={["UTC", "Europe/Madrid"]}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Tests ----------------------------------------------------------------

describe("ProfileForm", () => {
  it("renders the user's email as a disabled input (server-owned field)", () => {
    renderForm({ email: "alice@example.com" });

    const email = screen.getByDisplayValue(
      "alice@example.com",
    ) as HTMLInputElement;
    expect(email).toBeDisabled();
    expect(email).toHaveAttribute("name", "email");
  });

  it("pre-fills editable fields from the user prop", () => {
    renderForm({
      fullName: "Alice Doe",
      jobTitle: "Engineer",
      bio: "Hello world",
      phonePrefix: "+34",
      phone: "612345678",
    });

    expect(screen.getByDisplayValue("Alice Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Engineer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hello world")).toBeInTheDocument();
    expect(screen.getByDisplayValue("612345678")).toBeInTheDocument();
  });

  it("disables the save button until the form becomes dirty, then enables it after any edit", async () => {
    const user = userEvent.setup();
    renderForm({ fullName: "Alice" });

    const save = screen.getByRole("button", { name: "save" });
    expect(save).toBeDisabled();

    const fullName = screen.getByDisplayValue("Alice");
    await user.type(fullName, "!");

    expect(save).toBeEnabled();
  });

  it("uploads a compressed avatar and threads the returned URL through updateAvatarUrl", async () => {
    mockUploadAvatar.mockResolvedValue({
      ok: true,
      data: { avatarUrl: "https://cdn.example.com/a.webp" },
    });
    mockUpdateAvatarUrl.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderForm();

    const file = new File(["x"], "original.png", { type: "image/png" });
    const input = screen.getByLabelText<HTMLInputElement>(/avatarUpload/);
    await user.upload(input, file);

    expect(mockCompressImage).toHaveBeenCalledWith(file);
    expect(mockUploadAvatar).toHaveBeenCalledTimes(1);
    expect(mockUpdateAvatarUrl).toHaveBeenCalledWith(
      "https://cdn.example.com/a.webp",
    );
  });

  it("renders an error banner when the avatar upload action fails", async () => {
    mockUploadAvatar.mockResolvedValue({
      ok: false,
      code: "unknown_error",
      message: "boom",
    });

    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText<HTMLInputElement>(/avatarUpload/);
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    await user.upload(input, file);

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(mockUpdateAvatarUrl).not.toHaveBeenCalled();
  });

  it("includes every supported locale in the preferredLocale select", () => {
    renderForm();

    const select = screen.getByLabelText(
      "preferredLocale",
    ) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["en", "es"]);
  });

  it("includes the supplied timezones in the timezone select", () => {
    renderForm();

    const select = screen.getByLabelText("timezone") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["UTC", "Europe/Madrid"]);
  });

  it("renders PHONE_PREFIXES in the phonePrefix select", () => {
    renderForm();

    const select = screen.getByLabelText("phonePrefix") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    // First entry is the empty/placeholder option; rest come from PHONE_PREFIXES
    // (mocked to ["+1", "+34"] above for a deterministic, short list).
    expect(values).toEqual(["", "+1", "+34"]);
  });

  it("renders the full supported-currencies list in the preferredCurrency select", () => {
    renderForm();

    const select = screen.getByLabelText(
      "preferredCurrency",
    ) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    // Sanity-pins the hardcoded currency constant so a silent drop/rename of
    // an option gets caught — the server action accepts any of these values.
    expect(values).toContain("usd");
    expect(values).toContain("eur");
    expect(values).toContain("jpy");
    expect(values.length).toBeGreaterThanOrEqual(20);
  });

  it("enforces the server-action minLength contract on fullName", () => {
    const { container } = renderForm();

    const fullName = container.querySelector(
      'input[name="fullName"]',
    ) as HTMLInputElement;
    // The server action rejects names shorter than 3 chars; the client
    // must mirror that so the browser blocks the round-trip.
    expect(fullName).toBeRequired();
    expect(fullName.getAttribute("minLength")).toBe("3");
    expect(fullName.getAttribute("maxLength")).toBe("255");
  });

  it("calls deleteAvatar and clears the URL when the user removes their avatar", async () => {
    mockDeleteAvatar.mockResolvedValue({ ok: true });
    mockUpdateAvatarUrl.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    renderForm({ avatarUrl: "https://cdn.example.com/current.webp" });

    // AvatarUpload exposes a remove affordance wired to onChange(null).
    const removeButton = screen.getByRole("button", { name: /avatarRemove/i });
    await user.click(removeButton);

    expect(mockDeleteAvatar).toHaveBeenCalledTimes(1);
    expect(mockUpdateAvatarUrl).toHaveBeenCalledWith(null);
    // Upload path must not fire on remove.
    expect(mockUploadAvatar).not.toHaveBeenCalled();
    expect(mockCompressImage).not.toHaveBeenCalled();
  });

  it("renders an error banner when avatar deletion fails and leaves avatarUrl untouched", async () => {
    mockDeleteAvatar.mockResolvedValue({
      ok: false,
      code: "unknown_error",
      message: "delete failed",
    });

    const user = userEvent.setup();
    renderForm({ avatarUrl: "https://cdn.example.com/current.webp" });

    const removeButton = screen.getByRole("button", { name: /avatarRemove/i });
    await user.click(removeButton);

    expect(await screen.findByText("delete failed")).toBeInTheDocument();
    // If the API call failed, we must NOT persist a null avatarUrl.
    expect(mockUpdateAvatarUrl).not.toHaveBeenCalled();
  });
});
