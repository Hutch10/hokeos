"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type HeatmapPoint = {
  id: string;
  netValue: number;
  marginPct: number;
  confidenceScore: number;
  metalType: string;
  isDegraded: boolean;
};

type PerformanceHeatmapProps = {
  data: HeatmapPoint[];
};

const toCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: HeatmapPoint }[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as HeatmapPoint;
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Batch {data.id.slice(0, 8)}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500">Volume:</span>
            <span className="text-xs font-semibold text-zinc-900">{toCurrency(data.netValue)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500">Yield:</span>
            <span className="text-xs font-semibold text-zinc-900">{data.marginPct.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-zinc-50">
            <span className="text-xs text-zinc-500">Confidence:</span>
            <span className={`text-[10px] font-bold uppercase ${
              data.confidenceScore >= 90 ? "text-emerald-600" :
              data.confidenceScore >= 60 ? "text-amber-600" : "text-rose-600"
            }`}>
              {data.confidenceScore}% {data.isDegraded ? "(Degraded)" : ""}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function PerformanceHeatmap({ data }: PerformanceHeatmapProps) {
  const sortedData = useMemo(() => [...data].sort((a, b) => a.netValue - b.netValue), [data]);

  if (data.length === 0) {
    return (
      <Card className="flex h-64 items-center justify-center bg-zinc-50/50">
        <p className="text-sm text-zinc-500">Insufficient batch volume for strategy clustering.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-zinc-200 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="border-b border-zinc-50 bg-white/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold tracking-tight text-zinc-900">Yield Strategy Heatmap</CardTitle>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            v1.3.3 Cluster Model
          </span>
        </div>
        <CardDescription className="text-xs text-zinc-500">
          Strategic mapping of transaction volume (X) vs. efficiency yield (Y). 
          Color depth correlates with Trust-Layer Confidence Score.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 w-full px-4 pt-6 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis
                type="number"
                dataKey="netValue"
                name="Volume"
                unit=" USD"
                tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                stroke="#a1a1aa"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="marginPct"
                name="Yield"
                unit="%"
                stroke="#a1a1aa"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis type="number" dataKey="confidenceScore" range={[60, 400]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#d4d4d8' }} />
              <Scatter name="Yield Strategies" data={sortedData}>
                {sortedData.map((entry, index) => {
                  let color = "#10b981"; // Emerald-500
                  if (entry.confidenceScore < 60) color = "#ef4444"; // Rose-500
                  else if (entry.confidenceScore < 90) color = "#f59e0b"; // Amber-500
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={color} 
                      fillOpacity={0.6}
                      stroke={color}
                      strokeWidth={1}
                      className="transition-all duration-300 hover:fill-opacity-100 cursor-crosshair"
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex items-center justify-center gap-6 border-t border-zinc-50 bg-zinc-50/30 py-3">
           <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-tighter">High Trust (90+)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-amber-500" />
             <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-tighter">Medium Trust (60-89)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-rose-500" />
             <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-tighter">Degraded Mode (&lt;60)</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
