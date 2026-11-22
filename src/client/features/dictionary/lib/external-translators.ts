/** Outside translators and dictionaries, opened in one reused popup window. */
export type ExternalTranslator = {
  id: string;
  label: string;
  /** Null when this translator has nothing to show for the input (e.g. no sentence). */
  url: (word: string, sentence?: string | null) => string | null;
};

const q = encodeURIComponent;

export const EXTERNAL_TRANSLATORS: ExternalTranslator[] = [
  {
    id: "google-word",
    label: "Google Dịch",
    url: (word) => `https://translate.google.com/?sl=en&tl=vi&text=${q(word)}&op=translate`,
  },
  {
    id: "google-sentence",
    label: "Google Dịch (câu)",
    url: (_word, sentence) =>
      sentence ? `https://translate.google.com/?sl=en&tl=vi&text=${q(sentence)}&op=translate` : null,
  },
  {
    id: "cambridge",
    label: "Cambridge",
    url: (word) => `https://dictionary.cambridge.org/dictionary/english-vietnamese/${q(word.toLowerCase())}`,
  },
  {
    id: "oxford",
    label: "Oxford Learner's",
    url: (word) => `https://www.oxfordlearnersdictionaries.com/definition/english/${q(word.toLowerCase())}`,
  },
  {
    id: "deepl",
    label: "DeepL",
    url: (word, sentence) => `https://www.deepl.com/translator#en/vi/${q(sentence ?? word)}`,
  },
];

const WINDOW_NAME = "readingpro-translator";
const WINDOW_FEATURES = "popup,noopener,noreferrer,width=560,height=760";

/** The fixed window name makes every translator reuse the same popup. */
export function openTranslator(url: string): void {
  window.open(url, WINDOW_NAME, WINDOW_FEATURES);
}
