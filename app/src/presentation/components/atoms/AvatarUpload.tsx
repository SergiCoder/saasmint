"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Avatar } from "./Avatar";

export interface AvatarUploadProps {
  currentSrc?: string | null;
  userName: string;
  uploadLabel: string;
  removeLabel: string;
  loading?: boolean;
  onChange?: (file: File | null) => void;
}

export function AvatarUpload({
  currentSrc,
  userName,
  uploadLabel,
  removeLabel,
  loading = false,
  onChange,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [removed, setRemoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(file);
      setPreview(url);
      setHasFile(true);
      setRemoved(false);
      onChange?.(file);
    }
  }

  function handleRemove() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setHasFile(false);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = "";
    onChange?.(null);
  }

  const displaySrc = preview ?? (removed ? null : currentSrc);
  const showRemove = hasFile || (!!currentSrc && !removed);

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={displaySrc} alt={userName} size="lg" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60">
            <div className="border-primary-600 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
        >
          {uploadLabel}
        </button>
        {showRemove && (
          <button
            type="button"
            disabled={loading}
            onClick={handleRemove}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
          >
            {removeLabel}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
        aria-label={uploadLabel}
      />
    </div>
  );
}
