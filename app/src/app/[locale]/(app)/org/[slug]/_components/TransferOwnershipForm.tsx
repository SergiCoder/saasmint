"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { transferOwnership } from "@/app/actions/org";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { INPUT_DEFAULT_CLASS } from "@/presentation/components/atoms/Input";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface TransferCandidate {
  id: string;
  fullName: string;
}

interface TransferOwnershipFormProps {
  orgId: string;
  candidates: TransferCandidate[];
  label: string;
  selectLabel: string;
  confirmTitle: string;
  confirmBody: string;
  confirmAction: string;
  confirmDismiss: string;
}

export function TransferOwnershipForm({
  orgId,
  candidates,
  label,
  selectLabel,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
}: TransferOwnershipFormProps) {
  const translateError = useActionErrorMessage();
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [state, formAction] = useActionState(transferOwnership, null);
  const [isPending, startTransition] = useTransition();

  const selectedName =
    candidates.find((c) => c.id === selectedUserId)?.fullName ?? "";

  const open = () => {
    if (!selectedUserId) return;
    confirmRef.current?.open();
  };

  const confirm = () => {
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("userId", selectedUserId);
    startTransition(() => {
      formAction(formData);
    });
    confirmRef.current?.close();
  };

  return (
    <>
      {state && !state.ok && (
        <AlertBanner variant="error">{translateError(state)}</AlertBanner>
      )}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="transfer-user"
            className="block text-sm font-medium text-gray-700"
          >
            {selectLabel}
          </label>
          <select
            id="transfer-user"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className={`${INPUT_DEFAULT_CLASS} cursor-pointer`}
          >
            <option value="" disabled>
              —
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={open}
          disabled={!selectedUserId}
        >
          {label}
        </Button>
      </div>

      <ConfirmDialog
        ref={confirmRef}
        title={confirmTitle}
        body={confirmBody.replace("{name}", selectedName)}
        confirmLabel={confirmAction}
        cancelLabel={confirmDismiss}
        variant="danger"
        loading={isPending}
        onConfirm={confirm}
      />
    </>
  );
}
