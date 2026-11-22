import type { PartOfSpeech } from "@/shared/enums";

/** A meaning the user picked to save: from a dictionary entry or the AI context meaning. */
export type MeaningChoice = {
  /** Stable id of the picked meaning, so the save form resets when it changes. */
  key: string;
  /** The headword the meaning belongs to; saving "run"'s meaning saves "run". */
  term: string;
  text: string;
  partOfSpeech: PartOfSpeech;
};
