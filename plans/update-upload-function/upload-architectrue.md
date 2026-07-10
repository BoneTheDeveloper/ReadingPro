
kiến trúc thực tế 
UI ──Server Action──► uploadFileAction()   (store file, tạo job, return jobId)
                            │
                            └─► enqueue job (Inngest/QStash)
                                     │
Queue ──HTTP POST──► /api/jobs/process   ◄── Route Handler (AI chạy ở đây)
                                     │
                                     └─► cập nhật UploadJob.status = DONE
UI ──fetch poll──► /api/upload-status?jobId=   ◄── Route Handler (trả status)
ViệcDùng cái gìTại saoUpload file / paste (mutation từ UI)Server Action uploadFileActionKích hoạt từ form, tiện, giữ nguyên như hiện tạiHỏi trạng thái job (?jobId=)Route Handler GET /api/upload-statusClient cần fetch để poll — Server Action không hợp cho GET/pollingBackground xử lý AIRoute Handler mà queue gọi tới, vd POST /api/jobs/processInngest/QStash gọi endpoint này qua HTTP, nên phải là route thật
