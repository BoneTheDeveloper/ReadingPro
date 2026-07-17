"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Loader2, PlayCircle, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidYouTubeUrl, extractVideoId } from "@/utils/youtube-url-helper";
import { checkTranscriptAvailability} from "@/features/upload/server/actions/check-youtube-transcript";

interface YouTubeInputProps {
  onSubmit: (url: string) => Promise<void>;
  onUploadStart?: () => void;
  isProcessing: boolean;
}

export function YouTubeInput({ onSubmit, onUploadStart, isProcessing }: YouTubeInputProps) {
  const t = useTranslations("Study");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [isTranscriptValid, setIsTranscriptValid] = useState(false);

  const isUrlFormatValid = useMemo(
    () => url.trim().length > 0 && isValidYouTubeUrl(url),
    [url]
  );

  useEffect(() => {
    if (!isUrlFormatValid) return;
    const videoId = extractVideoId(url);
    if (!videoId) return;

    const delayDebounceFn = setTimeout(async () => {
      const result = await checkTranscriptAvailability(videoId);

      if (result.success) {
        setIsTranscriptValid(true);
        setError(null);
      } else {
        setIsTranscriptValid(false);
        setError(result.message ?? "Unable to validate video");
      }
      setIsValidating(false);
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [url, isUrlFormatValid]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const isFormatValid = text.trim().length > 0 && isValidYouTubeUrl(text);
        setUrl(text);
        setError(null);
        setIsTranscriptValid(false);
        setIsValidating(isFormatValid);
      }
    } catch {
      // Clipboard access denied or not available
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUrlFormatValid || !isTranscriptValid) return;

    setError(null);
    onUploadStart?.();
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
              const newUrl = e.target.value;
              const isFormatValid = newUrl.trim().length > 0 && isValidYouTubeUrl(newUrl);

              setUrl(newUrl);
              setError(null);
              setIsTranscriptValid(false);
              setIsValidating(isFormatValid);
            }}
            disabled={isProcessing}
            className="pl-10 pr-10"
          />
          {isValidating ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Paste from clipboard"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!isUrlFormatValid || !isTranscriptValid || isProcessing || isValidating}
        className="w-full"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          t("add")
        )}
      </Button>
    </form>
  );
}
