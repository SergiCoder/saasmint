import { Badge } from "../atoms/Badge";

export interface InvoiceRow {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "open" | "void" | "uncollectible";
  statusLabel: string;
  actions?: React.ReactNode;
}

const statusVariant = {
  paid: "success",
  open: "info",
  void: "warning",
  uncollectible: "error",
} as const;

export interface InvoiceTableProps {
  invoices: InvoiceRow[];
  columns: { date: string; amount: string; status: string; actions: string };
  className?: string;
}

export function InvoiceTable({
  invoices,
  columns,
  className = "",
}: InvoiceTableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.date}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.amount}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.status}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
              {columns.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                {invoice.date}
              </td>
              <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                {invoice.amount}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={statusVariant[invoice.status]}>
                  {invoice.statusLabel}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                {invoice.actions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
