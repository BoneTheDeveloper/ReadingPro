"use server";
export async function checkTranscriptAvailability(videoId: string) {
  try {
    const { fetchTranscript } = await import("../services/parsers/youtube-transcript");
    const transcript = await fetchTranscript(videoId);

    if (!transcript) {
      return { success: false, message: "Video này không có phụ đề/captions." };
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: "Không thể kiểm tra phụ đề video này." };
  }
}
