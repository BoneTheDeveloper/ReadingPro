file liên quan :
docs/Requirements/user-stories/epic-01-content-import.md
docs/Requirements/software-requirements.md
docs/Requirements/use-cases.md
docs/Data-flow/upload-flow.md

Bạn có 4 nguồn: paste text, file txt, file pdf, YouTube link. Điểm mấu chốt tôi đã nói ở các turn trước vẫn đúng: chúng khác nhau ở cách lấy text, nhưng phải hội tụ về cùng một thứ — một chuỗi text đã validate + metadata — trước khi vào xử lý chung.
Phân loại 4 nguồn theo bản chất đầu vào
Trước khi liệt kê việc cần làm, phải thấy chúng chia làm 3 nhóm khác nhau về mặt xử lý:
NguồnText có sẵn?Cần store file?Cần gọi ngoài?NhómPaste textCó ngayKhôngKhôngA — text trực tiếpFile txtSau khi đọc bufferCóKhôngB — fileFile pdfSau khi parseCóKhông (parse local)B — fileYouTube linkSau khi lấy transcriptKhôngCó (transcript API)C — link ngoài
Ba nhóm này cần ba nhánh validate đầu vào khác nhau, rồi mới gặp nhau.
Việc cần làm ở tầng đầu vào — theo thứ tự
Bước 0 — Phân loại đầu vào (discriminated input)
Việc đầu tiên: xác định user đang gửi loại nào. Đừng đoán từ nội dung — để client khai báo rõ qua một field sourceType:
type UploadInput =
  | { type: "paste";   text: string;  title?: string }
  | { type: "file";    file: File;    title?: string }   // txt hoặc pdf
  | { type: "youtube"; url: string;   title?: string }
Đây là discriminated union — nền tảng để validate đúng nhánh. Dùng Zod discriminatedUnion (NFR-06) để mỗi loại có schema riêng. Lợi ích: không thể nhầm lẫn validate rule giữa các loại, và TypeScript ép bạn xử lý đủ nhánh.
Bước 1 — Validate theo từng nhóm (client + server)
Nguyên tắc: client validate để UX nhanh, server validate lại vì là nguồn chân lý (client có thể bị bypass — NFR-06).
Nhóm A — Paste text:

Độ dài trong khoảng FR-01.1 (50–100k ký tự). Chốt rõ min/max — hiện SRS của bạn còn mơ hồ chỗ này.
Không rỗng / không chỉ toàn khoảng trắng sau khi trim.
Text có phải English không? (US-01 nói "paste English text"). Có thể check nhẹ ở tầng sau, nhưng ít nhất reject nếu toàn ký tự không phải Latin.
Đây là nhóm validate được đầy đủ ngay ở client vì text có sẵn.

Nhóm B — File (txt + pdf):

Trước khi đọc nội dung: type (chỉ txt/pdf — FR-01.4), size ≤ 10MB (FR-01.2), tên file. Check được ngay ở client → phản hồi tức thì, không tốn băng thông upload file rác.
MIME type + magic bytes: đừng chỉ tin đuôi .pdf. Kiểm tra cả file.type và, ở server, vài byte đầu (%PDF cho pdf). Đây là điểm bảo mật — ngăn file độc đội lốt.
Độ dài text chỉ biết được SAU khi extract → validate lần hai ở server sau khi đọc buffer/parse. Client không thể biết trước một PDF 2MB ra bao nhiêu chữ.

Nhóm C — YouTube link:

Validate định dạng URL trước (là YouTube URL hợp lệ không: youtube.com/watch, youtu.be/…). Regex/URL parse ở client.
Nhưng tính khả dụng của transcript chỉ biết khi gọi ra ngoài — không validate trước được (US-03: "video không có transcript → báo lỗi"). Đây là điểm khác biệt lớn: nhóm C có một bước validate bất định, phụ thuộc mạng, không như A/B.

