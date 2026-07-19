"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { createPost } from "@/app/(dashboard)/posts/actions";
import MediaUploader from "@/components/posts/MediaUploader";

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "X", "YouTube"];
const CONTENT_TYPES = ["image", "video", "carousel", "text"];

export default function NewPostForm() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [caption, setCaption] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  function togglePlatform(platform: string) {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createPost({ platforms, contentType, caption, scheduledFor: scheduledFor || undefined, mediaUrls });
      showToast("Post aangemaakt");
    } catch (err) {
      setLoading(false);
      showToast(err instanceof Error ? err.message : "Aanmaken mislukt", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <button
              type="button"
              key={platform}
              onClick={() => togglePlatform(platform)}
              disabled={loading}
              className={`min-h-11 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                platforms.includes(platform)
                  ? "bg-brand-green text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content type</label>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          disabled={loading}
          className="input-field"
        >
          {CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <MediaUploader onChange={setMediaUrls} onUploadingChange={setMediaUploading} disabled={loading} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          required
          disabled={loading}
          rows={5}
          placeholder="Schrijf je caption..."
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inplannen voor (optioneel)
        </label>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          disabled={loading}
          className="input-field"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leeg laten om als concept op te slaan.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || mediaUploading}
        className="w-full sm:w-auto btn-primary disabled:opacity-50"
      >
        {loading ? "Bezig..." : mediaUploading ? "Media wordt geüpload..." : "Post opslaan"}
      </button>
    </form>
  );
}
