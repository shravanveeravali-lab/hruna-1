"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/hooks/use-toast";

const CONFIRM_PHRASE = "DELETE";

// Settings > Security's Delete Account. See app/api/account/delete/route.ts for why this can't be
// an unconditional action — a customer with any real history (requests/projects/reviews/etc.) is
// refused by the database itself, by design, and is redirected to Contact Support instead of a
// silent failure.
export function DeleteAccountSection() {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setConfirmText("");
    setError("");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't delete your account.");
      push("Your account has been deleted.", "info");
      // The account (and its session) is gone server-side — send them to the public landing page,
      // not anywhere that assumes a signed-in customer.
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  };

  return (
    <div className="p-5 rounded-md border border-error/30 bg-error-container/20">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-error shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Delete Account</p>
          <p className="text-xs text-ink-variant mt-1 max-w-sm">
            Permanently delete your HRUNA account. This can't be undone. Accounts with existing
            requests, projects, or other activity can't be deleted automatically — contact support
            instead.
          </p>
        </div>
      </div>
      <Button variant="danger" size="sm" className="mt-4" onClick={() => setOpen(true)}>
        Delete Account
      </Button>

      <Modal open={open} onClose={close} title="Delete your account?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-variant">
            This permanently deletes your HRUNA account and everything tied only to it. This
            cannot be undone.
          </p>
          <Field label={`Type "${CONFIRM_PHRASE}" to confirm`} htmlFor="confirmDelete" error={error}>
            <Input
              id="confirmDelete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={close} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={confirmDelete}
              disabled={deleting || confirmText !== CONFIRM_PHRASE}
            >
              {deleting ? "Deleting…" : "Delete Account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
