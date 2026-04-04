import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardMetricCardProps = {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  confidence?: number;
};

export function DashboardMetricCard({
  label,
  value,
  tone = "default",
  confidence,
}: DashboardMetricCardProps) {
  const valueClassName =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-600"
        : "text-zinc-900";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {label}
          </CardTitle>
          {confidence !== undefined && (
            <div 
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                confidence > 80 ? "bg-emerald-500" : confidence > 40 ? "bg-amber-500" : "bg-rose-500"
              )} 
              title={`Trust Score: ${confidence}%`}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
           <p className={cn("text-2xl font-semibold tracking-tight", valueClassName)}>
             {value}
           </p>
           {confidence !== undefined && confidence < 80 && (
             <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">
               Low Confidence
             </span>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
