"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TagOption = {
  id: string;
  name: string;
  color: string | null;
};

type TagSelectorProps = {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
};

function normalizeHex(color: string): string {
  const value = color.trim();
  if (!value) {
    return "";
  }

  return value.startsWith("#") ? value : `#${value}`;
}

export function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [options, setOptions] = useState<TagOption[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadTags = async () => {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/tags", { method: "GET" });
      const json = await response.json().catch(() => null);

      if (!active) {
        return;
      }

      if (!response.ok || !json?.ok || !Array.isArray(json.data)) {
        setError("Failed to load tags");
        setIsLoading(false);
        return;
      }

      setOptions(json.data as TagOption[]);
      setIsLoading(false);
    };

    void loadTags();

    return () => {
      active = false;
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);

  function toggleTag(tagId: string) {
    if (selectedSet.has(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
      return;
    }

    onChange([...selectedTagIds, tagId]);
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) {
      setError("Tag name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        color: normalizeHex(newTagColor) || null,
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok || !json.data) {
      setError(json?.error ?? "Failed to create tag");
      setIsCreating(false);
      return;
    }

    const created = json.data as TagOption;
    setOptions((prev) => {
      const existing = prev.some((tag) => tag.id === created.id);
      if (existing) {
        return prev;
      }
      return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
    });

    if (!selectedSet.has(created.id)) {
      onChange([...selectedTagIds, created.id]);
    }

    setNewTagName("");
    setNewTagColor("");
    setIsCreating(false);
  }

  return (
    <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">Tags</p>
        <p className="text-xs text-zinc-500">Assign one or more tags for grouping and filtering.</p>
      </div>

      {isLoading ? (
        <p className="text-xs text-zinc-500">Loading tags...</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-zinc-500">No tags yet. Create your first one below.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((tag) => {
            const selected = selectedSet.has(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
               
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-[1fr_140px_auto] md:items-end">
        <div className="space-y-1">
          <Label htmlFor="newTagName">New Tag</Label>
          <Input
            id="newTagName"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="customer-acme"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="newTagColor">Color (optional)</Label>
          <Input
            id="newTagColor"
            value={newTagColor}
            onChange={(event) => setNewTagColor(event.target.value)}
            placeholder="#0ea5e9"
          />
        </div>
        <Button type="button" variant="outline" onClick={handleCreateTag} disabled={isCreating}>
          {isCreating ? "Creating..." : "Create Tag"}
        </Button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

