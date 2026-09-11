"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// Kept in one place so the accept attribute, the validation message, and the
// actual check can never drift out of sync with each other.
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const MAX_FILE_SIZE_MB = 5;

function validateImageFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionOk = ACCEPTED_EXTENSIONS.includes(extension);
  // Some browsers/OSes leave file.type empty for perfectly valid images —
  // only reject on type when the browser actually reported one we don't allow.
  const typeOk = !file.type || ACCEPTED_MIME_TYPES.includes(file.type);
  if (!extensionOk || !typeOk) return "Please choose a JPG, JPEG, PNG, or WEBP image.";
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `Image must be smaller than ${MAX_FILE_SIZE_MB}MB.`;
  return null;
}

// Self-contained "Profile Photo" section for a Settings page: current photo,
// Change/Remove actions, and a preview-before-you-save modal. It only ever
// calls the onSave/onRemove callbacks the page hands it — the page is what
// binds those to the signed-in user's own id, so this component has no way
// to touch anyone else's photo.
export function ProfilePhotoSection({
  photoUrl,
  name,
  onSave,
  onRemove,
}: {
  photoUrl?: string;
  name: string;
  onSave: (dataUrl: string) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      resetInput();
      return;
    }
    setError("");
    setPreview(URL.createObjectURL(file));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setPreview("");
    setError("");
    resetInput();
  };

  const save = () => {
    if (!preview) return;
    setSaving(true);
    onSave(preview);
    setSaving(false);
    closeModal();
  };

  return (
    <div className="flex items-center justify-between gap-4 p-5 rounded-md border border-outline-variant flex-wrap">
      <div className="flex items-center gap-4">
        <Avatar src={photoUrl} alt={name} size={64} />
        <div>
          <p className="text-sm font-medium">Profile Photo</p>
          <p className="text-xs text-ink-variant mt-0.5">JPG, JPEG, PNG or WEBP · up to {MAX_FILE_SIZE_MB}MB</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
          <Pencil size={13} /> Change Photo
        </Button>
        {photoUrl && onRemove && (
          <Button type="button" size="sm" variant="danger" onClick={onRemove}>
            <Trash2 size={13} /> Remove Photo
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && !modalOpen && <p className="text-xs text-error w-full">{error}</p>}

      <Modal open={modalOpen} onClose={closeModal} title="Update Profile Photo">
        <div className="flex flex-col items-center gap-5">
          <Avatar src={preview} alt="New profile photo preview" size={140} />
          {error && <p className="text-xs text-error">{error}</p>}
          <p className="text-xs text-ink-variant text-center">
            This preview isn't saved yet — your profile photo updates everywhere only after you save.
          </p>
          <div className="flex gap-3 w-full">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
