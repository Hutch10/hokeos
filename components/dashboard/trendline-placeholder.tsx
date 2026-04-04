import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TrendlinePlaceholderProps = {
  title: string;
  description: string;
};

export function TrendlinePlaceholder({ title, description }: TrendlinePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">
          Chart placeholder. Wire charting in a future iteration.
        </div>
      </CardContent>
    </Card>
  );
}
