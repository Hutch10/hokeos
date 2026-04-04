"use client";

import { useTransition } from "react";
import { resolveInvestigationAction, dismissInvestigationAction } from "./actions";
import { Button } from "@/components/ui/button";

interface ResolutionActionsProps {
  investigationId: string;
  isMock: boolean;
  status: string;
}

/**
 * Phase 34: Resolution UI
 * High-fidelity control suite for administrative case closing.
 */
export function ResolutionActions({ investigationId, isMock, status }: ResolutionActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (status === "resolved" || status === "archived") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
        <p className="text-sm font-medium text-zinc-600 italic">
          This case is {status === "resolved" ? "Resolved" : "Archived"} and closed for further modification.
        </p>
      </div>
    );
  }

  const handleResolve = (resolution: "verified" | "adjusted") => {
    startTransition(async () => {
      try {
        await resolveInvestigationAction(investigationId, resolution, isMock);
        // Toast handled by the ActionToast component below if we add temporary state or just rely on revalidation
      } catch (err) {
        console.error("Resolution failed:", err);
      }
    });
  };

  const handleDismiss = () => {
    startTransition(async () => {
      try {
        await dismissInvestigationAction(investigationId, isMock);
      } catch (err) {
        console.error("Dismissal failed:", err);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-100 bg-emerald-50/20 p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-900">Case Resolution</h3>
        <p className="text-xs text-emerald-700/70">Finalize the settlement lifecycle for linked batches.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          onClick={() => handleResolve("verified")}
          disabled={isPending}
          variant="default"
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all"
        >
          {isPending ? "Processing..." : "Verify & Settle"}
        </Button>
        <Button
          onClick={() => handleResolve("adjusted")}
          disabled={isPending}
          variant="outline"
          className="border-amber-200 bg-white text-amber-700 hover:bg-amber-50 shadow-sm active:scale-95 transition-all"
        >
          {isPending ? "..." : "Resolve with Adjustments"}
        </Button>
      </div>

      <Button
        onClick={handleDismiss}
        disabled={isPending}
        variant="outline"
        className="w-full text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 text-xs mt-2 border-transparent"
      >
        Dismiss (Archive Case)
      </Button>

      {/* Implicit status change toast handled by root listener, but we can add immediate feedback here if needed */}
    </div>
  );
}
