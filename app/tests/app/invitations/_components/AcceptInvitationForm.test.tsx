import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAcceptInvitation = vi.fn();
vi.mock("@/app/actions/invitation", () => ({
  // Thunk, not a direct reference: vi.mock is hoisted to the top of the
  // file, so the factory runs before `mockAcceptInvitation` is initialized.
  acceptInvitation: (...args: unknown[]) => mockAcceptInvitation(...args),
}));

import { AcceptInvitationForm } from "@/app/[locale]/(public)/invitations/[token]/_components/AcceptInvitationForm";

const FULL_NAME = "Jane Doe";
const PASSWORD = "hunter22long";

function setup(token = "tok-abc") {
  return render(<AcceptInvitationForm token={token} />);
}

async function fillAndSubmit(
  container: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(
    container.querySelector<HTMLInputElement>('input[name="fullName"]')!,
    FULL_NAME,
  );
  await user.type(
    container.querySelector<HTMLInputElement>('input[name="password"]')!,
    PASSWORD,
  );
  await user.click(screen.getByRole("button", { name: /.+/ }));
}

beforeEach(() => {
  mockAcceptInvitation.mockReset();
});

describe("AcceptInvitationForm", () => {
  describe("structure", () => {
    it("renders the hidden token input with the provided token", () => {
      const { container } = setup("tok-abc");
      const hidden = container.querySelector<HTMLInputElement>(
        'input[type="hidden"][name="token"]',
      );
      expect(hidden?.value).toBe("tok-abc");
    });

    it("renders fullName + password inputs and a submit button", () => {
      const { container } = setup();
      expect(container.querySelector('input[name="fullName"]')).toBeRequired();
      expect(container.querySelector('input[name="password"]')).toHaveAttribute(
        "type",
        "password",
      );
      expect(screen.getByRole("button", { name: /.+/ })).toHaveAttribute(
        "type",
        "submit",
      );
    });
  });

  describe("submission flow", () => {
    it("calls acceptInvitation with the submitted form data on submit", async () => {
      mockAcceptInvitation.mockResolvedValue({ ok: true });

      const user = userEvent.setup();
      const { container } = setup("tok-abc");
      await fillAndSubmit(container, user);

      await waitFor(() => {
        expect(mockAcceptInvitation).toHaveBeenCalledTimes(1);
      });

      const [, formData] = mockAcceptInvitation.mock.calls[0]!;
      expect(formData.get("token")).toBe("tok-abc");
      expect(formData.get("fullName")).toBe(FULL_NAME);
      expect(formData.get("password")).toBe(PASSWORD);
    });

    it("renders an error banner with the server-provided message on failure", async () => {
      mockAcceptInvitation.mockResolvedValue({
        ok: false,
        code: "HTTP_400",
        message: "Invitation already used",
      });

      const user = userEvent.setup();
      const { container } = setup();
      await fillAndSubmit(container, user);

      expect(
        await screen.findByText("Invitation already used"),
      ).toBeInTheDocument();
    });

    it("falls back to the unknown_error translation when the server returns a bare code with no message", async () => {
      mockAcceptInvitation.mockResolvedValue({ ok: false, code: "HTTP_500" });

      const user = userEvent.setup();
      const { container } = setup();
      await fillAndSubmit(container, user);

      expect(await screen.findByText("unknown_error")).toBeInTheDocument();
    });

    it("does not render an error banner on success", async () => {
      mockAcceptInvitation.mockResolvedValue({ ok: true });

      const user = userEvent.setup();
      const { container } = setup();
      await fillAndSubmit(container, user);

      await waitFor(() => {
        expect(mockAcceptInvitation).toHaveBeenCalled();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
