"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
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
 * required. Sheet primitive so on mobile the "Add to ballot" CTA lands
 * in the thumb zone.
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
    <Sheet open onClose={onClose} maxWidth="md" dismissible={!saving} ariaLabel="Add nominee">
      <div className="sticky top-0 bg-stamp-surface z-10 px-5 sm:px-6 pt-4 pb-3 border-b border-stamp-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>Add nominee</Eyebrow>
            <h2 className="font-display text-display-sm text-stamp-white mt-1.5 text-balance">
              {categoryLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
            className="shrink-0 -mr-2 -mt-1 w-10 h-10 rounded-md flex items-center justify-center text-stamp-muted-2 hover:text-stamp-white hover:bg-stamp-surface2 transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-4">
        <Input
          label="Nominee name"
          placeholder="Sultan Chuku"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          autoComplete="name"
        />
        <Input
          label="Description (optional)"
          placeholder="e.g. 400L Computer Science"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Shows under their name on the voting page."
        />
        {error && (
          <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-stamp-surface border-t border-stamp-border px-5 sm:px-6 pt-4 pb-safe-plus-4 sm:pb-4 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3 sm:justify-start">
        <Button glow size="lg" fullWidth onClick={handleSave} loading={saving} className="sm:w-auto">
          Add to ballot
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onClose} disabled={saving} className="sm:w-auto">
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}