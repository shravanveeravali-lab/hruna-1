"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { UploadingImageGrid } from "@/components/ui/UploadingImageGrid";
import type { UploadedImage } from "@/lib/customer/upload-client";

export const DIARY_MOODS = ["Romantic", "Bold", "Minimal", "Nostalgic", "Playful", "Elegant"];

export type DiaryEntryDraft = { title: string; note: string; mood: string; images: UploadedImage[] };

const EMPTY_DRAFT: DiaryEntryDraft = { title: "", note: "", mood: DIARY_MOODS[0], images: [] };

// Shared by the Fashion Diary list page (add) and the entry detail page
// (edit) so the fields, validation, and Save/Cancel behavior can't drift
// between the two — the same form either creates a new entry or patches
// the one it was opened for.
export function DiaryEntryModal({
  open,
  mode,
  initial,
  saving = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "add" | "edit";
  initial?: DiaryEntryDraft;
  // Owned by the calling page (which runs the actual fetch), not this modal — keeps the modal a
  // plain controlled form with no async logic of its own, matching how `onClose` is already
  // guarded by the caller's own `saving` state. Without this, the Save button had no loading/
  // disabled state at all during submit, unlike every other form in the app.
  saving?: boolean;
  onClose: () => void;
  onSubmit: (draft: DiaryEntryDraft) => void;
}) {
  const [draft, setDraft] = useState<DiaryEntryDraft>(initial ?? EMPTY_DRAFT);

  // Reload the form from `initial` every time the modal opens, so editing a
  // second entry (or cancelling out of the first) never leaks stale values.
  useEffect(() => {
    if (open) setDraft(initial ?? EMPTY_DRAFT);
  }, [open, initial]);

  const save = () => {
    if (!draft.title.trim()) return;
    onSubmit(draft);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "edit" ? "Edit diary entry" : "New diary entry"}>
      <div className="flex flex-col gap-5">
        <Field label="Title" htmlFor="dtitle" required>
          <Input id="dtitle" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
        </Field>
        <Field label="Mood" htmlFor="dmood">
          <Select id="dmood" value={draft.mood} onChange={(e) => setDraft((d) => ({ ...d, mood: e.target.value }))}>
            {DIARY_MOODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" htmlFor="dnote">
          <Textarea id="dnote" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
        </Field>
        <Field label="Images" htmlFor="dimages">
          <UploadingImageGrid
            images={draft.images}
            onChange={(images) => setDraft((d) => ({ ...d, images }))}
            bucket="diaryImages"
            entityType="diary_image"
            max={4}
          />
        </Field>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save} disabled={saving || !draft.title.trim()}>
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Save Entry"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
