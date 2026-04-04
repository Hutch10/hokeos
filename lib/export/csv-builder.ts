import type { BatchApiData, BatchItemApiData } from "@/lib/validations/calculator";

export type BatchMetalAggregate = {
  metalType: string;
  itemCount: number;
  recoveredMetalWeight: number;
  grossValue: number;
  netValue: number;
  profitLoss: number;
  acquisitionCostUsd: number;
  averageMarginPct: number | null;
};

export type BatchSummaryMetrics = {
  itemCount: number;
  totalRecoveredMetalWeight: number;
  totalGrossValue: number;
  totalNetValue: number;
  totalProfitLoss: number;
  totalAcquisitionCostUsd: number;
  averageMarginPct: number | null;
  recoveryEfficiencyPct: number | null;
};

export type BatchComparisonSummary = {
  batchId: string;
  createdAt: string | null;
  summary: BatchSummaryMetrics;
  metalBreakdown: BatchMetalAggregate[];
};

const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 31.1035,
  lb: 453.59237,
};

function toGrams(weight: number, unit: string): number {
  const factor = WEIGHT_TO_GRAMS[unit] ?? 1;
  return weight * factor;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replace(/\"/g, '""')}"`;
  }

  return value;
}

function toCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? `${value}` : "";
  if (value instanceof Date) return value.toISOString();
  return `${value}`;
}

function rowsToCsv(rows: Array<Array<unknown>>): string {
  return rows
    .map((row) => row.map((cell) => csvEscape(toCell(cell))).join(","))
    .join("\n");
}

export function buildBatchSummaryMetrics(batch: BatchApiData): BatchSummaryMetrics {
  const items = batch.items ?? [];
  const itemCount = items.length;

  const totalRecoveredMetalWeight = items.reduce((sum, item) => sum + item.recoveredMetalWeight, 0);
  const totalGrossValue = batch.totalGrossValue ?? items.reduce((sum, item) => sum + item.grossValue, 0);
  const totalNetValue = batch.totalNetValue ?? items.reduce((sum, item) => sum + item.netValue, 0);
  const totalProfitLoss = batch.totalProfitLoss ?? items.reduce((sum, item) => sum + item.profitLoss, 0);
  const totalAcquisitionCostUsd = items.reduce((sum, item) => sum + item.acquisitionCostUsd, 0);

  const marginValues = items
    .map((item) => item.marginPct)
    .filter((margin): margin is number => margin !== null);
  const averageMarginPct =
    marginValues.length > 0
      ? marginValues.reduce((sum, margin) => sum + margin, 0) / marginValues.length
      : null;

  const totalInputGrams = items.reduce((sum, item) => sum + toGrams(item.weight, item.weightUnit), 0);
  const totalRecoveredGrams = items.reduce(
    (sum, item) => sum + toGrams(item.recoveredMetalWeight, item.weightUnit),
    0,
  );
  const recoveryEfficiencyPct = totalInputGrams > 0 ? (totalRecoveredGrams / totalInputGrams) * 100 : null;

  return {
    itemCount,
    totalRecoveredMetalWeight,
    totalGrossValue,
    totalNetValue,
    totalProfitLoss,
    totalAcquisitionCostUsd,
    averageMarginPct,
    recoveryEfficiencyPct,
  };
}

export function buildBatchMetalBreakdown(batch: BatchApiData): BatchMetalAggregate[] {
  const grouped = new Map<string, BatchMetalAggregate>();

  for (const item of batch.items ?? []) {
    const current = grouped.get(item.metalType) ?? {
      metalType: item.metalType,
      itemCount: 0,
      recoveredMetalWeight: 0,
      grossValue: 0,
      netValue: 0,
      profitLoss: 0,
      acquisitionCostUsd: 0,
      averageMarginPct: null,
    };

    current.itemCount += 1;
    current.recoveredMetalWeight += item.recoveredMetalWeight;
    current.grossValue += item.grossValue;
    current.netValue += item.netValue;
    current.profitLoss += item.profitLoss;
    current.acquisitionCostUsd += item.acquisitionCostUsd;

    grouped.set(item.metalType, current);
  }

  const withMargin = Array.from(grouped.values()).map((row) => {
    const rows = (batch.items ?? []).filter((item) => item.metalType === row.metalType);
    const marginValues = rows
      .map((item) => item.marginPct)
      .filter((margin): margin is number => margin !== null);

    return {
      ...row,
      averageMarginPct:
        marginValues.length > 0
          ? marginValues.reduce((sum, margin) => sum + margin, 0) / marginValues.length
          : null,
    };
  });

  return withMargin.sort((a, b) => b.netValue - a.netValue || a.metalType.localeCompare(b.metalType));
}

export function buildComparisonSummaries(batches: BatchApiData[]): BatchComparisonSummary[] {
  return batches.map((batch) => ({
    batchId: batch.id,
    createdAt: batch.createdAt ? new Date(batch.createdAt).toISOString() : null,
    summary: buildBatchSummaryMetrics(batch),
    metalBreakdown: buildBatchMetalBreakdown(batch),
  }));
}

function batchMetadataRows(batch: BatchApiData): Array<Array<unknown>> {
  const snapshot = batch.snapshot;

  return [
    ["Section", "Batch Metadata"],
    ["batchId", batch.id],
    ["status", batch.status],
    ["createdAt", batch.createdAt ? new Date(batch.createdAt).toISOString() : ""],
    ["formulaVersionId", batch.formulaVersionId ?? ""],
    ["priceSnapshotId", batch.priceSnapshotId ?? ""],
    ["snapshotSource", snapshot?.source ?? ""],
    ["snapshotFetchedAt", snapshot?.fetchedAt ? new Date(snapshot.fetchedAt).toISOString() : ""],
    ["goldUsdPerOz", snapshot?.goldUsdPerOz ?? ""],
    ["silverUsdPerOz", snapshot?.silverUsdPerOz ?? ""],
    ["platinumUsdPerOz", snapshot?.platinumUsdPerOz ?? ""],
    ["palladiumUsdPerOz", snapshot?.palladiumUsdPerOz ?? ""],
  ];
}

function batchItemRows(items: BatchItemApiData[]): Array<Array<unknown>> {
  return [
    ["Section", "Item-Level Economic Fields"],
    [
      "itemId",
      "metalType",
      "weight",
      "weightUnit",
      "purityPct",
      "recoveryRatePct",
      "acquisitionCostUsd",
      "weightInOz",
      "recoveredMetalWeight",
      "recoveredMetalWeightOz",
      "pricePerOz",
      "grossValue",
      "netValue",
      "profitLoss",
      "marginPct",
      "currency",
      "formulaVersion",
    ],
    ...items.map((item) => [
      item.id,
      item.metalType,
      item.weight,
      item.weightUnit,
      item.purityPct,
      item.recoveryRatePct,
      item.acquisitionCostUsd,
      item.weightInOz,
      item.recoveredMetalWeight,
      item.recoveredMetalWeightOz,
      item.pricePerOz,
      item.grossValue,
      item.netValue,
      item.profitLoss,
      item.marginPct,
      item.currency,
      item.formulaVersion,
    ]),
  ];
}

function batchSummaryRows(summary: BatchSummaryMetrics): Array<Array<unknown>> {
  return [
    ["Section", "Totals and Summary Metrics"],
    ["itemCount", summary.itemCount],
    ["totalRecoveredMetalWeight", summary.totalRecoveredMetalWeight],
    ["totalGrossValue", summary.totalGrossValue],
    ["totalNetValue", summary.totalNetValue],
    ["totalProfitLoss", summary.totalProfitLoss],
    ["totalAcquisitionCostUsd", summary.totalAcquisitionCostUsd],
    ["averageMarginPct", summary.averageMarginPct],
    ["recoveryEfficiencyPct", summary.recoveryEfficiencyPct],
  ];
}

function batchBreakdownRows(breakdown: BatchMetalAggregate[]): Array<Array<unknown>> {
  return [
    ["Section", "Metal Breakdown Aggregates"],
    [
      "metalType",
      "itemCount",
      "recoveredMetalWeight",
      "grossValue",
      "netValue",
      "profitLoss",
      "acquisitionCostUsd",
      "averageMarginPct",
    ],
    ...breakdown.map((row) => [
      row.metalType,
      row.itemCount,
      row.recoveredMetalWeight,
      row.grossValue,
      row.netValue,
      row.profitLoss,
      row.acquisitionCostUsd,
      row.averageMarginPct,
    ]),
  ];
}

export function buildBatchCsv(batch: BatchApiData): string {
  const summary = buildBatchSummaryMetrics(batch);
  const breakdown = buildBatchMetalBreakdown(batch);
  const itemRows = batchItemRows(batch.items ?? []);

  const rows: Array<Array<unknown>> = [
    ["ExportType", "SingleBatch"],
    ["GeneratedAt", new Date().toISOString()],
    [],
    ...batchMetadataRows(batch),
    [],
    ...itemRows,
    [],
    ...batchSummaryRows(summary),
    [],
    ...batchBreakdownRows(breakdown),
  ];

  return rowsToCsv(rows);
}

export function buildComparisonCsv(batches: BatchApiData[]): string {
  const summaries = buildComparisonSummaries(batches);

  const metadataRows: Array<Array<unknown>> = [
    ["ExportType", "BatchComparison"],
    ["GeneratedAt", new Date().toISOString()],
    ["BatchCount", batches.length],
    ["BatchIds", batches.map((batch) => batch.id).join("|")],
  ];

  const summaryRows: Array<Array<unknown>> = [
    ["Section", "Batch Totals and Summary Metrics"],
    [
      "batchId",
      "createdAt",
      "itemCount",
      "totalRecoveredMetalWeight",
      "totalGrossValue",
      "totalNetValue",
      "totalProfitLoss",
      "totalAcquisitionCostUsd",
      "averageMarginPct",
      "recoveryEfficiencyPct",
    ],
    ...summaries.map((row) => [
      row.batchId,
      row.createdAt,
      row.summary.itemCount,
      row.summary.totalRecoveredMetalWeight,
      row.summary.totalGrossValue,
      row.summary.totalNetValue,
      row.summary.totalProfitLoss,
      row.summary.totalAcquisitionCostUsd,
      row.summary.averageMarginPct,
      row.summary.recoveryEfficiencyPct,
    ]),
  ];

  const metalBreakdownRows: Array<Array<unknown>> = [
    ["Section", "Metal Breakdown Aggregates"],
    [
      "batchId",
      "metalType",
      "itemCount",
      "recoveredMetalWeight",
      "grossValue",
      "netValue",
      "profitLoss",
      "acquisitionCostUsd",
      "averageMarginPct",
    ],
    ...summaries.flatMap((summary) =>
      summary.metalBreakdown.map((row) => [
        summary.batchId,
        row.metalType,
        row.itemCount,
        row.recoveredMetalWeight,
        row.grossValue,
        row.netValue,
        row.profitLoss,
        row.acquisitionCostUsd,
        row.averageMarginPct,
      ]),
    ),
  ];

  const itemRows: Array<Array<unknown>> = [
    ["Section", "Item-Level Economic Fields"],
    [
      "batchId",
      "itemId",
      "metalType",
      "weight",
      "weightUnit",
      "purityPct",
      "recoveryRatePct",
      "acquisitionCostUsd",
      "weightInOz",
      "recoveredMetalWeight",
      "recoveredMetalWeightOz",
      "pricePerOz",
      "grossValue",
      "netValue",
      "profitLoss",
      "marginPct",
      "currency",
      "formulaVersion",
    ],
    ...batches.flatMap((batch) =>
      (batch.items ?? []).map((item) => [
        batch.id,
        item.id,
        item.metalType,
        item.weight,
        item.weightUnit,
        item.purityPct,
        item.recoveryRatePct,
        item.acquisitionCostUsd,
        item.weightInOz,
        item.recoveredMetalWeight,
        item.recoveredMetalWeightOz,
        item.pricePerOz,
        item.grossValue,
        item.netValue,
        item.profitLoss,
        item.marginPct,
        item.currency,
        item.formulaVersion,
      ]),
    ),
  ];

  const perBatchMetadataRows: Array<Array<unknown>> = [
    ["Section", "Batch Metadata"],
    [
      "batchId",
      "status",
      "createdAt",
      "formulaVersionId",
      "priceSnapshotId",
      "snapshotSource",
      "snapshotFetchedAt",
      "goldUsdPerOz",
      "silverUsdPerOz",
      "platinumUsdPerOz",
      "palladiumUsdPerOz",
    ],
    ...batches.map((batch) => [
      batch.id,
      batch.status,
      batch.createdAt ? new Date(batch.createdAt).toISOString() : "",
      batch.formulaVersionId ?? "",
      batch.priceSnapshotId ?? "",
      batch.snapshot?.source ?? "",
      batch.snapshot?.fetchedAt ? new Date(batch.snapshot.fetchedAt).toISOString() : "",
      batch.snapshot?.goldUsdPerOz ?? "",
      batch.snapshot?.silverUsdPerOz ?? "",
      batch.snapshot?.platinumUsdPerOz ?? "",
      batch.snapshot?.palladiumUsdPerOz ?? "",
    ]),
  ];

  const rows: Array<Array<unknown>> = [
    ...metadataRows,
    [],
    ...perBatchMetadataRows,
    [],
    ...summaryRows,
    [],
    ...metalBreakdownRows,
    [],
    ...itemRows,
  ];

  return rowsToCsv(rows);
}
