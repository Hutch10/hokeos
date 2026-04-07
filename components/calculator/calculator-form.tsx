"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { MetalPrices } from "@/lib/metals/pricing-service";

import { TagSelector } from "@/components/tags/tag-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  batchApiResponseSchema,
  calculatorApiRequestSchema,
  calculatorApiResponseSchema,
  calculatorInputSchema,
  type CalculatorApiRequest,
  type CalculatorInput,
  type CalculatorOutput,
  targetMetalOptions,
} from "@/lib/validations/calculator";

import { Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSerialScale } from "@/hooks/use-serial-scale";
import { sovereignDB } from "@/lib/offline/storage";
import { calculate } from "@/lib/metals/calculator-service";
import { ResultsCards } from "./results-cards";

type CalculatorFormValues = z.input<typeof calculatorInputSchema>;

type FormState = {
  isSavingBatch: boolean;
  submitError: string | null;
  saveError: string | null;
  saveSuccess: string | null;
};

export function CalculatorForm() {
  const [result, setResult] = useState<CalculatorOutput | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [lastCalculatedPayload, setLastCalculatedPayload] = useState<CalculatorApiRequest | null>(
    null,
  );
  const [formState, setFormState] = useState<FormState>({
    isSavingBatch: false,
    submitError: null,
    saveError: null,
    saveSuccess: null,
  });

  const [isUsingStalePrices, setIsUsingStalePrices] = useState(false);
  const [staleTimestamp, setStaleTimestamp] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => 
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const form = useForm<CalculatorFormValues, undefined, CalculatorInput>({
    resolver: zodResolver(calculatorInputSchema),
    defaultValues: {
      materialType: "",
      targetMetal: "gold",
      startingWeightGrams: 1,
      estimatedPurityPercent: 99.9,
      processCostUsd: 0,
      recoveryRateOverride: "",
      customerName: "",
      customerEmail: "",
      customerReference: "",
    },
  });

  const { reading, isConnected, isConnecting, error: scaleError, connect, disconnect } = useSerialScale();

  const [isHardwareVerified, setIsHardwareVerified] = useState(false);
  const [hardwareDeviceId, setHardwareDeviceId] = useState<string | undefined>(undefined);

  // Auto-populate weight when stable and connected
  useEffect(() => {
    if (reading?.isStable && isConnected && !isHardwareVerified) {
      const timer = setTimeout(() => {
        form.setValue("startingWeightGrams", reading.weight);
        setIsHardwareVerified(true);
        setHardwareDeviceId(reading.deviceId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [reading?.isStable, reading?.weight, reading?.deviceId, isConnected, form, isHardwareVerified]);

  async function onSubmit(values: CalculatorInput) {
    setFormState((prev) => ({ ...prev, submitError: null, saveError: null, saveSuccess: null }));

    const calculatorPayload = calculatorApiRequestSchema.parse({
      metalType: values.targetMetal,
      weight: values.startingWeightGrams,
      weightUnit: "g",
      purityPct: values.estimatedPurityPercent,
      recoveryRatePct: values.recoveryRateOverride ?? 100,
      acquisitionCostUsd: values.processCostUsd,
      formulaVersion: "v1",
      isHardwareVerified,
      hardwareDeviceId,
    });

    const response = await fetch("/api/calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calculatorPayload),
    });

    const json = await response.json().catch(() => ({ error: "FETCH_FAILED" }));

    // Phase 2: Sovereign Offline Fallback
    if (json.error === "OFFLINE_MODE_ACTIVE" || json.error === "FETCH_FAILED") {
      const cached = await sovereignDB.getCachedPrices();
      if (cached) {
        const prices: MetalPrices = {
          goldUsdPerOz: cached.prices.gold ?? 0,
          silverUsdPerOz: cached.prices.silver ?? 0,
          platinumUsdPerOz: cached.prices.platinum ?? 0,
          palladiumUsdPerOz: cached.prices.palladium ?? 0,
          source: "Sovereign Cache",
          fetchedAt: new Date(cached.timestamp),
        };
        const offlineResult = calculate(calculatorPayload, prices);
        setResult({
          ...offlineResult,
          snapshotId: "offline",
          formulaVersionId: undefined,
          fetchedAt: cached.timestamp,
          currency: "USD",
          hasAnomaly: false,
          confidenceBands: null,
          isHardwareVerified,
          hardwareDeviceId,
        });
        setLastCalculatedPayload(calculatorPayload);
        setIsUsingStalePrices(true);
        setStaleTimestamp(cached.timestamp);
        return;
      }
    }

    const parsed = calculatorApiResponseSchema.safeParse(json);

    if (!response.ok || !parsed.success || !parsed.data.ok || !parsed.data.data) {
      const message =
        parsed.success
          ? (parsed.data.error ?? "Calculation request failed")
          : "Calculation request failed";
      setResult(null);
      setFormState((prev) => ({ ...prev, submitError: message }));
      return;
    }

    const apiData = parsed.data.data;
    const output: CalculatorOutput = {
      recoveredMetalWeight: apiData.recoveredMetalWeight,
      recoveredMetalWeightOz: apiData.recoveredMetalWeightOz,
      grossValue: apiData.grossValue,
      netValue: apiData.netValue,
      profitLoss: apiData.profitLoss,
      marginPct: apiData.marginPct,
      recoveryRatePct: apiData.recoveryRatePct,
      acquisitionCostUsd: apiData.acquisitionCostUsd,
      snapshotId: apiData.snapshotId ?? null,
      formulaVersionId: undefined,
      currency: apiData.currency,
      hasAnomaly: apiData.hasAnomaly,
      confidenceBands: apiData.confidenceBands,
      fetchedAt: apiData.priceFetchedAt,
    };

    setLastCalculatedPayload(calculatorPayload);
    setResult(output);
    setIsUsingStalePrices(false);

    // Feed the Sovereign Cache if online
    if (parsed.data.data) {
      const p = parsed.data.data;
      sovereignDB.cachePrices({
        [p.metalType]: p.pricePerOz,
      });
    }
  }

  async function onSaveBatch() {
    if (!result || !lastCalculatedPayload) {
      setFormState((prev) => ({
        ...prev,
        saveError: "Run calculation before saving a batch",
        saveSuccess: null,
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, isSavingBatch: true, saveError: null, saveSuccess: null }));

    const response = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [lastCalculatedPayload],
        tagIds: selectedTagIds,
        customerName: form.getValues("customerName"),
        customerEmail: form.getValues("customerEmail"),
        customerReference: form.getValues("customerReference"),
        calculatorInput: lastCalculatedPayload,
        calculatorOutput: result,
      }),
    });

    const json = await response.json().catch(() => ({ error: "FETCH_FAILED" }));

    // Phase 2: Offline Persistence Fallback
    if (json.error === "OFFLINE_MODE_ACTIVE" || json.error === "FETCH_FAILED") {
      const localId = await sovereignDB.savePendingBatch({
        items: [lastCalculatedPayload],
        tagIds: selectedTagIds,
        customerName: form.getValues("customerName"),
        customerEmail: form.getValues("customerEmail"),
        customerReference: form.getValues("customerReference"),
        calculatorInput: lastCalculatedPayload,
        calculatorOutput: result,
        isSovereignOffline: true,
      });

      if (localId) {
        setFormState((prev) => ({
          ...prev,
          isSavingBatch: false,
          saveSuccess: `Batch saved LOCALLY (${localId}). Will sync when online.`,
        }));
        return;
      }
    }

    const parsed = batchApiResponseSchema.safeParse(json);

    if (!response.ok || !parsed.success || !parsed.data.ok || !parsed.data.data) {
      const message =
        parsed.success
          ? (parsed.data.error ?? "Save batch request failed")
          : "Save batch request failed";
      setFormState((prev) => ({ ...prev, isSavingBatch: false, saveError: message }));
      return;
    }

    const batchData = parsed.data.data;

    setResult((prev) =>
      prev
        ? {
            ...prev,
            snapshotId: batchData.priceSnapshotId ?? prev.snapshotId,
          }
        : prev,
    );

    setFormState((prev) => ({
      ...prev,
      isSavingBatch: false,
      saveSuccess: `Batch saved (${batchData.id})`,
    }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Batch Calculator</CardTitle>
              <CardDescription>
                Estimate metal recovery economics, then save the run as a batch record.
              </CardDescription>
            </div>
            {isOffline && (
              <div className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-800 animate-pulse border border-amber-200">
                SOVEREIGN OFFLINE
              </div>
            )}
          </div>
          {isUsingStalePrices && (
            <div className="mt-2 rounded bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-lg">
              CRITICAL: STALE PRICES ACTIVE
              <span className="ml-2 font-normal opacity-80">
                Using local cache from {staleTimestamp ? new Date(staleTimestamp).toLocaleString() : "unknown manual override"}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="materialType">Material Type</Label>
              <Input
                id="materialType"
                placeholder="pcb_scrap"
                {...form.register("materialType")}
              />
              {form.formState.errors.materialType ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.materialType.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name (optional)</Label>
              <Input id="customerName" placeholder="Acme Buyer" {...form.register("customerName")} />
              {form.formState.errors.customerName ? (
                <p className="text-sm text-rose-600">{form.formState.errors.customerName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email (optional)</Label>
              <Input id="customerEmail" type="email" placeholder="buyer@example.com" {...form.register("customerEmail")} />
              {form.formState.errors.customerEmail ? (
                <p className="text-sm text-rose-600">{form.formState.errors.customerEmail.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customerReference">Customer Reference (optional)</Label>
              <Input id="customerReference" placeholder="INTAKE-2026-0042" {...form.register("customerReference")} />
              {form.formState.errors.customerReference ? (
                <p className="text-sm text-rose-600">{form.formState.errors.customerReference.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetMetal">Target Metal</Label>
              <Select id="targetMetal" {...form.register("targetMetal")}>
                {targetMetalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {form.formState.errors.targetMetal ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.targetMetal.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startingWeightGrams" className="flex items-center gap-2">
                Starting Weight (g)
                {isHardwareVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-600 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                    <Zap className="h-2 w-2 fill-emerald-600" />
                    Hardware Captured
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="startingWeightGrams"
                    type="number"
                    step="0.01"
                    className={cn(
                      "pr-8",
                      isHardwareVerified && "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold"
                    )}
                    {...form.register("startingWeightGrams", {
                      onChange: () => setIsHardwareVerified(false) // Manual edit breaks verification
                    })}
                  />
                  {isHardwareVerified && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant={isConnected ? "outline" : "default"}
                  className={isConnected ? "bg-emerald-100 text-emerald-800 border-emerald-300" : ""}
                  onClick={isConnected ? disconnect : connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? "..." : isConnected ? "⚓ On" : "⚓ Scale"}
                </Button>
              </div>
              {reading && (
                <p className={`text-[10px] font-mono uppercase tracking-widest ${reading.isStable ? "text-emerald-600" : "text-amber-500 animate-pulse"}`}>
                  {reading.isStable ? "STABLE" : "IN MOTION"} | {reading.weight} {reading.unit}
                </p>
              )}
              {scaleError && <p className="text-[10px] text-rose-600 font-medium">{scaleError}</p>}
              {form.formState.errors.startingWeightGrams ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.startingWeightGrams.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedPurityPercent">Estimated Purity (%)</Label>
              <Input
                id="estimatedPurityPercent"
                type="number"
                step="0.01"
                {...form.register("estimatedPurityPercent")}
              />
              {form.formState.errors.estimatedPurityPercent ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.estimatedPurityPercent.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="processCostUsd">Process Cost (USD)</Label>
              <Input
                id="processCostUsd"
                type="number"
                step="0.01"
                {...form.register("processCostUsd")}
              />
              {form.formState.errors.processCostUsd ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.processCostUsd.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recoveryRateOverride">Recovery Rate (%)</Label>
              <Input
                id="recoveryRateOverride"
                type="number"
                step="0.01"
                placeholder="Default: 100 (full recovery)"
                {...form.register("recoveryRateOverride")}
              />
              {form.formState.errors.recoveryRateOverride ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.recoveryRateOverride.message}
                </p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Calculating..." : "Calculate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onSaveBatch}
                disabled={!result || formState.isSavingBatch}
              >
                {formState.isSavingBatch ? "Saving..." : "Save Batch"}
              </Button>
            </div>

            {formState.submitError ? (
              <p className="md:col-span-2 text-sm text-rose-600">{formState.submitError}</p>
            ) : null}
            {formState.saveError ? (
              <p className="md:col-span-2 text-sm text-rose-600">{formState.saveError}</p>
            ) : null}
            {formState.saveSuccess ? (
              <p className="md:col-span-2 text-sm text-emerald-700">{formState.saveSuccess}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {result ? <ResultsCards result={result} /> : null}
    </div>
  );
}
