import type { BatchApiData } from "@/lib/validations/calculator";

import {
  buildBatchMetalBreakdown,
  buildBatchSummaryMetrics,
  buildComparisonSummaries,
} from "./csv-builder";

type PdfDoc = {
  fontSize: (size: number) => PdfDoc;
  text: (text: string, options?: { width?: number }) => PdfDoc;
  moveDown: (lines?: number) => PdfDoc;
  addPage: () => PdfDoc;
  end: () => void;
  on: (event: "data" | "end", callback: (chunk?: Buffer) => void) => void;
};

const PAGE_WIDTH = 530;

function fmt2(value: number): string {
  return value.toFixed(2);
}

function fmt4(value: number): string {
  return value.toFixed(4);
}

async function createDocBuffer(draw: (doc: PdfDoc) => void): Promise<Buffer> {
  const pdfkitModule = (await import("pdfkit")) as { default: new (options?: { margin?: number; size?: string }) => PdfDoc };
  const PDFDocument = pdfkitModule.default;
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => {
      if (chunk) chunks.push(chunk);
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    draw(doc);
    doc.end();
  });
}

function sectionTitle(doc: PdfDoc, title: string): void {
  doc.fontSize(12);
  doc.text(title);
  doc.moveDown(0.5);
  doc.fontSize(10);
}

function kv(doc: PdfDoc, label: string, value: string): void {
  doc.text(`${label}: ${value}`, { width: PAGE_WIDTH });
}

function tableHeader(doc: PdfDoc, headers: string[]): void {
  doc.text(headers.join(" | "), { width: PAGE_WIDTH });
  doc.text("-".repeat(120), { width: PAGE_WIDTH });
}

function chartPlaceholder(doc: PdfDoc): void {
  doc.moveDown(0.5);
  doc.text("Charts: omitted in PDF export (placeholder for deterministic server-side output)", {
    width: PAGE_WIDTH,
  });
}

export async function buildBatchPdf(batch: BatchApiData): Promise<Buffer> {
  const summary = buildBatchSummaryMetrics(batch);
  const breakdown = buildBatchMetalBreakdown(batch);
  const items = batch.items ?? [];

  return createDocBuffer((doc) => {
    doc.fontSize(16);
    doc.text("Metals V1 Batch Export");
    doc.fontSize(10);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    sectionTitle(doc, "Batch Metadata");
    kv(doc, "Batch ID", batch.id);
    kv(doc, "Status", batch.status);
    kv(doc, "Created At", batch.createdAt ? new Date(batch.createdAt).toISOString() : "");
    kv(doc, "Formula Version ID", batch.formulaVersionId ?? "");
    kv(doc, "Price Snapshot ID", batch.priceSnapshotId ?? "");
    kv(doc, "Snapshot Source", batch.snapshot?.source ?? "");
    kv(
      doc,
      "Snapshot Fetched At",
      batch.snapshot?.fetchedAt ? new Date(batch.snapshot.fetchedAt).toISOString() : "",
    );
    kv(doc, "Gold $/oz", batch.snapshot ? fmt2(batch.snapshot.goldUsdPerOz) : "");
    kv(doc, "Silver $/oz", batch.snapshot ? fmt2(batch.snapshot.silverUsdPerOz) : "");
    kv(doc, "Platinum $/oz", batch.snapshot ? fmt2(batch.snapshot.platinumUsdPerOz) : "");
    kv(doc, "Palladium $/oz", batch.snapshot ? fmt2(batch.snapshot.palladiumUsdPerOz) : "");
    doc.moveDown();

    sectionTitle(doc, "Summary Cards");
    kv(doc, "Item Count", `${summary.itemCount}`);
    kv(doc, "Total Recovered Metal (g)", fmt4(summary.totalRecoveredMetalWeight));
    kv(doc, "Total Gross Value", `$${fmt2(summary.totalGrossValue)}`);
    kv(doc, "Total Net Value", `$${fmt2(summary.totalNetValue)}`);
    kv(doc, "Total Profit / Loss", `$${fmt2(summary.totalProfitLoss)}`);
    kv(doc, "Total Acquisition Cost", `$${fmt2(summary.totalAcquisitionCostUsd)}`);
    kv(doc, "Average Margin %", summary.averageMarginPct == null ? "n/a" : fmt2(summary.averageMarginPct));
    kv(
      doc,
      "Recovery Efficiency %",
      summary.recoveryEfficiencyPct == null ? "n/a" : fmt2(summary.recoveryEfficiencyPct),
    );
    chartPlaceholder(doc);

    doc.addPage();
    sectionTitle(doc, "Item-Level Economic Fields");
    tableHeader(doc, [
      "itemId",
      "metal",
      "weight",
      "unit",
      "purity%",
      "recovery%",
      "acqCost",
      "gross",
      "net",
      "p/l",
      "margin%",
    ]);

    for (const item of items) {
      doc.text(
        [
          item.id.slice(0, 8),
          item.metalType,
          fmt4(item.weight),
          item.weightUnit,
          fmt2(item.purityPct),
          fmt2(item.recoveryRatePct),
          fmt2(item.acquisitionCostUsd),
          fmt2(item.grossValue),
          fmt2(item.netValue),
          fmt2(item.profitLoss),
          item.marginPct == null ? "n/a" : fmt2(item.marginPct),
        ].join(" | "),
        { width: PAGE_WIDTH },
      );
    }

    doc.addPage();
    sectionTitle(doc, "Metal Breakdown Aggregates");
    tableHeader(doc, ["metal", "items", "recovered(g)", "gross", "net", "p/l", "acqCost", "avgMargin%"]);

    for (const row of breakdown) {
      doc.text(
        [
          row.metalType,
          `${row.itemCount}`,
          fmt4(row.recoveredMetalWeight),
          fmt2(row.grossValue),
          fmt2(row.netValue),
          fmt2(row.profitLoss),
          fmt2(row.acquisitionCostUsd),
          row.averageMarginPct == null ? "n/a" : fmt2(row.averageMarginPct),
        ].join(" | "),
        { width: PAGE_WIDTH },
      );
    }
  });
}

