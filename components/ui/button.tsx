import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
  size?: "default" | "lg" | "xl" | "sm";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-cyan-600 text-white hover:bg-cyan-700",
          variant === "outline" && "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100",
          size === "lg" && "h-11 px-8 text-base",
          size === "xl" && "h-14 px-10 text-lg font-bold tracking-tight",
          size === "sm" && "h-8 px-3 text-xs",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
