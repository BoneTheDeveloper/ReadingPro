"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidYouTubeUrl } from "@/utils/youtube-url-helper";
import { checkTranscriptAvailability} from "@/features/upload/server/actions/check-youtube-transcript";

function extractVideoId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

interface YouTubeInputProps {
  onSubmit: (url: string) => Promise<void>;
  isProcessing: boolean;
}

export function YouTubeInput({ onSubmit, isProcessing }: YouTubeInputProps) {
  const t = useTranslations("Study");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [isTranscriptValid, setIsTranscriptValid] = useState(false);


  useEffect(() => {
    if (!isValidYouTubeUrl) return;
    const videoId = extractVideoId(url);
    if (!videoId) return;


    const delayDebounceFn = setTimeout(async () => {
      const result = await checkTranscriptAvailability(videoId);

      if (result.success) {
        setIsTranscriptValid(true);
        setError(null);
      } else {
        setIsTranscriptValid(false);
        setError(result.message);
      }
      setIsValidating(false);
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [url, isValidYouTubeUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidYouTubeUrl || !isTranscriptValid) return;

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
          {isValidating && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!isValidYouTubeUrl || !isTranscriptValid || isProcessing || isValidating}
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
