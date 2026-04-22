import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Override the default next-intl mock from tests/setup.ts so this test can
// control the messages map and translator behavior independently.
const mockT = vi.fn((key: string) => `T:${key}`);
const mockMessages = vi.fn(() => ({}) as Record<string, unknown>);

vi.mock("next-intl", () => ({
  useTranslations: () => mockT,
  useMessages: () => mockMessages(),
}));

import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import type { ActionErr } from "@/lib/actions/ActionResult";

function Probe({ err }: { err: ActionErr }) {
  const getMessage = useActionErrorMessage();
  return <span data-testid="msg">{getMessage(err)}</span>;
}

beforeEach(() => {
  mockT.mockClear();
  mockMessages.mockReset();
  mockMessages.mockReturnValue({});
});

describe("useActionErrorMessage", () => {
  it("prefers the server-provided message when set, bypassing translations", () => {
    mockMessages.mockReturnValue({
      actionErrors: { invalid_input: "Please fix the fields" },
    });

    render(
      <Probe
        err={{ ok: false, code: "invalid_input", message: "Custom override" }}
      />,
    );

    expect(screen.getByTestId("msg")).toHaveTextContent("Custom override");
    expect(mockT).not.toHaveBeenCalled();
  });

  it("translates the error code when present in the actionErrors namespace", () => {
    mockMessages.mockReturnValue({
      actionErrors: { session_expired: "..." },
    });

    render(<Probe err={{ ok: false, code: "session_expired" }} />);

    expect(screen.getByTestId("msg")).toHaveTextContent("T:session_expired");
    expect(mockT).toHaveBeenCalledWith("session_expired");
  });

  it("falls back to unknown_error when the code is not in the namespace", () => {
    mockMessages.mockReturnValue({
      actionErrors: { session_expired: "..." },
    });

    render(<Probe err={{ ok: false, code: "HTTP_999" }} />);

    expect(screen.getByTestId("msg")).toHaveTextContent("T:unknown_error");
    expect(mockT).toHaveBeenCalledWith("unknown_error");
  });

  it("falls back to unknown_error when the actionErrors namespace is absent", () => {
    // No actionErrors key on messages.
    mockMessages.mockReturnValue({});

    render(<Probe err={{ ok: false, code: "anything" }} />);

    expect(screen.getByTestId("msg")).toHaveTextContent("T:unknown_error");
  });

  it("treats an empty message as absent and falls through to translation", () => {
    mockMessages.mockReturnValue({
      actionErrors: { bad: "..." },
    });

    render(<Probe err={{ ok: false, code: "bad", message: "" }} />);

    expect(screen.getByTestId("msg")).toHaveTextContent("T:bad");
  });
});
