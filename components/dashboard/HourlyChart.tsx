"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardLabel } from "@/components/ui/Card";
import { formatNaira } from "@/lib/format";
import type { DashboardSnapshot } from "@/types";

interface HourlyChartProps {
  data: DashboardSnapshot["hourly"];
}

export function HourlyChart({ data }: HourlyChartProps) {
  const chartData = data.map((d) => ({
    label: new Date(d.hour).toLocaleTimeString("en-NG", {
      hour: "numeric",
      hour12: true,
      timeZone: "Africa/Lagos",
    }),
    count: d.count,
    revenue: d.revenue,
  }));

  const peak = Math.max(...chartData.map((d) => d.count), 0);

  return (
    <Card className="h-[280px] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <CardLabel>Sales · last 24h</CardLabel>
          <p className="text-stamp-muted text-xs mt-1">
            Peak: {peak} ticket{peak === 1 ? "" : "s"} / hour
          </p>
        </div>
      </div>

      <div className="flex-1 -mx-2 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="stamp-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF5C1A" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#FF5C1A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              stroke="#6B6B8A"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6B6B8A"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "#252538", strokeWidth: 1 }}
              contentStyle={{
                background: "#14141F",
                border: "1px solid #252538",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#6B6B8A" }}
              formatter={(value: number, name: string) => {
                if (name === "count") return [`${value} tickets`, "Sold"];
                return [formatNaira(value), "Revenue"];
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#FF5C1A"
              strokeWidth={2}
              fill="url(#stamp-area)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
