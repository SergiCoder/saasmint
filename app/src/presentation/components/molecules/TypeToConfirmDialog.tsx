"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";

export interface TypeToConfirmDialogProps {
  /** Trigger button label — also the dialog's visible action affordance. */
  triggerLabel: string;
  /** Heading inside the modal. */
  title: string;
  /** Explanatory paragraph under the heading. */
  description: string;
  /** Label for the confirmation text input. */
  inputLabel: string;
  /** Placeholder shown inside the confirmation input. */
  inputPlaceholder: string;
  /** Input type — `text` for free-form confirmations like org name, `email`
   *  for account deletion where the confirm value is an email. */
  inputType?: "text" | "email";
  /** The exact value the user must type to enable submission. */
  expectedValue: string;
  /** Error shown when the typed value does not match `expectedValue`. */
  mismatchError: string;
  /** Cancel button label. */
  cancelLabel: string;
  /** Submit (destructive action) button label. */
  submitLabel: string;
  /**
   * Invoked when the user submits with a matching value. Returns `null` on
   * success (caller is expected to navigate away — the dialog stays mounted
   * until unmount) or an error message to display. Pending state is driven
   * internally via `useTransition`.
   */
  onConfirm: () => Promise<string | null>;
}

const INPUT_CLASS =
  "focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function TypeToConfirmDialog({
  triggerLabel,
  title,
  description,
  inputLabel,
  inputPlaceholder,
  inputType = "text",
  expectedValue,
  mismatchError,
  cancelLabel,
  submitLabel,
  onConfirm,
}: TypeToConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  function handleClose() {
    // Always reconcile React state with the DOM close (native ESC fires this
    // too). Clearing the input/error only when not pending avoids wiping the
    // UI mid-submit on an accidental close race.
    setOpen(false);
    if (!pending) {
      setValue("");
      setError(null);
    }
  }

  function handleSubmit() {
    if (value !== expectedValue) {
      setError(mismatchError);
      return;
    }
    setError(null);
    startTransition(async () => {
      const errorMessage = await onConfirm();
      if (errorMessage !== null) {
        setError(errorMessage);
      }
    });
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        // Block ESC dismissal while the destructive action is in flight so
        // the user can't race the server call by collapsing the confirm UI.
        onCancel={(e) => {
          if (pending) e.preventDefault();
        }}
        className="mx-auto my-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{description}</p>

          {error && (
            <div className="mt-4">
              <AlertBanner variant="error">{error}</AlertBanner>
            </div>
          )}

          <div className="mt-4 space-y-1">
            <label
              htmlFor="type-to-confirm-input"
              className="block text-sm font-medium text-gray-700"
            >
              {inputLabel}
            </label>
            <input
              id="type-to-confirm-input"
              type={inputType}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={pending}
              className={INPUT_CLASS}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              loading={pending}
              disabled={value.length === 0}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
