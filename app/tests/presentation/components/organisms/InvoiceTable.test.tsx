import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InvoiceTable } from "@/presentation/components/organisms";

const columns = {
  date: "Date",
  amount: "Amount",
  status: "Status",
  actions: "Actions",
};

const invoices = [
  {
    id: "inv_1",
    date: "Jan 1, 2027",
    amount: "$29.00",
    status: "paid" as const,
    statusLabel: "Paid",
  },
  {
    id: "inv_2",
    date: "Feb 1, 2027",
    amount: "$29.00",
    status: "open" as const,
    statusLabel: "Open",
    actions: <a href="/invoice/inv_2">Download</a>,
  },
  {
    id: "inv_3",
    date: "Mar 1, 2027",
    amount: "$0.00",
    status: "void" as const,
    statusLabel: "Void",
  },
  {
    id: "inv_4",
    date: "Apr 1, 2027",
    amount: "$29.00",
    status: "uncollectible" as const,
    statusLabel: "Uncollectible",
  },
];

describe("InvoiceTable", () => {
  it("renders column headers", () => {
    render(<InvoiceTable invoices={invoices} columns={columns} />);
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders all invoice rows", () => {
    render(<InvoiceTable invoices={invoices} columns={columns} />);
    expect(screen.getByText("Jan 1, 2027")).toBeInTheDocument();
    expect(screen.getByText("Feb 1, 2027")).toBeInTheDocument();
    expect(screen.getByText("Mar 1, 2027")).toBeInTheDocument();
    expect(screen.getByText("Apr 1, 2027")).toBeInTheDocument();
  });

  it("renders invoice amounts", () => {
    render(<InvoiceTable invoices={invoices} columns={columns} />);
    const amounts = screen.getAllByText("$29.00");
    expect(amounts.length).toBe(3);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  describe("status badge variants", () => {
    it("maps paid status to success badge", () => {
      render(<InvoiceTable invoices={invoices} columns={columns} />);
      const badge = screen.getByText("Paid");
      expect(badge.className).toContain("bg-green-50");
    });

    it("maps open status to info badge", () => {
      render(<InvoiceTable invoices={invoices} columns={columns} />);
      const badge = screen.getByText("Open");
      expect(badge.className).toContain("bg-blue-50");
    });

    it("maps void status to warning badge", () => {
      render(<InvoiceTable invoices={invoices} columns={columns} />);
      const badge = screen.getByText("Void");
      expect(badge.className).toContain("bg-yellow-50");
    });

    it("maps uncollectible status to error badge", () => {
      render(<InvoiceTable invoices={invoices} columns={columns} />);
      const badge = screen.getByText("Uncollectible");
      expect(badge.className).toContain("bg-red-50");
    });
  });

  it("renders invoice actions when provided", () => {
    render(<InvoiceTable invoices={invoices} columns={columns} />);
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Download")).toHaveAttribute(
      "href",
      "/invoice/inv_2",
    );
  });

  it("renders empty table when no invoices", () => {
    render(<InvoiceTable invoices={[]} columns={columns} />);
    expect(screen.getByText("Date")).toBeInTheDocument();
    const tbody = screen
      .getByText("Date")
      .closest("table")
      ?.querySelector("tbody");
    expect(tbody?.children.length).toBe(0);
  });

  it("applies custom className", () => {
    const { container } = render(
      <InvoiceTable invoices={invoices} columns={columns} className="mt-6" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("mt-6");
  });
});
