export interface LogoCloudProps {
  label: string;
  logos: string[];
  className?: string;
}

export function LogoCloud({ label, logos, className = "" }: LogoCloudProps) {
  return (
    <section className={`border-y border-gray-200 bg-white py-10 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-7 text-center text-xs font-medium tracking-widest text-gray-400 uppercase">
          {label}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {logos.map((name) => (
            <span
              key={name}
              className="text-base font-bold tracking-tight text-gray-300 transition-opacity hover:opacity-100"
              style={{ opacity: 0.6 }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
