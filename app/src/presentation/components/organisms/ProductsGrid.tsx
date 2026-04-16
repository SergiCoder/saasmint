import type { Product } from "@/domain/models/Product";
import { formatCurrency } from "@/lib/formatCurrency";

export interface ProductsGridProps {
  title: string;
  products: Product[];
  productNames?: Record<number, string>;
  creditsLabel: string;
  locale: string;
  renderCta: (product: Product) => React.ReactNode;
  className?: string;
}

export function ProductsGrid({
  title,
  products,
  productNames,
  creditsLabel,
  locale,
  renderCta,
  className = "",
}: ProductsGridProps) {
  if (products.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900">
              {productNames?.[product.credits] ?? product.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {product.credits} {creditsLabel}
            </p>
            {product.price && (
              <>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    product.price.displayAmount,
                    product.price.currency,
                    locale,
                  )}
                </p>
                <div className="mt-4">{renderCta(product)}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
