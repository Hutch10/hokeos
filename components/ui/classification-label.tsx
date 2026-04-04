import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      type: {
        canonical:
          "border-transparent bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
        statistical:
          "border-transparent bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
        fallback:
          "border-transparent bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
        hardware:
          "border-transparent bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
      },
    },
    defaultVariants: {
      type: "canonical",
    },
  }
)

export interface ClassificationLabelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof labelVariants> {}

function ClassificationLabel({ className, type, ...props }: ClassificationLabelProps) {
  const labelText = {
    canonical: "Canonical Source",
    statistical: "Statistical Advisory",
    fallback: "Degraded: Fallback",
    hardware: "Hardware Verified",
  }[type ?? "canonical"]

  return (
    <div className={cn(labelVariants({ type }), className)} {...props}>
      {labelText}
    </div>
  )
}

export { ClassificationLabel, labelVariants }
