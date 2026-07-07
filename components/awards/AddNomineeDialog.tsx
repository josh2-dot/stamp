"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface AddNomineeDialogProps {
  categoryId: string;
  categoryLabel: string;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Organizer adds a nominee directly to the ballot — no public nomination
 * required. Used in two scenarios:
 *
 *   1. Organizer knows the nominees ahead of time and wants to skip the
 *      public-nominations phase entirely
 *   2. Public nominations happened, but the organizer wants to add
 *      someone the public missed
 *
 * Only shown during phases where the ballot is still mutable: draft,
 * nominations_open, moderation. The parent hides the "Add nominee" button
 * outside those phases.
 */
export function AddNomineeDialog({
  categoryId,
  categoryLabel,
  onClose,
  onAdded,
}: AddNomineeDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Nominee name is required.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/awards/categories/${categoryId}/nominees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name.trim(),
        description: description.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't add nominee.");
      setSaving(false);
      return;
    }
    onAdded();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-md">
        <Card className="space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <Eyebrow>Add nominee</Eyebrow>
              <h2 className="font-display text-display-sm text-stamp-white mt-1 text-balance">
                {categoryLabel}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stamp-muted-2 hover:text-stamp-white text-sm"
              disabled={saving}
            >
              Close
            </button>
          </div>

          <Input
            label="Nominee name"
            placeholder="Sultan Chuku"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <Input
            label="Description (optional)"
            placeholder="e.g. 400L Computer Science"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            hint="Shows under their name on the voting page."
          />

          {error && (
            <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stamp-border">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button glow onClick={handleSave} loading={saving}>
              Add to ballot
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
