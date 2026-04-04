import { z } from "zod";

export const lotRoiApiSchema = z.object({
  id: z.string(),
  lotId: z.string(),
  totalCost: z.number(),
  revenue: z.number(),
  profit: z.number(),
  roiPct: z.number(),
  marginPct: z.number().nullable(),
  calculatedAt: z.union([z.string(), z.date()]),
});

export type LotRoiApiData = z.infer<typeof lotRoiApiSchema>;

export const lotApiDataSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  lotNumber: z.string(),
  materialType: z.string(),
  sourceName: z.string().nullable(),
  grossWeight: z.number().nullable(),
  weightUnit: z.string(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  roi: lotRoiApiSchema.nullable().optional(),
});

export type LotApiData = z.infer<typeof lotApiDataSchema>;
