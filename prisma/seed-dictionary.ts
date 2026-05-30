import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SOURCE_LANGUAGE = "en";
const TARGET_LANGUAGE = "vi";

const TEST_FILES = [
  "docs/testing/test-files/valid-a1-simple.txt",
  "docs/testing/test-files/valid-c1-complex.txt",
];

const PHRASE_ENTRIES: SeedEntry[] = [
  entry("artificial intelligence", "trí tuệ nhân tạo", "noun phrase"),
  entry("natural language processing", "xử lý ngôn ngữ tự nhiên", "noun phrase"),
  entry("machine translation", "dịch máy", "noun phrase"),
  entry("sentiment analysis", "phân tích cảm xúc", "noun phrase"),
  entry("text summarization", "tóm tắt văn bản", "noun phrase"),
  entry("algorithmic bias", "thiên lệch thuật toán", "noun phrase"),
  entry("computational transparency", "tính minh bạch tính toán", "noun phrase"),
  entry("human communication", "giao tiếp của con người", "noun phrase"),
  entry("paradigm shift", "sự thay đổi mô hình", "noun phrase"),
  entry("typing test", "bài kiểm tra gõ phím", "noun phrase"),
  entry("software development lifecycle", "vòng đời phát triển phần mềm", "noun phrase"),
];

const TRANSLATIONS: Record<string, string> = {
  a: "một",
  access: "quyền truy cập",
  accommodate: "thích ứng",
  achieve: "đạt được",
  across: "trên khắp",
  advancements: "những tiến bộ",
  algorithmic: "thuộc về thuật toán",
  alphabet: "bảng chữ cái",
  ambiguity: "sự mơ hồ",
  analysis: "phân tích",
  and: "và",
  applications: "ứng dụng",
  architectures: "kiến trúc",
  are: "là",
  artificial: "nhân tạo",
  as: "như",
  at: "ở",
  automated: "tự động",
  been: "đã được",
  bias: "thiên lệch",
  broader: "rộng hơn",
  brown: "màu nâu",
  can: "có thể",
  capabilities: "khả năng",
  careful: "cẩn thận",
  communication: "giao tiếp",
  complex: "phức tạp",
  complexity: "độ phức tạp",
  computational: "thuộc về tính toán",
  consequences: "hậu quả",
  contains: "chứa",
  contemporary: "đương đại",
  correctly: "đúng cách",
  demands: "đòi hỏi",
  democratisation: "sự dân chủ hóa",
  demonstrated: "đã chứng minh",
  deploying: "triển khai",
  developers: "lập trình viên",
  development: "phát triển",
  devices: "thiết bị",
  different: "khác nhau",
  dog: "con chó",
  english: "tiếng Anh",
  ethical: "đạo đức",
  every: "mọi",
  examination: "sự xem xét",
  experimental: "thực nghiệm",
  fields: "trường",
  fonts: "phông chữ",
  for: "cho",
  fox: "con cáo",
  frameworks: "khung phương pháp",
  fundamental: "cơ bản",
  furthermore: "hơn nữa",
  has: "có",
  have: "có",
  human: "con người",
  implications: "hàm ý",
  in: "trong",
  including: "bao gồm",
  industries: "ngành công nghiệp",
  inherent: "vốn có",
  input: "đầu vào",
  intelligence: "trí tuệ",
  interdisciplinary: "liên ngành",
  issues: "vấn đề",
  it: "nó",
  jumps: "nhảy",
  keyboards: "bàn phím",
  language: "ngôn ngữ",
  lazy: "lười biếng",
  letter: "chữ cái",
  lifecycle: "vòng đời",
  linguistic: "ngôn ngữ học",
  linguistics: "ngôn ngữ học",
  machine: "máy",
  maintaining: "duy trì",
  many: "nhiều",
  methodological: "thuộc về phương pháp luận",
  modern: "hiện đại",
  natural: "tự nhiên",
  nature: "bản chất",
  necessitate: "đòi hỏi",
  neural: "thần kinh",
  numerous: "nhiều",
  of: "của",
  often: "thường",
  on: "trên",
  outcomes: "kết quả",
  over: "qua",
  pangram: "câu chứa đủ chữ cái",
  paradigm: "mô hình",
  particularly: "đặc biệt",
  performance: "hiệu suất",
  platforms: "nền tảng",
  potential: "tiềm năng",
  powerful: "mạnh mẽ",
  precipitated: "đã gây ra",
  processing: "xử lý",
  proliferation: "sự lan rộng",
  quick: "nhanh",
  realm: "lĩnh vực",
  regard: "liên quan",
  remarkable: "đáng chú ý",
  rendering: "kết xuất",
  reproducible: "có thể tái lập",
  researchers: "nhà nghiên cứu",
  rigorous: "nghiêm ngặt",
  scale: "quy mô",
  sentence: "câu",
  sentiment: "cảm xúc",
  serves: "đóng vai trò",
  shift: "sự chuyển đổi",
  simple: "đơn giản",
  societal: "xã hội",
  software: "phần mềm",
  sophisticated: "tinh vi",
  such: "như vậy",
  summarization: "tóm tắt",
  systems: "hệ thống",
  tasks: "nhiệm vụ",
  technological: "thuộc về công nghệ",
  technologies: "công nghệ",
  test: "kiểm tra",
  text: "văn bản",
  that: "rằng",
  the: "cái",
  these: "những điều này",
  this: "điều này",
  throughout: "xuyên suốt",
  to: "đến",
  translation: "dịch thuật",
  transparency: "tính minh bạch",
  typing: "gõ phím",
  unprecedented: "chưa từng có",
  use: "sử dụng",
  used: "được sử dụng",
  verify: "xác minh",
  way: "cách",
  whilst: "trong khi",
  with: "với",
  working: "hoạt động",
  years: "nhiều năm",
};

