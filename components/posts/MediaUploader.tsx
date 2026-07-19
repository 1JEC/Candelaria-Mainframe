"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  blobUrl?: string;
  error?: string;
};

const MAX_SIZE_BYTES = 200 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export default function MediaUploader({
  onChange,
  onUploadingChange,
  disabled,
}: {
  onChange: (urls: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const done = items.filter((i) => i.status === "done" && i.blobUrl).map((i) => i.blobUrl as string);
    onChange(done);
    onUploadingChange?.(items.some((i) => i.status === "uploading"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;

    const files = Array.from(fileList);
    for (const file of files) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setItems((prev) => [
          ...prev,
          { id, file, previewUrl, status: "error", error: "Bestandstype niet ondersteund" },
        ]);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setItems((prev) => [
          ...prev,
          { id, file, previewUrl, status: "error", error: "Bestand is groter dan 200MB" },
        ]);
        continue;
      }

      setItems((prev) => [...prev, { id, file, previewUrl, status: "uploading" }]);

      upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/posts/upload",
      })
        .then((blob) => {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: "done", blobUrl: blob.url } : item))
          );
        })
        .catch((err) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, status: "error", error: err instanceof Error ? err.message : "Upload mislukt" }
                : item
            )
          );
        });
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  const isUploading = items.some((i) => i.status === "uploading");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Foto&apos;s / video</label>

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              {item.file.type.startsWith("video/") ? (
                <video src={item.previewUrl} controls muted className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
              )}

              {item.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Uploaden...</span>
                </div>
              )}
              {item.status === "error" && (
                <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center p-2">
                  <span className="text-white text-xs font-medium text-center">{item.error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label="Verwijderen"
                className="absolute top-1 right-1 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white text-lg leading-none hover:bg-black/80"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-all">
        + Foto of video toevoegen
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {isUploading && <p className="text-xs text-gray-500">Bezig met uploaden...</p>}
    </div>
  );
}
