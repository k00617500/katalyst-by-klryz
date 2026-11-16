"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";

type ChartType = "bar" | "line" | "pie";

const PALETTE = ["#A4DD00", "#98CD00", "#B6F500", "#4c6900", "#5a7600", "#7a9a2e"];

const TYPE_ICON: Record<ChartType, React.ElementType> = {
  bar: BarChart3,
  line: LineIcon,
  pie: PieIcon,
};

function ChartTypeToggle({ value, onChange }: { value: ChartType; onChange: (t: ChartType) => void }) {
  return (
    <div className="flex gap-1">
      {(["bar", "line", "pie"] as const).map((type) => {
        const Icon = TYPE_ICON[type];
        return (
          <button
            key={type}
            type="button"
            title={type}
            onClick={() => onChange(type)}
            className={`flex size-6 items-center justify-center rounded transition-colors ${
              value === type ? "bg-brand/15 text-brand-ink" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export function AnalyticsChart({
  title,
  data,
  defaultType = "bar",
  valueLabel = "value",
}: {
  title: string;
  data: { label: string; value: number }[];
  defaultType?: ChartType;
  valueLabel?: string;
}) {
  const [type, setType] = useState<ChartType>(defaultType);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
        <ChartTypeToggle value={type} onChange={setType} />
      </div>
      <div className="rounded-lg border border-border p-3" style={{ height: 220 }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No data for this range yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }}
                  formatter={(v) => [v, valueLabel] as [number, string]}
                />
                <Bar dataKey="value" fill="var(--brand)" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }}
                  formatter={(v) => [v, valueLabel] as [number, string]}
                />
                <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <PieChart>
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }}
                  formatter={(v) => [v, valueLabel] as [number, string]}
                />
                <Pie data={data} dataKey="value" nameKey="label" outerRadius={80} label={{ fontSize: 10 }}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
