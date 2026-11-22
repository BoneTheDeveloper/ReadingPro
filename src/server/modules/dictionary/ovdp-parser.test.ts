import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDictionary, parseOvdpDefinition, partOfSpeechFromLabel } from "./ovdp-parser";
import { readStardictZip } from "./stardict-reader";

// Sample lines are copied from db/dictionary/AnhViet.zip.
const GO = [
  "@go /gou/",
  "*  danh từ,  số nhiều goes",
  "- sự đi",
  "- sức sống; nhiệt tình, sự hăng hái",
  "=full of go+ đầy sức sống; đầy nhiệt tình",
  "!all (quite) the go",
  "- (thông tục) hợp thời trang",
  "*  nội động từ (went,  gone)",
  "- đi, đi đến, đi tới",
  "=to go to Saigon+ đi Sàigòn",
  "=to go on a journey+ đi du lịch",
  "@Chuyên ngành kỹ thuật",
  "-đi",
  "-tiến hành",
].join("\n");

describe("parseOvdpDefinition", () => {
  it("reads the head, part-of-speech groups, meanings and examples", () => {
    const entry = parseOvdpDefinition("go", GO)!;

    expect(entry).toMatchObject({ headword: "go", displayHeadword: "go", phonetic: "gou" });
    expect(entry.senses.map((s) => [s.kind, s.label, s.partOfSpeech])).toEqual([
      ["word", "danh từ, số nhiều goes", "NOUN"],
      ["word", "nội động từ (went, gone)", "VERB"],
      ["idiom", "all (quite) the go", "PHRASE"],
      ["domain", "Chuyên ngành kỹ thuật", "OTHER"],
    ]);
    expect(entry.senses[0].meanings).toEqual([
      { text: "sự đi", examples: [] },
      {
        text: "sức sống; nhiệt tình, sự hăng hái",
        examples: [{ en: "full of go", vi: "đầy sức sống; đầy nhiệt tình" }],
      },
    ]);
    expect(entry.senses[1].meanings[0].examples).toHaveLength(2);
    expect(entry.senses[3].meanings.map((m) => m.text)).toEqual(["đi", "tiến hành"]);
  });

  it("moves idioms after the word groups and joins idioms that share meanings", () => {
    const entry = parseOvdpDefinition(
      "run",
      [
        "@run /rʌn/",
        "*  danh từ",
        "- sự chạy",
        "!with a run",
        "!by the run",
        "- rất nhanh, nhanh vùn vụt",
        "*  ngoại động từ",
        "- chạy (một quâng đường...)",
      ].join("\n"),
    )!;

    expect(entry.senses.map((s) => s.label)).toEqual(["danh từ", "ngoại động từ", "with a run / by the run"]);
    expect(entry.senses[2].meanings[0].text).toBe("rất nhanh, nhanh vùn vụt");
  });

  it("labels specialist fields and drops their repeated blocks", () => {
    const entry = parseOvdpDefinition(
      "light",
      [
        "@light /lait/",
        "*  tính từ",
        "- nhẹ, nhẹ nhàng",
        "@Chuyên ngành kỹ thuật",
        "-ánh sáng",
        "@Lĩnh vực: điện",
        "-sáng lên",
        "@Chuyên ngành kỹ thuật",
        "-ánh sáng",
        "-đèn",
      ].join("\n"),
    )!;

    expect(entry.senses.slice(1).map((s) => [s.label, s.meanings.map((m) => m.text)])).toEqual([
      ["Chuyên ngành kỹ thuật", ["ánh sáng", "đèn"]],
      ["Chuyên ngành kỹ thuật · điện", ["sáng lên"]],
    ]);
  });

  it("keeps an entry with only specialist meanings and returns null for one with none", () => {
    expect(parseOvdpDefinition("abend", "@Chuyên ngành kỹ thuật\n@Lĩnh vực: toán & tin\n-sự ngắt")?.senses).toEqual([
      {
        kind: "domain",
        label: "Chuyên ngành kỹ thuật · toán & tin",
        partOfSpeech: "OTHER",
        meanings: [{ text: "sự ngắt", examples: [] }],
      },
    ]);
    expect(parseOvdpDefinition("empty", "@empty /'empti/\n*  danh từ\n")).toBeNull();
  });
});

describe("partOfSpeechFromLabel", () => {
  it.each([
    ["danh từ số nhiều", "NOUN"],
    ["ngoại động từ lit, lighted", "VERB"],
    ["nội động từ", "VERB"],
    ["trợ động từ", "VERB"],
    ["tính từ & phó từ", "ADJECTIVE"],
    ["phó từ", "ADVERB"],
    ["giới từ", "PREPOSITION"],
    ["liên từ", "CONJUNCTION"],
    ["thán từ", "OTHER"],
    ["động tính từ quá khứ", "OTHER"],
    ["", "OTHER"],
  ])("maps %j to %s", (label, expected) => {
    expect(partOfSpeechFromLabel(label)).toBe(expected);
  });
});

describe("buildDictionary", () => {
  it("merges case variants with the lowercase spelling first and skips multi-word headwords", () => {
    const entries = buildDictionary([
      { word: "Bill", definition: "@Bill /bil/\n*  danh từ\n- Bin (tên riêng)" },
      { word: "bill", definition: "@bill /bil/\n*  danh từ\n- cái mỏ (chim)" },
      { word: "bill of lading", definition: "@Chuyên ngành kinh tế\n-vận đơn" },
      { word: "00-database-info", definition: "@00-database-info\n- en_vi" },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ headword: "bill", displayHeadword: "bill", phonetic: "bil" });
    expect(entries[0].senses.map((s) => s.meanings[0].text)).toEqual(["cái mỏ (chim)", "Bin (tên riêng)"]);
  });

  it("reads the committed dictionary", () => {
    const zip = readFileSync(new URL("../../../../db/dictionary/AnhViet.zip", import.meta.url));
    const entries = buildDictionary(readStardictZip(zip));
    const look = entries.find((entry) => entry.headword === "look");

    expect(entries.length).toBeGreaterThan(100_000);
    expect(look?.senses.find((s) => s.label === "to look after")?.meanings[1].text).toBe("trông nom, chăm sóc");
  });
});
