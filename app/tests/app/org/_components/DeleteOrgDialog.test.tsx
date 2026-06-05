import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDeleteOrg = vi.fn();
vi.mock("@/app/actions/org", () => ({
  deleteOrg: (...args: unknown[]) => mockDeleteOrg(...args),
}));

const mockReplace = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

import { DeleteOrgDialog } from "@/app/[locale]/(app)/org/[slug]/_components/DeleteOrgDialog";

const ORG_ID = "org_1";
const ORG_NAME = "Acme Inc";

beforeEach(() => {
  mockDeleteOrg.mockReset();
  mockReplace.mockReset();
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
});

describe("DeleteOrgDialog", () => {
  it("renders the trigger button", () => {
    render(<DeleteOrgDialog orgId={ORG_ID} orgName={ORG_NAME} />);
    expect(
      screen.getByRole("button", { name: "deleteOrg" }),
    ).toBeInTheDocument();
  });

  it("opens the dialog when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteOrgDialog orgId={ORG_ID} orgName={ORG_NAME} />);

    await user.click(screen.getByRole("button", { name: "deleteOrg" }));

    expect(screen.getByText("deleteOrgDialogTitle")).toBeInTheDocument();
    expect(screen.getByText("deleteOrgDialogDescription")).toBeInTheDocument();
  });

  it("shows a mismatch error when the typed name differs from the org name", async () => {
    const user = userEvent.setup();
    render(<DeleteOrgDialog orgId={ORG_ID} orgName={ORG_NAME} />);

    await user.click(screen.getByRole("button", { name: "deleteOrg" }));
    await user.type(
      screen.getByLabelText(/deleteOrgDialogLabel/),
      "Wrong Name",
    );
    await user.click(
      screen.getByRole("button", { name: "deleteOrgDialogSubmit" }),
    );

    expect(screen.getByText("deleteOrgDialogMismatch")).toBeInTheDocument();
    expect(mockDeleteOrg).not.toHaveBeenCalled();
  });

  it("calls deleteOrg with the orgId and redirects on success", async () => {
    mockDeleteOrg.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<DeleteOrgDialog orgId={ORG_ID} orgName={ORG_NAME} />);

    await user.click(screen.getByRole("button", { name: "deleteOrg" }));
    await user.type(screen.getByLabelText(/deleteOrgDialogLabel/), ORG_NAME);
    await user.click(
      screen.getByRole("button", { name: "deleteOrgDialogSubmit" }),
    );

    await waitFor(() => {
      expect(mockDeleteOrg).toHaveBeenCalledTimes(1);
    });
    const [, formData] = mockDeleteOrg.mock.calls[0] ?? [];
    expect((formData as FormData).get("orgId")).toBe(ORG_ID);
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("displays the translated error and does not redirect when deleteOrg fails", async () => {
    mockDeleteOrg.mockResolvedValueOnce({
      ok: false,
      code: "unknown_error",
    });
    const user = userEvent.setup();
    render(<DeleteOrgDialog orgId={ORG_ID} orgName={ORG_NAME} />);

    await user.click(screen.getByRole("button", { name: "deleteOrg" }));
    await user.type(screen.getByLabelText(/deleteOrgDialogLabel/), ORG_NAME);
    await user.click(
      screen.getByRole("button", { name: "deleteOrgDialogSubmit" }),
    );

    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("disables the submit button until the user types something", async () => {
    const user = userEvent.setup();
    render(<DeleteOrgDialog orgId={ORG_ID} orgName={ORG_NAME} />);

    await user.click(screen.getByRole("button", { name: "deleteOrg" }));
    const submit = screen.getByRole("button", {
      name: "deleteOrgDialogSubmit",
    });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/deleteOrgDialogLabel/), "x");
    expect(submit).not.toBeDisabled();
  });
});
