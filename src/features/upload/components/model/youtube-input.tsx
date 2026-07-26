"use client";

import { useState, useMemo } from "react";
import { PlayCircle, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidYouTubeUrl } from "@/utils/youtube-url";

interface YouTubeInputProps {
  onSubmit: (url: string) => Promise<void>;
}

export function YouTubeInput({ onSubmit }: YouTubeInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUrlFormatValid = useMemo(() => url.trim().length > 0 && isValidYouTubeUrl(url), [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setUrl(text);
      setError(null);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUrlFormatValid) {
      setError("URL YouTube không hợp lệ");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải lên thất bại");
    } finally {
      setIsSubmitting(false);
    }
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
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!isUrlFormatValid || isSubmitting} className="w-full">
        Thêm
      </Button>
    </form>
  );
}
