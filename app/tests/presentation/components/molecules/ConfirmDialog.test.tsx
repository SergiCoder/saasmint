import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRef } from "react";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

const defaultProps = {
  title: "Confirm action",
  body: "Are you sure you want to proceed?",
  confirmLabel: "Yes",
  cancelLabel: "No",
  onConfirm: vi.fn(),
};

function Wrapper(
  props: Partial<typeof defaultProps> & {
    onClose?: () => void;
    loading?: boolean;
  },
) {
  const ref = useRef<ConfirmDialogHandle>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.open()}>
        Open
      </button>
      <button type="button" onClick={() => ref.current?.close()}>
        Close externally
      </button>
      <ConfirmDialog ref={ref} {...defaultProps} {...props} />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConfirmDialog", () => {
  it("does not render content when closed", () => {
    render(<Wrapper />);
    expect(screen.queryByText("Confirm action")).not.toBeInTheDocument();
  });

  it("renders title, body, and buttons when opened via ref", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByText("Confirm action")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to proceed?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes and calls onClose when cancel button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Confirm action")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "No" }));

    expect(screen.queryByText("Confirm action")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes and calls onClose when close() is called via ref", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Confirm action")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close externally" }));

    expect(screen.queryByText("Confirm action")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables cancel button when loading is true", async () => {
    const user = userEvent.setup();
    render(<Wrapper loading />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("button", { name: "No" })).toBeDisabled();
  });

  it("uses the danger variant by default", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole("button", { name: "Open" }));

    const confirmBtn = screen.getByRole("button", { name: "Yes" });
    expect(confirmBtn.className).toMatch(/red|danger/);
  });
});
