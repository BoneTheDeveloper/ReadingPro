"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidYouTubeUrl } from "@/features/upload/lib/youtube-url";

interface YouTubeInputProps {
  onSubmit: (url: string) => Promise<void>;
  isProcessing: boolean;
}

export function YouTubeInput({ onSubmit, isProcessing }: YouTubeInputProps) {
  const t = useTranslations("Study");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = url.trim().length > 0 && isValidYouTubeUrl(url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl) return;

    setError(null);
    try {
      await onSubmit(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="youtube-url" className="text-sm font-medium">
          YouTube URL
        </label>
        <div className="relative">
          <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="youtube-url"
            type="url"
            placeholder={t("enterYoutubeUrl")}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            disabled={isProcessing}
            className="pl-10"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={!isValidUrl || isProcessing} className="w-full">
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          t("add")
        )}
      </Button>
    </form>
  );
}
