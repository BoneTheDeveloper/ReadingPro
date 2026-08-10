"use client";

import { useState, useMemo } from "react";
import { PlayCircle, Clipboard } from "lucide-react";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { isValidYouTubeUrl } from "@/features/passage/util/youtube-helper";
import { YOUTUBE_ERRORS } from "@/features/passage/util/upload-config";

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
  submitError?: string | null;
  onEdit?: () => void;
}

export function YouTubeInput({ onSubmit, disabled, submitError, onEdit }: YouTubeInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isUrlFormatValid = useMemo(() => url.trim().length > 0 && isValidYouTubeUrl(url), [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setUrl(text);
      setError(null);
      onEdit?.();
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUrlFormatValid) {
      setError(YOUTUBE_ERRORS.URL_INVALID);
      return;
    }
    setError(null);
    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="youtube-url" className="text-sm font-medium">YouTube URL</label>
        <div className="relative">
          <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="youtube-url"
            type="url"
            placeholder="Nhập URL YouTube"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); onEdit?.(); }}
            className="pl-10 pr-10"
          />
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Chức năng chỉ hỗ trợ video có phụ đề.
        </p>
      </div>
      {(error ?? submitError) && (
        <p className="text-sm text-destructive">{error ?? submitError}</p>
      )}
      <Button type="submit" disabled={!isUrlFormatValid || disabled} className="w-full">
        Thêm
      </Button>
    </form>
  );
}