Bước 2 — Chuẩn hóa về text (nơi 4 nhánh hội tụ)
Mỗi nhánh có một extractor riêng, cùng trả về string:
paste    → text (dùng luôn)
txt      → buffer.toString("utf-8")
pdf      → parsePDF(buffer)            // pdf-parse, FR-01.3
youtube  → fetchTranscript(videoId)   // gọi transcript service
          ─────────────────────────────►  text: string
Đây là Strategy pattern: getText(input): Promise<string>. Thêm nguồn mới (web link US-04, OCR US-05) sau này = thêm một extractor, không đụng phần còn lại.
Bước 3 — Validate SAU chuẩn hóa (bước dễ quên nhất)
Sau khi có text từ bất kỳ nguồn nào, validate lại lần cuối trên chính text đó, vì:

PDF có thể parse ra rỗng (PDF scan ảnh không có text layer) → phải reject rõ ràng.
Transcript YouTube có thể rất ngắn hoặc rỗng.
txt có thể là file nhị phân đội lốt.

Đây là validateTextContent(text) trong flow của bạn — nhưng flow hiện tại chỉ đặt nó ở nhánh file. Nó phải áp cho cả 4 nguồn, đặt ngay sau điểm hội tụ. Đây là chốt chặn cuối trước khi tốn tiền gọi OpenAI.
Bước 4 — Chuẩn bị metadata + xử lý side-effect có điều kiện
Trước khi bàn giao cho tầng xử lý:

Title: nếu user không nhập, sinh mặc định (từ tên file, từ tiêu đề video YouTube, hoặc "Untitled + timestamp").
Store file — CHỈ nhóm B: paste và youtube không có file để store. Đây là lý do đừng gộp chung "store" vào mọi nhánh (điểm tôi đã nói ở turn 2). Chỉ file mới tạo side-effect Blob → chỉ file mới cần rollback xóa file.
Sanitize: tên file (chống path traversal), và cân nhắc strip ký tự điều khiển trong text.

Sơ đồ tầng đầu vào (trước khi thành API endpoint)
                 ┌─────────────────────────────────────────┐
                 │  Bước 0: phân loại (discriminated union) │
                 └─────────────────────────────────────────┘
                                   │
      ┌──────────────┬─────────────┴──────────┬──────────────┐
      ▼              ▼                         ▼              ▼
  [paste]        [txt file]              [pdf file]      [youtube]
      │              │                         │              │
  validate       validate type/size       validate type/  validate URL
  length         (client)                 size (client)   format
      │              │                         │              │
      │          store Blob ──────────► store Blob          (no store)
      │              │                         │              │
  (text sẵn)   buffer.toString         parsePDF(buffer)   fetchTranscript
      │              │                         │              │
      └──────────────┴────────────┬────────────┴──────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  HỘI TỤ: text: string         │
                    │  validateTextContent(text)    │ ← áp cho CẢ 4
                    │  + build metadata/title       │
                    └──────────────────────────────┘
                                   │
                                   ▼
                     bàn giao cho tầng xử lý (analyze)
Bảng tổng hợp: mỗi nguồn cần làm gì
ViệcPastetxtpdfYouTubeKhai báo sourceType✓✓✓✓Validate client (nhanh)lengthtype+sizetype+sizeURL formatValidate magic bytes/MIME—✓✓ (%PDF)—Store file (side-effect)—✓✓—Extractor lấy text(sẵn)toStringparsePDFtranscript APIGọi dịch vụ ngoài———✓ (bất định)validateTextContent sau hội tụ✓✓✓✓Rollback nếu fail(không có gì)xóa Blobxóa Blob(không có gì)
Ba điều quan trọng nhất chốt ở giai đoạn dev này

Discriminated union cho đầu vào — để validate không lẫn lộn giữa 4 loại, và dễ thêm nguồn mới.
Hai điểm validate: một theo-nguồn trước khi lấy text, một chung sau khi có text. Flow hiện tại thiếu cái sau ở các nhánh không phải file.
Side-effect (store file) là có điều kiện, không phải mặc định — chỉ nhóm B. Điều này quyết định nhánh nào cần rollback.
