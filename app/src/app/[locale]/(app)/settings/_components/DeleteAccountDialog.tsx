"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/presentation/components/atoms/Button";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { deleteAccount } from "@/app/actions/user";

interface DeleteAccountDialogProps {
  userEmail: string;
}

export function DeleteAccountDialog({ userEmail }: DeleteAccountDialogProps) {
  const t = useTranslations("settings");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      setEmail("");
      setError(null);
    }
  }, [open]);

  function handleClose() {
    if (!pending) setOpen(false);
  }

  async function handleSubmit() {
    if (email !== userEmail) {
      setError(t("deleteDialogMismatch"));
      return;
    }

    setPending(true);
    setError(null);
    const result = await deleteAccount();
    if (result.error) {
      setError(t("deleteDialogError"));
      setPending(false);
      return;
    }
    router.replace("/login?deleted=true");
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t("deleteAccount")}
      </Button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("deleteDialogTitle")}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {t("deleteDialogDescription")}
          </p>

          {error && (
            <div className="mt-4">
              <AlertBanner variant="error">{error}</AlertBanner>
            </div>
          )}

          <div className="mt-4 space-y-1">
            <label
              htmlFor="delete-confirm-email"
              className="block text-sm font-medium text-gray-700"
            >
              {t("deleteDialogLabel")}
            </label>
            <input
              id="delete-confirm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("deleteDialogPlaceholder")}
              disabled={pending}
              className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={pending}
            >
              {t("deleteDialogCancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              loading={pending}
              disabled={email.length === 0}
            >
              {t("deleteDialogSubmit")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
