import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createHash } from "node:crypto";

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

interface SeedEntry {
  term: string;
  translation: string;
  type?: string;
  pronunciation?: string;
  examples?: string[];
  relatedWords?: string[];
  confidence: number;
}

const DICTIONARY_ENTRIES: SeedEntry[] = [
  // ─── Common nouns ────────────────────────────────────────────────
  { term: "algorithm", translation: "thuật toán", type: "noun", confidence: 0.95, relatedWords: ["algorithmic", "model", "procedure"], examples: ["The algorithm sorts the data efficiently."] },
  { term: "bias", translation: "thiên lệch", type: "noun", confidence: 0.76, relatedWords: ["prejudice", "preference", "fairness"], examples: ["The study may contain bias."] },
  { term: "data", translation: "dữ liệu", type: "noun", confidence: 0.95, relatedWords: ["dataset", "evidence", "information"], examples: ["The data supports the conclusion."] },
  { term: "evidence", translation: "bằng chứng", type: "noun", confidence: 0.92, relatedWords: ["proof", "support", "finding"], examples: ["The evidence is strong."] },
  { term: "researcher", translation: "nhà nghiên cứu", type: "noun", confidence: 0.93, relatedWords: ["scientist", "scholar", "investigator"], examples: ["The researcher published a new paper."] },
  { term: "model", translation: "mô hình", type: "noun", confidence: 0.93, relatedWords: ["framework", "system", "algorithm"], examples: ["The model predicts outcomes accurately."] },
  { term: "system", translation: "hệ thống", type: "noun", confidence: 0.95, relatedWords: ["framework", "structure", "process"], examples: ["The system is fully automated."] },
  { term: "process", translation: "quy trình", type: "noun", confidence: 0.9, relatedWords: ["procedure", "method", "operation"], examples: ["The process takes about two hours."] },
  { term: "result", translation: "kết quả", type: "noun", confidence: 0.95, relatedWords: ["outcome", "finding", "conclusion"], examples: ["The result was unexpected."] },
  { term: "problem", translation: "vấn đề", type: "noun", confidence: 0.94, relatedWords: ["issue", "challenge", "difficulty"], examples: ["The problem needs to be solved quickly."] },
  { term: "language", translation: "ngôn ngữ", type: "noun", confidence: 0.95, relatedWords: ["speech", "communication", "tongue"], examples: ["She speaks three languages fluently."] },
  { term: "word", translation: "từ", type: "noun", confidence: 0.95, relatedWords: ["term", "vocabulary", "expression"], examples: ["This word has multiple meanings."] },
  { term: "sentence", translation: "câu", type: "noun", confidence: 0.95, relatedWords: ["phrase", "clause", "statement"], examples: ["Write a complete sentence."] },
  { term: "meaning", translation: "ý nghĩa", type: "noun", confidence: 0.93, relatedWords: ["definition", "sense", "significance"], examples: ["The meaning of this word is unclear."] },
  { term: "context", translation: "ngữ cảnh", type: "noun", confidence: 0.92, relatedWords: ["situation", "circumstance", "background"], examples: ["Consider the context before deciding."] },
  { term: "passage", translation: "đoạn văn", type: "noun", confidence: 0.9, relatedWords: ["text", "paragraph", "excerpt"], examples: ["Read the passage carefully."] },
  { term: "vocabulary", translation: "từ vựng", type: "noun", confidence: 0.93, relatedWords: ["lexicon", "terminology", "words"], examples: ["Building vocabulary takes practice."] },
  { term: "knowledge", translation: "kiến thức", type: "noun", confidence: 0.93, relatedWords: ["understanding", "wisdom", "learning"], examples: ["Knowledge is power."] },
  { term: "education", translation: "giáo dục", type: "noun", confidence: 0.94, relatedWords: ["learning", "schooling", "teaching"], examples: ["Education is important for everyone."] },
  { term: "student", translation: "học sinh", type: "noun", confidence: 0.95, relatedWords: ["learner", "pupil", "scholar"], examples: ["The student asked a good question."] },
  { term: "teacher", translation: "giáo viên", type: "noun", confidence: 0.95, relatedWords: ["instructor", "educator", "tutor"], examples: ["The teacher explained the concept clearly."] },
  { term: "question", translation: "câu hỏi", type: "noun", confidence: 0.95, relatedWords: ["query", "inquiry", "prompt"], examples: ["That is a great question."] },
  { term: "answer", translation: "câu trả lời", type: "noun", confidence: 0.95, relatedWords: ["response", "reply", "solution"], examples: ["The answer is correct."] },
  { term: "example", translation: "ví dụ", type: "noun", confidence: 0.94, relatedWords: ["instance", "sample", "illustration"], examples: ["Can you give an example?"] },
  { term: "method", translation: "phương pháp", type: "noun", confidence: 0.92, relatedWords: ["approach", "technique", "procedure"], examples: ["This method is very effective."] },
  { term: "technology", translation: "công nghệ", type: "noun", confidence: 0.94, relatedWords: ["innovation", "engineering", "digital"], examples: ["Technology changes rapidly."] },
  { term: "information", translation: "thông tin", type: "noun", confidence: 0.95, relatedWords: ["data", "facts", "details"], examples: ["The information is available online."] },
  { term: "science", translation: "khoa học", type: "noun", confidence: 0.94, relatedWords: ["research", "study", "discipline"], examples: ["Science helps us understand the world."] },
  { term: "study", translation: "nghiên cứu", type: "noun", confidence: 0.93, relatedWords: ["research", "analysis", "examination"], examples: ["The study was published last year."] },
  { term: "theory", translation: "lý thuyết", type: "noun", confidence: 0.91, relatedWords: ["hypothesis", "concept", "framework"], examples: ["The theory explains the phenomenon."] },
  { term: "practice", translation: "thực hành", type: "noun", confidence: 0.92, relatedWords: ["exercise", "training", "rehearsal"], examples: ["Practice makes perfect."] },
  { term: "skill", translation: "kỹ năng", type: "noun", confidence: 0.93, relatedWords: ["ability", "competence", "talent"], examples: ["Reading is an important skill."] },
  { term: "concept", translation: "khái niệm", type: "noun", confidence: 0.91, relatedWords: ["idea", "notion", "principle"], examples: ["The concept is difficult to grasp."] },
  { term: "analysis", translation: "phân tích", type: "noun", confidence: 0.92, relatedWords: ["examination", "evaluation", "assessment"], examples: ["The analysis revealed new insights."] },
  { term: "conclusion", translation: "kết luận", type: "noun", confidence: 0.92, relatedWords: ["finding", "result", "deduction"], examples: ["The conclusion is supported by evidence."] },
  { term: "approach", translation: "cách tiếp cận", type: "noun", confidence: 0.9, relatedWords: ["method", "strategy", "technique"], examples: ["We need a different approach."] },
  { term: "decision", translation: "quyết định", type: "noun", confidence: 0.93, relatedWords: ["choice", "judgment", "resolution"], examples: ["The decision was made yesterday."] },
  { term: "experience", translation: "kinh nghiệm", type: "noun", confidence: 0.93, relatedWords: ["knowledge", "background", "expertise"], examples: ["She has a lot of experience."] },
  { term: "development", translation: "sự phát triển", type: "noun", confidence: 0.91, relatedWords: ["growth", "progress", "evolution"], examples: ["The development took three years."] },
  { term: "challenge", translation: "thử thách", type: "noun", confidence: 0.9, relatedWords: ["difficulty", "obstacle", "test"], examples: ["Every challenge is an opportunity."] },
  { term: "opportunity", translation: "cơ hội", type: "noun", confidence: 0.92, relatedWords: ["chance", "possibility", "prospect"], examples: ["Don't miss this opportunity."] },
  { term: "importance", translation: "tầm quan trọng", type: "noun", confidence: 0.9, relatedWords: ["significance", "value", "relevance"], examples: ["The importance of education cannot be overstated."] },
  { term: "source", translation: "nguồn", type: "noun", confidence: 0.93, relatedWords: ["origin", "reference", "material"], examples: ["Cite your sources properly."] },
  { term: "structure", translation: "cấu trúc", type: "noun", confidence: 0.92, relatedWords: ["framework", "organization", "form"], examples: ["The structure of the essay is clear."] },
  { term: "pattern", translation: "mẫu", type: "noun", confidence: 0.9, relatedWords: ["model", "design", "trend"], examples: ["There is a clear pattern in the data."] },
  { term: "factor", translation: "yếu tố", type: "noun", confidence: 0.91, relatedWords: ["element", "cause", "influence"], examples: ["Many factors contribute to success."] },
  { term: "effect", translation: "hiệu ứng", type: "noun", confidence: 0.92, relatedWords: ["impact", "result", "consequence"], examples: ["The effect was immediate."] },
  { term: "impact", translation: "tác động", type: "noun", confidence: 0.91, relatedWords: ["effect", "influence", "consequence"], examples: ["The impact was significant."] },
  { term: "audience", translation: "khán giả", type: "noun", confidence: 0.9, relatedWords: ["readership", "viewers", "listeners"], examples: ["The audience enjoyed the presentation."] },
  { term: "article", translation: "bài báo", type: "noun", confidence: 0.92, relatedWords: ["piece", "essay", "publication"], examples: ["I read an interesting article today."] },

  // ─── Compound / contextual phrases ───────────────────────────────
  { term: "algorithmic bias", translation: "thiên lệch thuật toán", type: "noun phrase", confidence: 0.96, relatedWords: ["bias", "fairness", "machine learning"], examples: ["Algorithmic bias can affect hiring decisions."] },
  { term: "machine learning", translation: "học máy", type: "noun phrase", confidence: 0.94, relatedWords: ["AI", "algorithm", "model"], examples: ["Machine learning is a branch of artificial intelligence."] },
  { term: "artificial intelligence", translation: "trí tuệ nhân tạo", type: "noun phrase", confidence: 0.95, relatedWords: ["AI", "machine learning", "automation"], examples: ["Artificial intelligence is transforming industries."] },
  { term: "critical thinking", translation: "tư duy phản biện", type: "noun phrase", confidence: 0.93, relatedWords: ["analysis", "reasoning", "evaluation"], examples: ["Critical thinking is essential for problem-solving."] },
  { term: "natural language", translation: "ngôn ngữ tự nhiên", type: "noun phrase", confidence: 0.92, relatedWords: ["language", "linguistics", "communication"], examples: ["Natural language processing is a key AI field."] },

  // ─── Common verbs ────────────────────────────────────────────────
  { term: "understand", translation: "hiểu", type: "verb", confidence: 0.95, relatedWords: ["comprehend", "grasp", "learn"], examples: ["I understand the concept now."] },
  { term: "learn", translation: "học", type: "verb", confidence: 0.95, relatedWords: ["study", "acquire", "master"], examples: ["She learns quickly."] },
  { term: "read", translation: "đọc", type: "verb", confidence: 0.95, relatedWords: ["peruse", "study", "review"], examples: ["Read the instructions carefully."] },
  { term: "write", translation: "viết", type: "verb", confidence: 0.95, relatedWords: ["compose", "draft", "record"], examples: ["Write your name on the paper."] },
  { term: "explain", translation: "giải thích", type: "verb", confidence: 0.93, relatedWords: ["clarify", "describe", "illustrate"], examples: ["Can you explain this to me?"] },
  { term: "translate", translation: "dịch", type: "verb", confidence: 0.94, relatedWords: ["interpret", "convert", "render"], examples: ["Translate this sentence into Vietnamese."] },
  { term: "improve", translation: "cải thiện", type: "verb", confidence: 0.93, relatedWords: ["enhance", "better", "upgrade"], examples: ["You can improve your skills with practice."] },
  { term: "create", translation: "tạo", type: "verb", confidence: 0.94, relatedWords: ["make", "build", "produce"], examples: ["Create a new document."] },
  { term: "develop", translation: "phát triển", type: "verb", confidence: 0.92, relatedWords: ["build", "grow", "advance"], examples: ["They developed a new system."] },
  { term: "analyze", translation: "phân tích", type: "verb", confidence: 0.92, relatedWords: ["examine", "study", "evaluate"], examples: ["Analyze the data carefully."] },
  { term: "include", translation: "bao gồm", type: "verb", confidence: 0.93, relatedWords: ["contain", "comprise", "involve"], examples: ["The list includes ten items."] },
  { term: "provide", translation: "cung cấp", type: "verb", confidence: 0.93, relatedWords: ["supply", "offer", "give"], examples: ["The system provides real-time feedback."] },
  { term: "require", translation: "yêu cầu", type: "verb", confidence: 0.92, relatedWords: ["need", "demand", "necessitate"], examples: ["This task requires concentration."] },
  { term: "consider", translation: "xem xét", type: "verb", confidence: 0.91, relatedWords: ["think", "ponder", "evaluate"], examples: ["Consider all options before deciding."] },
  { term: "suggest", translation: "gợi ý", type: "verb", confidence: 0.91, relatedWords: ["propose", "recommend", "advise"], examples: ["I suggest trying a different approach."] },
  { term: "support", translation: "hỗ trợ", type: "verb", confidence: 0.93, relatedWords: ["help", "assist", "back"], examples: ["The evidence supports the claim."] },
  { term: "increase", translation: "tăng", type: "verb", confidence: 0.93, relatedWords: ["grow", "rise", "expand"], examples: ["The population continues to increase."] },
  { term: "produce", translation: "sản xuất", type: "verb", confidence: 0.92, relatedWords: ["create", "generate", "manufacture"], examples: ["The factory produces thousands of units."] },
  { term: "identify", translation: "nhận diện", type: "verb", confidence: 0.91, relatedWords: ["recognize", "detect", "find"], examples: ["Can you identify the problem?"] },

  // ─── Common adjectives ───────────────────────────────────────────
  { term: "important", translation: "quan trọng", type: "adjective", confidence: 0.94, relatedWords: ["significant", "crucial", "essential"], examples: ["This is an important discovery."] },
  { term: "different", translation: "khác nhau", type: "adjective", confidence: 0.93, relatedWords: ["distinct", "diverse", "various"], examples: ["There are different ways to solve this."] },
  { term: "significant", translation: "đáng kể", type: "adjective", confidence: 0.91, relatedWords: ["important", "notable", "considerable"], examples: ["There was a significant improvement."] },
  { term: "specific", translation: "cụ thể", type: "adjective", confidence: 0.91, relatedWords: ["particular", "exact", "precise"], examples: ["Give me a specific example."] },
  { term: "effective", translation: "hiệu quả", type: "adjective", confidence: 0.92, relatedWords: ["efficient", "productive", "successful"], examples: ["This is an effective method."] },
  { term: "relevant", translation: "liên quan", type: "adjective", confidence: 0.9, relatedWords: ["pertinent", "applicable", "related"], examples: ["Only include relevant information."] },
  { term: "complex", translation: "phức tạp", type: "adjective", confidence: 0.91, relatedWords: ["complicated", "intricate", "difficult"], examples: ["The problem is quite complex."] },
  { term: "simple", translation: "đơn giản", type: "adjective", confidence: 0.94, relatedWords: ["easy", "basic", "straightforward"], examples: ["Keep it simple."] },
  { term: "common", translation: "phổ biến", type: "adjective", confidence: 0.93, relatedWords: ["frequent", "usual", "widespread"], examples: ["This is a common mistake."] },
  { term: "basic", translation: "cơ bản", type: "adjective", confidence: 0.93, relatedWords: ["fundamental", "elementary", "essential"], examples: ["Start with the basic concepts."] },
  { term: "clear", translation: "rõ ràng", type: "adjective", confidence: 0.94, relatedWords: ["obvious", "evident", "plain"], examples: ["The instructions are clear."] },
  { term: "correct", translation: "đúng", type: "adjective", confidence: 0.94, relatedWords: ["right", "accurate", "proper"], examples: ["Is this answer correct?"] },
  { term: "available", translation: "có sẵn", type: "adjective", confidence: 0.92, relatedWords: ["accessible", "obtainable", "ready"], examples: ["The data is available online."] },
  { term: "automatic", translation: "tự động", type: "adjective", confidence: 0.91, relatedWords: ["automated", "mechanical", "spontaneous"], examples: ["The system has automatic updates."] },
  { term: "digital", translation: "kỹ thuật số", type: "adjective", confidence: 0.91, relatedWords: ["electronic", "online", "virtual"], examples: ["We live in a digital age."] },
];

