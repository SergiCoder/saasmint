"use client";

import { useRef, useState, useTransition } from "react";
import { deleteOrg } from "@/app/actions/org";
import { Button } from "@/presentation/components/atoms/Button";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface DeleteOrgButtonProps {
  orgId: string;
  label: string;
  confirmTitle: string;
  confirmBody: string;
  confirmAction: string;
  confirmDismiss: string;
}

export function DeleteOrgButton({
  orgId,
  label,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
}: DeleteOrgButtonProps) {
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    confirmRef.current?.open();
  };

  const confirm = () => {
    const formData = new FormData();
    formData.set("orgId", orgId);
    startTransition(async () => {
      try {
        await deleteOrg(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  };

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <Button type="button" variant="danger" onClick={open}>
        {label}
      </Button>
      <ConfirmDialog
        ref={confirmRef}
        title={confirmTitle}
        body={confirmBody}
        confirmLabel={confirmAction}
        cancelLabel={confirmDismiss}
        variant="danger"
        loading={isPending}
        onConfirm={confirm}
        onClose={() => setError(null)}
      />
    </>
  );
}
