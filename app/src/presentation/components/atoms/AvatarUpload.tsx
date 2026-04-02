"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Avatar } from "./Avatar";

export interface AvatarUploadProps {
  currentSrc?: string | null;
  userName: string;
  uploadLabel: string;
  removeLabel: string;
  onChange?: (file: File | null) => void;
}

export function AvatarUpload({
  currentSrc,
  userName,
  uploadLabel,
  removeLabel,
  onChange,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [removed, setRemoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setHasFile(true);
      setRemoved(false);
      onChange?.(file);
    }
  }

  function handleRemove() {
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
      <Avatar src={displaySrc} alt={userName} size="lg" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          {uploadLabel}
        </button>
        {showRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-red-600"
          >
            {removeLabel}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-label={uploadLabel}
      />
    </div>
  );
}
