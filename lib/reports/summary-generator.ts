import type { BatchApiData } from "@/lib/validations/calculator";

import { getForecastOverview, getMarketOverview } from "@/lib/prices";
import { listBatches } from "@/lib/metals/batch-service";
import { batchApiResponseSchema } from "@/lib/validations/calculator";

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

function tableHeader(doc: PdfDoc, headers: string[]): void {
  doc.text(headers.join(" | "), { width: PAGE_WIDTH });
  doc.text("-".repeat(120), { width: PAGE_WIDTH });
}

function calculateSummaryMetrics(batches: BatchApiData[]): {
  batchCount: number;
  itemCount: number;
  totalNetValue: number;
  totalProfitLoss: number;
  totalAcquisitionCost: number;
  roiPct: number | null;
} {
  const items = batches.flatMap((batch) => batch.items ?? []);
  const totalNetValue = items.reduce((sum, item) => sum + item.netValue, 0);
  const totalProfitLoss = items.reduce((sum, item) => sum + item.profitLoss, 0);
  const totalAcquisitionCost = items.reduce((sum, item) => sum + item.acquisitionCostUsd, 0);

  return {
    batchCount: batches.length,
    itemCount: items.length,
    totalNetValue,
    totalProfitLoss,
    totalAcquisitionCost,
    roiPct: totalAcquisitionCost > 0 ? (totalProfitLoss / totalAcquisitionCost) * 100 : null,
  };
}

function computeTopTags(batches: BatchApiData[]): Array<{ name: string; count: number; net: number }> {
  const map = new Map<string, { count: number; net: number }>();

  for (const batch of batches) {
    const batchNet = (batch.items ?? []).reduce((sum, item) => sum + item.netValue, 0);
    for (const tag of batch.tags ?? []) {
      const current = map.get(tag.name) ?? { count: 0, net: 0 };
      current.count += 1;
      current.net += batchNet;
      map.set(tag.name, current);
    }
  }

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, count: value.count, net: value.net }))
    .sort((a, b) => b.count - a.count || b.net - a.net || a.name.localeCompare(b.name))
    .slice(0, 10);
}

export async function generateSummaryReport(input: {
  userId: string;
  asOf: Date;
}): Promise<Buffer> {
  const allBatches = await listBatches(input.userId);

  const parsedBatches = allBatches
    .map((batch) => {
      const parsed = batchApiResponseSchema.safeParse({ ok: true, data: batch });
      if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
        return null;
      }
      return parsed.data.data;
    })
    .filter((batch): batch is BatchApiData => batch !== null);

  const windowStart = new Date(input.asOf.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentBatches = parsedBatches
    .filter((batch) => {
      if (!batch.createdAt) {
        return false;
      }

      const createdAt = new Date(batch.createdAt);
      return createdAt >= windowStart && createdAt <= input.asOf;
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return aTime - bTime;
    });

  const [marketOverview, forecastOverview] = await Promise.all([
    getMarketOverview(),
    getForecastOverview(),
  ]);

  const metrics = calculateSummaryMetrics(recentBatches);
  const topTags = computeTopTags(recentBatches);

  return createDocBuffer((doc) => {
    doc.fontSize(16);
    doc.text("Metals V1 Scheduled Summary Report");
    doc.fontSize(10);
    doc.text(`Report Timestamp: ${input.asOf.toISOString()}`);
    doc.text(`Window: ${windowStart.toISOString()} to ${input.asOf.toISOString()}`);
    doc.moveDown();

    sectionTitle(doc, "Last 7 Days Batches");
    doc.text(`Batches: ${metrics.batchCount}`);
    doc.text(`Items: ${metrics.itemCount}`);
    doc.text(`Total Net Value: $${fmt2(metrics.totalNetValue)}`);
    doc.text(`Total Profit / Loss: $${fmt2(metrics.totalProfitLoss)}`);

    sectionTitle(doc, "ROI Summary");
    doc.text(`Total Acquisition Cost: $${fmt2(metrics.totalAcquisitionCost)}`);
    doc.text(`ROI: ${metrics.roiPct == null ? "n/a" : `${fmt2(metrics.roiPct)}%`}`);

    sectionTitle(doc, "Price Deltas");
    tableHeader(doc, ["metal", "latest", "7d", "30d", "volatility"]);
    for (const row of marketOverview.sort((a, b) => a.metalType.localeCompare(b.metalType))) {
      doc.text(
        [
          row.metalType,
          row.latestPrice == null ? "n/a" : `$${fmt2(row.latestPrice)}`,
          row.change7dPct == null ? "n/a" : `${fmt2(row.change7dPct)}%`,
          row.change30dPct == null ? "n/a" : `${fmt2(row.change30dPct)}%`,
          row.volatilityPct == null ? "n/a" : `${fmt2(row.volatilityPct)}%`,
        ].join(" | "),
        { width: PAGE_WIDTH },
      );
    }

    doc.addPage();
    sectionTitle(doc, "Forecast Overview");
    tableHeader(doc, ["metal", "method", "latest", "projected", "confidence"]);
    for (const row of forecastOverview.sort((a, b) => a.metalType.localeCompare(b.metalType))) {
      doc.text(
        [
          row.metalType,
          row.method.toUpperCase(),
          row.latestPrice == null ? "n/a" : `$${fmt2(row.latestPrice)}`,
          row.projectedPrice == null ? "n/a" : `$${fmt2(row.projectedPrice)}`,
          row.confidenceIndicator,
        ].join(" | "),
        { width: PAGE_WIDTH },
      );
    }

    sectionTitle(doc, "Top Tags");
    if (topTags.length === 0) {
      doc.text("n/a");
    } else {
      tableHeader(doc, ["tag", "count", "net"]);
      for (const tag of topTags) {
        doc.text([tag.name, `${tag.count}`, `$${fmt2(tag.net)}`].join(" | "), {
          width: PAGE_WIDTH,
        });
      }
    }
  });
}
