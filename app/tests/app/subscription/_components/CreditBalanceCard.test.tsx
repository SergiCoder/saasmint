import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CreditBalanceCard } from "@/app/[locale]/(app)/subscription/_components/CreditBalanceCard";

const baseProps = {
  eyebrowLabel: "Credit balance",
  balance: 1234,
  unitLabel: "credits",
  description: "Credits attached to your account.",
  scopeBadge: "Personal",
  locale: "en",
};

describe("CreditBalanceCard", () => {
  it("renders the eyebrow, formatted balance, unit, description, and scope badge", () => {
    render(<CreditBalanceCard {...baseProps} />);

    expect(screen.getByText("Credit balance")).toBeInTheDocument();
    // 1234 → "1,234" under en locale (Intl.NumberFormat).
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("credits")).toBeInTheDocument();
    expect(
      screen.getByText("Credits attached to your account."),
    ).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("renders zero as a real number, not as a falsy blank", () => {
    render(<CreditBalanceCard {...baseProps} balance={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("formats the balance using the supplied locale", () => {
    // de-DE uses dot as thousand separator → "1.234".
    render(<CreditBalanceCard {...baseProps} locale="de-DE" />);
    expect(screen.getByText("1.234")).toBeInTheDocument();
  });
});
