"use client";

import { extractVideoId } from "@/features/upload/lib/youtube-url";

interface YouTubeEmbedProps {
  url: string;
}

export function YouTubeEmbed({ url }: YouTubeEmbedProps) {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full rounded-lg"
      />
    </div>
  );
}
