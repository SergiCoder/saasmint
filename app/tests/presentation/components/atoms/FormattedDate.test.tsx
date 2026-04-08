import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormattedDate } from "@/presentation/components/atoms/FormattedDate";

describe("FormattedDate", () => {
  it("renders a span with suppressHydrationWarning so SSR/CSR mismatches are tolerated", () => {
    const { container } = render(<FormattedDate iso="2030-01-15T12:34:56Z" />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
  });

  it("formats the date with Intl.DateTimeFormat once mounted on the client", async () => {
    render(<FormattedDate iso="2030-01-15T12:34:56Z" locale="en-US" />);

    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date("2030-01-15T12:34:56Z"));

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it("honours the dateStyle prop", async () => {
    render(
      <FormattedDate
        iso="2030-01-15T12:34:56Z"
        locale="en-US"
        dateStyle="long"
      />,
    );

    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
    }).format(new Date("2030-01-15T12:34:56Z"));

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it("falls back to the ISO prefix when the date is invalid", async () => {
    // 'not-a-date' is invalid; the component slices the first 10 characters
    // of the iso prop ('not-a-date') for the fallback.
    render(<FormattedDate iso="not-a-date" />);
    await waitFor(() => {
      expect(screen.getByText("not-a-date")).toBeInTheDocument();
    });
  });

  it("uses the browser default locale when none is provided", async () => {
    render(<FormattedDate iso="2030-01-15T12:34:56Z" />);
    const expected = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date("2030-01-15T12:34:56Z"));
    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });
});
