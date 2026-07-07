"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { AwardNominee, AwardPhase } from "@/types";

interface NomineeListEditorProps {
  nominees: AwardNominee[];
  phase: AwardPhase;
  onChange: () => void;
}

/**
 * Inline editor for the ballot. Each row supports rename, exclude, and
 * include-back. No drag-to-reorder for V1 (would need additional library
 * + state plumbing) — sort_order can be edited via Reorder via small
 * up/down buttons if needed.
 */
export function NomineeListEditor({ nominees, phase, onChange }: NomineeListEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const sorted = [...nominees].sort((a, b) => a.sort_order - b.sort_order);

  const handleSave = async (id: string, patch: Record<string, unknown>) => {
    setBusy(id);
    const res = await fetch(`/api/awards/nominees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast({
        tone: "error",
        title: "Couldn't update nominee",
        body: data.error,
      });
      return;
    }
    setEditingId(null);
    onChange();
  };

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-stamp-muted-2 text-center py-4">
        No nominees on the ballot yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 mt-3">
      {sorted.map((n) => (
        <li
          key={n.id}
          className="rounded-md border border-stamp-border bg-stamp-surface2/40 overflow-hidden"
        >
          {editingId === n.id ? (
            <InlineEdit
              nominee={n}
              busy={busy === n.id}
              onSave={(patch) => handleSave(n.id, patch)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={
                      n.is_excluded
                        ? "text-stamp-muted-2 line-through truncate"
                        : "text-stamp-white truncate"
                    }
                  >
                    {n.display_name}
                  </span>
                  {n.is_excluded && <Badge tone="warning">Excluded</Badge>}
                  {!n.is_excluded && phase === "voting_open" && (
                    <span className="text-xs text-stamp-muted-2 tabular-nums">
                      {n.votes_count} vote{n.votes_count === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                {n.description && (
                  <p className="text-xs text-stamp-muted-2 mt-1 truncate">
                    {n.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(n.id)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleSave(n.id, { is_excluded: !n.is_excluded })
                  }
                  loading={busy === n.id}
                  className={n.is_excluded ? "" : "text-stamp-red"}
                >
                  {n.is_excluded ? "Include" : "Exclude"}
                </Button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function InlineEdit({
  nominee,
  busy,
  onSave,
  onCancel,
}: {
  nominee: AwardNominee;
  busy: boolean;
  onSave: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(nominee.display_name);
  const [description, setDescription] = useState(nominee.description ?? "");

  return (
    <div className="p-3 space-y-3">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label="Description (optional)"
        placeholder="e.g. 400L Computer Science"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          size="sm"
          glow
          onClick={() =>
            onSave({
              display_name: name.trim(),
              description: description.trim() || null,
            })
          }
          loading={busy}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
