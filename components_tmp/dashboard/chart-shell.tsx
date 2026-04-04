"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { createElement } from "react";
import type { ComponentType, ReactNode } from "react";

type ChartModule<P> = {
  default: ComponentType<P>;
};

type ChartShellProps<P> = {
  ChartComponent: ComponentType<P>;
  chartProps: P;
  heightClassName?: string;
  render?: (ChartComponent: ComponentType<P>) => ReactNode;
};

function DefaultFallback({ heightClassName }: { heightClassName: string }) {
  return (
    <div
      className={`animate-pulse rounded-md border border-zinc-200 bg-zinc-50 ${heightClassName}`}
      aria-label="Loading chart"
    />
  );
}

export function ChartShell<P>({
  ChartComponent,
  chartProps,
  heightClassName = "h-80",
  render,
}: ChartShellProps<P>) {
  return (
    <div className={heightClassName}>
      {render
        ? render(ChartComponent)
        : createElement(ChartComponent as ComponentType<object>, chartProps as object)}
    </div>
  );
}