interface SeedEntry {
  term: string;
  translation: string;
  type: string;
  confidence: number;
  examples?: string[];
  relatedWords?: string[];
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildDictionaryKey(input: {
  normalizedTerm: string;
  sourceLanguage: string;
  targetLanguage: string;
}) {
  return stableHash(input);
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function entry(term: string, translation: string, type = "word", confidence = 0.95): SeedEntry {
  return { term, translation, type, confidence };
}

function fixtureWords() {
  const words = new Set<string>();

  for (const file of TEST_FILES) {
    const content = readFileSync(join(process.cwd(), file), "utf8");
    for (const match of content.toLowerCase().matchAll(/[a-z]+(?:'[a-z]+)?/g)) {
      words.add(match[0]);
    }
  }

  return [...words].sort();
}

function buildSeedEntries() {
  const wordEntries = fixtureWords().map((term) =>
    entry(term, TRANSLATIONS[term] ?? term, "word", TRANSLATIONS[term] ? 0.95 : 0.6),
  );

  return [...PHRASE_ENTRIES, ...wordEntries];
}

async function seed() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL. Check .env.local.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const entries = buildSeedEntries();

  console.log(`Seeding ${entries.length} dictionary entries from ${TEST_FILES.length} test files...`);

  await prisma.$connect();

  for (const item of entries) {
    const normalizedTerm = normalizeTerm(item.term);
    const normalizedKey = buildDictionaryKey({
      normalizedTerm,
      sourceLanguage: SOURCE_LANGUAGE,
      targetLanguage: TARGET_LANGUAGE,
    });

    await prisma.dictionaryEntry.upsert({
      where: { normalizedKey },
      update: {
        normalizedTerm,
        translation: item.translation,
        type: item.type,
        examples: item.examples,
        relatedWords: item.relatedWords,
        source: "seed:test-files",
        confidence: item.confidence,
      },
      create: {
        normalizedKey,
        normalizedTerm,
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage: TARGET_LANGUAGE,
        translation: item.translation,
        type: item.type,
        examples: item.examples,
        relatedWords: item.relatedWords,
        source: "seed:test-files",
        confidence: item.confidence,
      },
    });
  }

  console.log(`Done. Upserted: ${entries.length}`);
  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
