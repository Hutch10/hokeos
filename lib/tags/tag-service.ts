import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { batchTags, batches, tags } from "@/db/schema";

export type TagRecord = {
  id: string;
  userId: string;
  teamId: string;
  name: string;
  color: string | null;
  createdAt: Date;
};

function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function listTags(userId: string, teamId: string): Promise<TagRecord[]> {
  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.teamId, teamId)))
    .orderBy(tags.name);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    teamId: row.teamId,
    name: row.name,
    color: row.color ?? null,
    createdAt: row.createdAt,
  }));
}

export async function createTag(
  userId: string,
  teamId: string,
  name: string,
  color?: string | null,
): Promise<TagRecord> {
  const normalized = normalizeTagName(name);

  if (!normalized) {
    throw new Error("Tag name is required");
  }

  const [existing] = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.userId, userId),
        eq(tags.teamId, teamId),
        sql`lower(${tags.name}) = lower(${normalized})`,
      ),
    )
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      userId: existing.userId,
      teamId: existing.teamId,
      name: existing.name,
      color: existing.color ?? null,
      createdAt: existing.createdAt,
    };
  }

  const [created] = await db
    .insert(tags)
    .values({
      userId,
      teamId,
      name: normalized,
      color: color?.trim() ? color.trim() : null,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create tag");
  }

  return {
    id: created.id,
    userId: created.userId,
    teamId: created.teamId,
    name: created.name,
    color: created.color ?? null,
    createdAt: created.createdAt,
  };
}

async function assertBatchOwnership(batchId: string, userId: string): Promise<void> {
  const [row] = await db
    .select({ id: batches.id })
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.userId, userId)))
    .limit(1);

  if (!row) {
    throw new Error("Batch not found");
  }
}

export async function assignTagsToBatch(
  batchId: string,
  userId: string,
  teamId: string,
  tagIds: string[],
): Promise<TagRecord[]> {
  await assertBatchOwnership(batchId, userId);

  const uniqueTagIds = Array.from(new Set(tagIds.map((id) => id.trim()).filter(Boolean)));

  if (uniqueTagIds.length === 0) {
    await db
      .delete(batchTags)
      .where(and(eq(batchTags.batchId, batchId), eq(batchTags.userId, userId)));

    return [];
  }

  const tagRows = await db
    .select()
    .from(tags)
    .where(
      and(eq(tags.userId, userId), eq(tags.teamId, teamId), inArray(tags.id, uniqueTagIds)),
    );

  if (tagRows.length !== uniqueTagIds.length) {
    throw new Error("One or more tags were not found");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(batchTags)
      .where(and(eq(batchTags.batchId, batchId), eq(batchTags.userId, userId)));

    await tx.insert(batchTags).values(
      uniqueTagIds.map((tagId) => ({
        batchId,
        tagId,
        userId,
        teamId,
      })),
    );
  });

  return tagRows
    .map((row) => ({
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      name: row.name,
      color: row.color ?? null,
      createdAt: row.createdAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTagsForBatch(batchId: string, userId: string): Promise<TagRecord[]> {
  await assertBatchOwnership(batchId, userId);

  const rows = await db
    .select({
      id: tags.id,
      userId: tags.userId,
      teamId: tags.teamId,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    })
    .from(batchTags)
    .innerJoin(tags, eq(tags.id, batchTags.tagId))
    .where(and(eq(batchTags.batchId, batchId), eq(batchTags.userId, userId), eq(tags.userId, userId)))
    .orderBy(tags.name);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    teamId: row.teamId,
    name: row.name,
    color: row.color ?? null,
    createdAt: row.createdAt,
  }));
}