async function seed() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log(`Seeding ${DICTIONARY_ENTRIES.length} dictionary entries...`);

  let created = 0;
  let skipped = 0;

  for (const entry of DICTIONARY_ENTRIES) {
    const normalizedTerm = normalizeTerm(entry.term);
    const normalizedKey = buildDictionaryKey({
      normalizedTerm,
      sourceLanguage: "en",
      targetLanguage: "vi",
    });

    try {
      await prisma.dictionaryEntry.upsert({
        where: { normalizedKey },
        update: {
          translation: entry.translation,
          type: entry.type,
          pronunciation: entry.pronunciation,
          examples: entry.examples ? JSON.parse(JSON.stringify(entry.examples)) : undefined,
          relatedWords: entry.relatedWords ? JSON.parse(JSON.stringify(entry.relatedWords)) : undefined,
          source: "seed",
          confidence: entry.confidence,
        },
        create: {
          normalizedKey,
          normalizedTerm,
          sourceLanguage: "en",
          targetLanguage: "vi",
          translation: entry.translation,
          type: entry.type,
          pronunciation: entry.pronunciation,
          examples: entry.examples ? JSON.parse(JSON.stringify(entry.examples)) : undefined,
          relatedWords: entry.relatedWords ? JSON.parse(JSON.stringify(entry.relatedWords)) : undefined,
          source: "seed",
          confidence: entry.confidence,
        },
      });
      created++;
    } catch (err) {
      console.error(`Failed to seed "${entry.term}":`, err);
      skipped++;
    }
  }

  console.log(`Done. Created: ${created}, Skipped/Failed: ${skipped}`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