export async function buildComparisonPdf(batches: BatchApiData[]): Promise<Buffer> {
  const summaries = buildComparisonSummaries(batches);

  return createDocBuffer((doc) => {
    doc.fontSize(16);
    doc.text("Metals V1 Batch Comparison Export");
    doc.fontSize(10);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.text(`Batch Count: ${batches.length}`);
    doc.text(`Batch IDs: ${batches.map((batch) => batch.id).join(", ")}`, { width: PAGE_WIDTH });
    doc.moveDown();

    sectionTitle(doc, "Summary Cards");
    tableHeader(doc, [
      "batchId",
      "items",
      "recovered(g)",
      "gross",
      "net",
      "p/l",
      "acqCost",
      "avgMargin%",
      "efficiency%",
    ]);

    for (const row of summaries) {
      doc.text(
        [
          row.batchId.slice(0, 8),
          `${row.summary.itemCount}`,
          fmt4(row.summary.totalRecoveredMetalWeight),
          fmt2(row.summary.totalGrossValue),
          fmt2(row.summary.totalNetValue),
          fmt2(row.summary.totalProfitLoss),
          fmt2(row.summary.totalAcquisitionCostUsd),
          row.summary.averageMarginPct == null ? "n/a" : fmt2(row.summary.averageMarginPct),
          row.summary.recoveryEfficiencyPct == null ? "n/a" : fmt2(row.summary.recoveryEfficiencyPct),
        ].join(" | "),
        { width: PAGE_WIDTH },
      );
    }

    chartPlaceholder(doc);

    doc.addPage();
    sectionTitle(doc, "Metal Breakdown Aggregates");
    tableHeader(doc, ["batchId", "metal", "items", "recovered(g)", "gross", "net", "p/l"]);

    for (const summary of summaries) {
      for (const row of summary.metalBreakdown) {
        doc.text(
          [
            summary.batchId.slice(0, 8),
            row.metalType,
            `${row.itemCount}`,
            fmt4(row.recoveredMetalWeight),
            fmt2(row.grossValue),
            fmt2(row.netValue),
            fmt2(row.profitLoss),
          ].join(" | "),
          { width: PAGE_WIDTH },
        );
      }
    }

    doc.addPage();
    sectionTitle(doc, "Item-Level Economic Fields");
    tableHeader(doc, ["batchId", "itemId", "metal", "weight", "unit", "gross", "net", "p/l"]);

    for (const batch of batches) {
      for (const item of batch.items ?? []) {
        doc.text(
          [
            batch.id.slice(0, 8),
            item.id.slice(0, 8),
            item.metalType,
            fmt4(item.weight),
            item.weightUnit,
            fmt2(item.grossValue),
            fmt2(item.netValue),
            fmt2(item.profitLoss),
          ].join(" | "),
          { width: PAGE_WIDTH },
        );
      }
    }
  });
}
