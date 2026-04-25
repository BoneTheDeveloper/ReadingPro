# Technical Stack Research Report

## PDF Text Extraction & Parsing

**Best Options:**
- **pdfplumber** - Most accurate text extraction, preserves layout (open-source)
- **PyMuPDF (fitz)** - Fast performance for large PDFs (open-source)
- **Google Cloud Vision AI** - Best for scanned documents (paid, $1.50/1000 pages)
- **AWS Textract** - Excellent for forms/tables (paid, $15/1000 pages)

**Recommendation:** pdfplumber for text + Google Vision for scanned docs

## YouTube Video Transcription

**Leading Options:**
- **OpenAI Whisper** - Free/open-source, high accuracy
- **AssemblyAI** - $0.00099/second, real-time capabilities
- **Google Cloud Speech** - $0.006/minute, robust API
- **Deepgram** - $0.002/minute, low latency

**Recommendation:** Whisper for offline processing, AssemblyAI for real-time

## AI Text Level Detection (CEFR)

**Current Solutions:**
- **Google Cloud NLP** - Language detection (paid)
- **Microsoft Azure Text Analytics** - Complex analysis (paid)
- **AWS Comprehend** - Customizable models (paid)
- **Custom GPT fine-tuning** - CEFR-specific classification

**Recommendation:** Custom fine-tuned model + rule-based heuristics

## Content Generation & Simplification

**Best APIs:**
- **OpenAI GPT-4** - $0.03/1K tokens, highest quality
- **Anthropic Claude** - $0.015/1K tokens, good for educational content
- **Cohere** - $0.0005/1K tokens, cost-effective
- **Hugging Face Transformers** - Free, customizable

**Recommendation:** Claude for simplification, Cohere for bulk processing

## Flashcard Generation with Citations

**Options:**
- **Anki API** - Flashcard management, limited generation
- **Supermemo API** - Spaced repetition, strong integration
- **Custom AI pipeline** - GPT-4 + reference tracking
- **Notion API** - Database integration for citations

**Recommendation:** Custom AI pipeline with SQLite citation tracking

## Integration Summary

**Cost-Effective Stack:**
- PDF: pdfplumber + Google Vision (as needed)
- Transcription: OpenAI Whisper
- Level Detection: Custom model
- Content: Anthropic Claude
- Flashcards: Custom pipeline

**Total estimated cost:** ~$50-100/month for moderate usage

**Complexity:** Medium (3rd-party APIs + custom components)

**Alternative Stack:** Fully open-source with whisper, pdfplumber, and Hugging Face models

---

Sources:
- [PDF extraction options](https://github.com/py-pdf)
- [Whisper documentation](https://github.com/openai/whisper)
- [Google Cloud Vision API](https://cloud.google.com/vision)
- [AssemblyAI pricing](https://assemblyai.com/pricing)