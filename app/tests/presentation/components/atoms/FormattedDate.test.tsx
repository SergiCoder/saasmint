import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormattedDate } from "@/presentation/components/atoms/FormattedDate";

describe("FormattedDate", () => {
  it("renders a span element", () => {
    const { container } = render(
      <FormattedDate iso="2030-01-15T12:34:56Z" locale="en-US" />,
    );
    expect(container.querySelector("span")).not.toBeNull();
  });

  it("formats the date with Intl.DateTimeFormat using the given locale and UTC tz", () => {
    render(<FormattedDate iso="2030-01-15T12:34:56Z" locale="en-US" />);

    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date("2030-01-15T12:34:56Z"));

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("honours the dateStyle prop", () => {
    render(
      <FormattedDate
        iso="2030-01-15T12:34:56Z"
        locale="en-US"
        dateStyle="long"
      />,
    );

    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date("2030-01-15T12:34:56Z"));

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("honours a custom timeZone prop", () => {
    render(
      <FormattedDate
        iso="2030-01-15T23:30:00Z"
        locale="en-US"
        timeZone="America/New_York"
      />,
    );

    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: "America/New_York",
    }).format(new Date("2030-01-15T23:30:00Z"));

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("falls back to the ISO prefix when the date is invalid", () => {
    render(<FormattedDate iso="not-a-date" locale="en-US" />);
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
  });
});
