import { 
  type InvestigationResult, 
  type CreateInvestigationInput,
} from "./service";

const mockInvestigations: InvestigationResult[] = [
  {
    id: "mock-inv-1",
    teamId: "mock-team-id",
    userId: "mock-user-id",
    title: "Anomalous Gold Recovery in Batch #1029",
    summary: "Audit trace indicates a recovery rate discrepancy (>15%) compared to the 30-day metal average.",
    status: "in_progress",
    severity: "high",
    evidenceJson: { linkedSignalIds: ["sig-9921"] },
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    linkedBatches: [{ id: "mock-batch-1", status: "completed", trustScore: "62.50" }],
  },
  {
    id: "mock-inv-2",
    teamId: "mock-team-id",
    userId: "mock-user-id",
    title: "Stale Price Usage Alert: Silver Spot Price",
    summary: "Batch certified using fallback price data during a network outage. Requires manual price validation.",
    status: "open",
    severity: "medium",
    evidenceJson: { trigger: "Sovereign Fallback Active" },
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
    linkedBatches: [{ id: "mock-batch-4", status: "completed", trustScore: "85.00" }],
  }
];

export async function createInvestigation(
  input: CreateInvestigationInput,
  userId: string,
  teamId: string
): Promise<InvestigationResult> {
  return {
    id: `mock-inv-${Math.random().toString(36).substr(2, 9)}`,
    teamId,
    userId,
    title: input.title,
    summary: input.summary ?? null,
    status: "open",
    severity: input.severity,
    evidenceJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    linkedBatches: [],
  };
}

export async function listInvestigations(teamId: string): Promise<InvestigationResult[]> {
  return mockInvestigations;
}

export async function getInvestigationById(id: string, teamId: string): Promise<InvestigationResult> {
  return mockInvestigations.find(inv => inv.id === id) ?? mockInvestigations[0]!;
}

export async function updateInvestigationStatus(
  id: string,
  teamId: string,
  status: any
): Promise<InvestigationResult> {
  const inv = mockInvestigations.find(inv => inv.id === id) ?? mockInvestigations[0]!;
  return { ...inv, status };
}
