import { PartOfSpeech } from "@/shared/enums";

/** Vietnamese labels for the part-of-speech badges and the save form. */
export const PART_OF_SPEECH_LABEL: Record<PartOfSpeech, string> = {
  NOUN: "danh từ",
  VERB: "động từ",
  ADJECTIVE: "tính từ",
  ADVERB: "trạng từ",
  PREPOSITION: "giới từ",
  CONJUNCTION: "liên từ",
  PHRASE: "cụm từ",
  OTHER: "khác",
};

export const PART_OF_SPEECH_OPTIONS = Object.values(PartOfSpeech);
