import crypto from "node:crypto";
import type { BatchApiData } from "@/lib/validations/calculator";

export type ReportType = "melt" | "settlement" | "assay";

export type GeneratedReport = {
  pdf: Buffer;
  csv: string;
};

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

function safeText(value: string | null | undefined): string {
  return value?.trim() ? value : "n/a";
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "n/a";
  }

  return new Date(value).toISOString();
}

async function createDocBuffer(draw: (doc: PdfDoc) => void): Promise<Buffer> {
  const pdfkitModule = (await import("pdfkit")) as {
    default: new (options?: { margin?: number; size?: string }) => PdfDoc;
  };

  const PDFDocument = pdfkitModule.default;
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => {
      if (chunk) {
        chunks.push(chunk);
      }
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

function calculateFingerprint(data: unknown): string {
  const serialized = JSON.stringify(data || {});
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

function summarizeEconomics(batch: BatchApiData): {
  totalGrossValue: number;
  totalNetValue: number;
  totalProfitLoss: number;
  totalAcquisitionCost: number;
} {
  const items = batch.items ?? [];

  return {
    totalGrossValue: items.reduce((sum, item) => sum + item.grossValue, 0),
    totalNetValue: batch.totalNetValue ?? items.reduce((sum, item) => sum + item.netValue, 0),
    totalProfitLoss: batch.totalProfitLoss ?? items.reduce((sum, item) => sum + item.profitLoss, 0),
    totalAcquisitionCost: items.reduce((sum, item) => sum + item.acquisitionCostUsd, 0),
  };
}

function reportTitle(type: ReportType): string {
  switch (type) {
    case "melt":
      return "Melt Sheet";
    case "settlement":
      return "Settlement Sheet";
    case "assay":
      return "Assay Report";
  }
}

function reportCsv(batch: BatchApiData, type: ReportType): string {
  const items = [...(batch.items ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const economics = summarizeEconomics(batch);
  const rows: string[][] = [
    ["report_type", reportTitle(type)],
    ["batch_id", batch.id],
    ["status", batch.status],
    ["created_at", formatDate(batch.createdAt)],
    ["customer_name", safeText(batch.customerName)],
    ["customer_email", safeText(batch.customerEmail)],
    ["customer_reference", safeText(batch.customerReference)],
    ["tags", (batch.tags ?? []).map((tag) => tag.name).sort().join(" | ") || "n/a"],
    ["total_gross_value", fmt2(economics.totalGrossValue)],
    ["total_net_value", fmt2(economics.totalNetValue)],
    ["total_profit_loss", fmt2(economics.totalProfitLoss)],
    ["total_acquisition_cost", fmt2(economics.totalAcquisitionCost)],
    ["historical_net_value", fmt2(batch.historicalNetValue ?? economics.totalNetValue)],
    ["delta_since_batch", fmt2(batch.deltaSinceBatch ?? 0)],
    ["forecast_projected_price", batch.forecast?.projectedPrice == null ? "n/a" : fmt2(batch.forecast.projectedPrice)],
    ["forecast_projected_net", batch.forecast ? fmt2(batch.forecast.projectedNetValue) : "n/a"],
    ["forecast_projected_profit_loss", batch.forecast ? fmt2(batch.forecast.projectedProfitLoss) : "n/a"],
    ["forecast_projected_roi", batch.forecast?.projectedROI == null ? "n/a" : fmt2(batch.forecast.projectedROI)],
    [""],
    [
      "item_id",
      "metal_type",
      "weight",
      "weight_unit",
      "purity_pct",
      "recovery_rate_pct",
      "acquisition_cost_usd",
      "gross_value",
      "net_value",
      "profit_loss",
      "margin_pct",
    ],
    ...items.map((item) => [
      item.id,
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
    ]),
  ];

  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

async function buildReport(batch: BatchApiData, type: ReportType): Promise<GeneratedReport> {
  const economics = summarizeEconomics(batch);
  const items = [...(batch.items ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedTags = [...(batch.tags ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const history = batch.priceContext?.history ?? [];

  const pdf = await createDocBuffer((doc) => {
    doc.fontSize(16);
    doc.text(`Metals V1 ${reportTitle(type)}`);
    doc.fontSize(10);
    // Deterministic report timestamp tied to the batch lifecycle.
    doc.text(`Report Timestamp: ${formatDate(batch.createdAt)}`);
    doc.moveDown();

    sectionTitle(doc, "Batch Metadata");
    kv(doc, "Batch ID", batch.id);
    kv(doc, "Status", batch.status);
    kv(doc, "Created At", formatDate(batch.createdAt));
    kv(doc, "Formula Version", safeText(batch.formulaVersionId));
    kv(doc, "Snapshot ID", safeText(batch.priceSnapshotId));

    sectionTitle(doc, "Customer");
    kv(doc, "Customer Name", safeText(batch.customerName));
    kv(doc, "Customer Email", safeText(batch.customerEmail));
    kv(doc, "Customer Reference", safeText(batch.customerReference));

    sectionTitle(doc, "Tags");
    kv(doc, "Tag List", sortedTags.length > 0 ? sortedTags.map((tag) => tag.name).join(", ") : "n/a");

    sectionTitle(doc, "Economics Summary");
    kv(doc, "Item Count", `${items.length}`);
    kv(doc, "Total Gross Value", `$${fmt2(economics.totalGrossValue)}`);
    kv(doc, "Total Net Value", `$${fmt2(economics.totalNetValue)}`);
    kv(doc, "Total Profit / Loss", `$${fmt2(economics.totalProfitLoss)}`);
    kv(doc, "Total Acquisition Cost", `$${fmt2(economics.totalAcquisitionCost)}`);
    kv(doc, "Historical Net Value", `$${fmt2(batch.historicalNetValue ?? economics.totalNetValue)}`);
    kv(doc, "Delta Since Batch", `$${fmt2(batch.deltaSinceBatch ?? 0)}`);

    sectionTitle(doc, "Price Context");
    kv(doc, "Dominant Metal", safeText(batch.priceContext?.metalType ?? null));
    kv(
      doc,
      "Price At Batch",
      batch.priceContext?.priceAtBatchTimestamp == null ? "n/a" : `$${fmt2(batch.priceContext.priceAtBatchTimestamp)}`,
    );
    kv(
      doc,
      "Current Price",
      batch.priceContext?.currentPrice == null ? "n/a" : `$${fmt2(batch.priceContext.currentPrice)}`,
    );
    kv(doc, "History Points", `${history.length}`);

    sectionTitle(doc, "Forecast Context");
    kv(doc, "Forecast Method", batch.forecast?.method?.toUpperCase() ?? "n/a");
    kv(
      doc,
      "Projected Price",
      batch.forecast?.projectedPrice == null ? "n/a" : `$${fmt2(batch.forecast.projectedPrice)}`,
    );
    kv(
      doc,
      "Projected Net Value",
      batch.forecast == null ? "n/a" : `$${fmt2(batch.forecast.projectedNetValue)}`,
    );
    kv(
      doc,
      "Projected Profit / Loss",
      batch.forecast == null ? "n/a" : `$${fmt2(batch.forecast.projectedProfitLoss)}`,
    );
    kv(
      doc,
      "Projected ROI",
      batch.forecast?.projectedROI == null ? "n/a" : `${fmt2(batch.forecast.projectedROI)}%`,
    );

    doc.addPage();
    sectionTitle(doc, "Items Table");
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

    if (type === "settlement") {
      const fingerprint = calculateFingerprint(batch.auditSnapshot);

      doc.moveDown(2);
      sectionTitle(doc, "Trust-Layer Audit Certification");
      kv(doc, "Confidence Score", `${batch.auditSnapshot?.confidence?.score ?? 100}%`);
      kv(doc, "Confidence Level", batch.auditSnapshot?.confidence?.level?.toUpperCase() ?? "HIGH");
      kv(doc, "Degraded Mode", batch.auditSnapshot?.confidence?.degradedMode ? "YES" : "NO");
      kv(doc, "HokeOS Version", "v1.4.0-industrial");
      kv(doc, "Integrity Hash (SHA-256)", fingerprint);

      doc.moveDown();
      doc.fontSize(8).text(
        "TERMS & CONDITIONS: This settlement manifest is a final declaration of metal recovery value based on real-time ingested spot prices and verified industrial formulas. By signing below, the parties agree that the transaction volume and yield are definitive and binding for the specified Batch ID.",
        { width: PAGE_WIDTH }
      );

      doc.moveDown(2);
      doc.fontSize(10);
      doc.text("____________________________________          ____________________________________");
      doc.text("OPERATOR SIGNATURE                            CUSTOMER SIGNATURE");
      doc.text(`Date: ${new Date().toLocaleDateString()}                Date: ____________________`);
    }
  });

  return {
    pdf,
    csv: reportCsv(batch, type),
  };
}

export async function generateMeltSheet(batch: BatchApiData): Promise<GeneratedReport> {
  return buildReport(batch, "melt");
}

export async function generateSettlementSheet(batch: BatchApiData): Promise<GeneratedReport> {
  return buildReport(batch, "settlement");
}

export async function generateAssayReport(batch: BatchApiData): Promise<GeneratedReport> {
  return buildReport(batch, "assay");
}
