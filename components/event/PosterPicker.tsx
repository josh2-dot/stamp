"use client";

import { useRef, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface PosterPickerProps {
  /** Currently saved poster URL (from DB), if any */
  initialUrl?: string | null;
  /** Local file the user just selected (not yet uploaded) */
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
  /** Optional handler for removing an already-saved poster */
  onRemove?: () => Promise<void> | void;
  /** Hide the remove button (e.g. during create flow) */
  allowRemove?: boolean;
  /** Show an "Uploading…" pill while the parent saves */
  uploading?: boolean;
  /** Error to display under the picker */
  error?: string | null;
}

const ACCEPTED = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export function PosterPicker({
  initialUrl,
  pendingFile,
  onPendingFileChange,
  onRemove,
  allowRemove = true,
  uploading = false,
  error,
}: PosterPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Local preview: either from a freshly-picked File or the persisted URL
  const previewUrl = pendingFile ? URL.createObjectURL(pendingFile) : initialUrl ?? null;

  const validate = (file: File): string | null => {
    if (!file.type.startsWith("image/")) return "Pick an image file.";
    if (file.size > MAX_BYTES) return "Image must be under 5MB.";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return "Use JPG, PNG, or WebP.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    setLocalError(null);
    const err = validate(file);
    if (err) {
      setLocalError(err);
      return;
    }
    onPendingFileChange(file);
  };

  const clearPending = () => {
    onPendingFileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const showRemove = allowRemove && (pendingFile || initialUrl);
  const visibleError = error ?? localError;

  return (
    <div>
      <Eyebrow>Poster (optional)</Eyebrow>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "mt-3 rounded-lg border border-dashed transition-colors",
          dragOver
            ? "border-stamp-orange bg-stamp-orange/5"
            : "border-stamp-border bg-stamp-surface2/50",
          previewUrl ? "p-0 overflow-hidden" : "p-6",
        )}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Event poster"
              className="w-full aspect-[16/9] object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-stamp-black/90 via-stamp-black/60 to-transparent flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
              {showRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (pendingFile) {
                      clearPending();
                    } else if (onRemove) {
                      await onRemove();
                    }
                  }}
                  disabled={uploading}
                  className="text-stamp-red hover:bg-stamp-red/10"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-stamp-muted-2">
              Drag an image here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-stamp-orange hover:underline"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-stamp-muted-2 mt-2">
              16:9 works best · JPG, PNG, or WebP · Max 5MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {visibleError && (
        <p className="mt-2 text-xs text-stamp-red">{visibleError}</p>
      )}
    </div>
  );
}
