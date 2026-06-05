import { MetricCard } from "../molecules/MetricCard";

export interface DashboardMockActivity {
  icon: React.ReactNode;
  text: React.ReactNode;
  time: string;
}

export interface DashboardMockProps {
  url: string;
  metrics: { title: string; value: string; change?: string }[];
  chartLabel: string;
  chartBars: number[];
  activities: DashboardMockActivity[];
  className?: string;
}

export function DashboardMock({
  url,
  metrics,
  chartLabel,
  chartBars,
  activities,
  className = "",
}: DashboardMockProps) {
  const maxBar = chartBars.length > 0 ? Math.max(...chartBars) : 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg ${className}`}
    >
      {/* Browser bar */}
      <div className="flex items-center gap-2.5 border-b border-gray-200 bg-gray-100 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
        </div>
        <div className="flex-1 rounded border border-gray-200 bg-white px-2.5 py-1 font-mono text-xs text-gray-400">
          {url}
        </div>
      </div>

      <div className="space-y-2.5 p-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          {metrics.map((m) => (
            <MetricCard
              key={m.title}
              title={m.title}
              value={m.value}
              change={
                m.change ? { value: m.change, positive: true } : undefined
              }
              compact
            />
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="mb-2 text-xs font-medium text-gray-400">{chartLabel}</p>
          <div className="flex items-end gap-1" style={{ height: 48 }}>
            {chartBars.map((value, i) => (
              <div
                key={i}
                className="bg-primary-400 flex-1 rounded-t"
                style={{
                  height: `${maxBar > 0 ? (value / maxBar) * 100 : 0}%`,
                  opacity: value === maxBar ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="space-y-2.5 rounded-lg border border-gray-200 bg-white p-3">
          {activities.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs">
                {a.icon}
              </div>
              <span className="flex-1 text-gray-900">{a.text}</span>
              <span className="text-gray-400">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
