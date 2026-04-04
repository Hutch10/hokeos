"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

import { ResultsCards } from "./results-cards";

type EditBatchFormValues = z.input<typeof calculatorInputSchema>;

type EditBatchFormState = {
  isSaving: boolean;
  submitError: string | null;
  saveError: string | null;
};

type EditBatchFormProps = {
  batchId: string;
  initialPayload: CalculatorApiRequest;
  initialTagIds: string[];
  initialCustomerName?: string | null;
  initialCustomerEmail?: string | null;
  initialCustomerReference?: string | null;
};

function toFormValues(
  payload: CalculatorApiRequest,
  customer: {
    name?: string | null;
    email?: string | null;
    reference?: string | null;
  },
): EditBatchFormValues {
  return {
    materialType: "batch_material",
    targetMetal: payload.metalType,
    startingWeightGrams: payload.weight,
    estimatedPurityPercent: payload.purityPct,
    processCostUsd: payload.acquisitionCostUsd,
    recoveryRateOverride: payload.recoveryRatePct,
    customerName: customer.name ?? "",
    customerEmail: customer.email ?? "",
    customerReference: customer.reference ?? "",
  };
}

export function EditBatchForm({
  batchId,
  initialPayload,
  initialTagIds,
  initialCustomerName,
  initialCustomerEmail,
  initialCustomerReference,
}: EditBatchFormProps) {
  const [result, setResult] = useState<CalculatorOutput | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [lastCalculatedPayload, setLastCalculatedPayload] = useState<CalculatorApiRequest>(initialPayload);
  const [formState, setFormState] = useState<EditBatchFormState>({
    isSaving: false,
    submitError: null,
    saveError: null,
  });

  const form = useForm<EditBatchFormValues, undefined, CalculatorInput>({
    resolver: zodResolver(calculatorInputSchema),
    defaultValues: toFormValues(initialPayload, {
      name: initialCustomerName,
      email: initialCustomerEmail,
      reference: initialCustomerReference,
    }),
  });

  async function onSubmit(values: CalculatorInput) {
    setFormState((prev) => ({ ...prev, submitError: null, saveError: null }));

    const payload = calculatorApiRequestSchema.parse({
      metalType: values.targetMetal,
      weight: values.startingWeightGrams,
      weightUnit: "g",
      purityPct: values.estimatedPurityPercent,
      recoveryRatePct: values.recoveryRateOverride ?? 100,
      acquisitionCostUsd: values.processCostUsd,
      formulaVersion: "v1",
    });

    const response = await fetch("/api/calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await response.json().catch(() => null);
    const parsed = calculatorApiResponseSchema.safeParse(json);

    if (!response.ok || !parsed.success || !parsed.data.ok || !parsed.data.data) {
      const message = parsed.success ? (parsed.data.error ?? "Calculation request failed") : "Calculation request failed";
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
      snapshotId: apiData.snapshotId,
      formulaVersionId: undefined,
    };

    setLastCalculatedPayload(payload);
    setResult(output);
  }

  async function onSaveBatch() {
    setFormState((prev) => ({ ...prev, isSaving: true, submitError: null, saveError: null }));

    const response = await fetch(`/api/batches/${batchId}`, {
      method: "PATCH",
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

    const json = await response.json().catch(() => null);
    const parsed = batchApiResponseSchema.safeParse(json);

    if (!response.ok || !parsed.success || !parsed.data.ok || !parsed.data.data) {
      const message = parsed.success ? (parsed.data.error ?? "Update batch request failed") : "Update batch request failed";
      setFormState((prev) => ({ ...prev, isSaving: false, saveError: message }));
      return;
    }

    window.location.href = `/batches/${batchId}?toast=updated`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Batch</CardTitle>
          <CardDescription>Update the batch input and persist a newly recomputed canonical output.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="materialType">Material Type</Label>
              <Input id="materialType" placeholder="pcb_scrap" {...form.register("materialType")} />
              {form.formState.errors.materialType ? (
                <p className="text-sm text-rose-600">{form.formState.errors.materialType.message}</p>
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
                <p className="text-sm text-rose-600">{form.formState.errors.targetMetal.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startingWeightGrams">Starting Weight (g)</Label>
              <Input id="startingWeightGrams" type="number" step="0.01" {...form.register("startingWeightGrams")} />
              {form.formState.errors.startingWeightGrams ? (
                <p className="text-sm text-rose-600">{form.formState.errors.startingWeightGrams.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedPurityPercent">Estimated Purity (%)</Label>
              <Input id="estimatedPurityPercent" type="number" step="0.01" {...form.register("estimatedPurityPercent")} />
              {form.formState.errors.estimatedPurityPercent ? (
                <p className="text-sm text-rose-600">{form.formState.errors.estimatedPurityPercent.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="processCostUsd">Process Cost (USD)</Label>
              <Input id="processCostUsd" type="number" step="0.01" {...form.register("processCostUsd")} />
              {form.formState.errors.processCostUsd ? (
                <p className="text-sm text-rose-600">{form.formState.errors.processCostUsd.message}</p>
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
                <p className="text-sm text-rose-600">{form.formState.errors.recoveryRateOverride.message}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Recalculating..." : "Recalculate"}
              </Button>
              <Button type="button" variant="outline" onClick={onSaveBatch} disabled={formState.isSaving}>
                {formState.isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {formState.submitError ? <p className="md:col-span-2 text-sm text-rose-600">{formState.submitError}</p> : null}
            {formState.saveError ? <p className="md:col-span-2 text-sm text-rose-600">{formState.saveError}</p> : null}
          </form>
        </CardContent>
      </Card>

      {result ? <ResultsCards result={result} /> : null}
    </div>
  );
}
