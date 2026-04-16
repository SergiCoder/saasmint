"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { removeMember, updateMemberRole } from "@/app/actions/org";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface MemberActionsProps {
  orgId: string;
  userId: string;
  currentRole: "admin" | "member";
  labels: {
    promoteToAdmin: string;
    demoteToMember: string;
    remove: string;
    removeConfirmTitle: string;
    removeConfirmBody: string;
    removeConfirmAction: string;
    cancel: string;
  };
}

export function MemberActions({
  orgId,
  userId,
  currentRole,
  labels,
}: MemberActionsProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  const handleRole = (role: "admin" | "member") => {
    setOpen(false);
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("userId", userId);
    formData.set("role", role);
    startTransition(async () => {
      await updateMemberRole(formData);
    });
  };

  const handleRemove = () => {
    setOpen(false);
    confirmRef.current?.open();
  };

  const confirmRemove = () => {
    confirmRef.current?.close();
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("userId", userId);
    startTransition(async () => {
      await removeMember(formData);
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="cursor-pointer rounded-md px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        aria-label="Member actions"
      >
        ···
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-20 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {currentRole === "member" ? (
                <button
                  type="button"
                  onClick={() => handleRole("admin")}
                  className="w-full cursor-pointer px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {labels.promoteToAdmin}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRole("member")}
                  className="w-full cursor-pointer px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {labels.demoteToMember}
                </button>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="w-full cursor-pointer px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                {labels.remove}
              </button>
            </div>
          </>,
          document.body,
        )}

      <ConfirmDialog
        ref={confirmRef}
        title={labels.removeConfirmTitle}
        body={labels.removeConfirmBody}
        confirmLabel={labels.removeConfirmAction}
        cancelLabel={labels.cancel}
        loading={isPending}
        onConfirm={confirmRemove}
      />
    </>
  );
}
