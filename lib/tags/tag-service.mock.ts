import { type TagRecord } from "./tag-service";

export async function listTags(userId: string, teamId: string): Promise<TagRecord[]> {
  return [
    { id: "mock-tag-1", userId, teamId, name: "Industrial", color: "#3b82f6", createdAt: new Date() },
    { id: "mock-tag-2", userId, teamId, name: "High Yield", color: "#10b981", createdAt: new Date() },
    { id: "mock-tag-3", userId, teamId, name: "Refined", color: "#8b5cf6", createdAt: new Date() },
  ];
}

export async function createTag(
  userId: string,
  teamId: string,
  name: string,
  color?: string | null,
): Promise<TagRecord> {
  return {
    id: `mock-tag-${Date.now()}`,
    userId,
    teamId,
    name,
    color: color ?? null,
    createdAt: new Date(),
  };
}

export async function assignTagsToBatch(
  batchId: string,
  userId: string,
  teamId: string,
  tagIds: string[],
): Promise<TagRecord[]> {
  const allTags = await listTags(userId, teamId);
  return allTags.filter((t) => tagIds.includes(t.id));
}

export async function getTagsForBatch(batchId: string, userId: string): Promise<TagRecord[]> {
  // Mock team lookup for consistency
  const teamId = "mock-team-id";
  const allTags = await listTags(userId, teamId);
  return [allTags[0]!, allTags[1]!];
}
