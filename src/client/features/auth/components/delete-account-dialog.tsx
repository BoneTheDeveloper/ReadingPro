import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { authClient } from "@/client/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/client/lib/api/error-message";
import { useAppSelector } from "@/client/lib/store/hooks";
import { selectSessionUser } from "@/client/lib/store/session-slice";
import { clearAllChats } from "@/client/features/studio";
import { useIsPro } from "@/client/features/subscription";

/** Better Auth's answer when the session is older than its freshAge. */
const STALE_SESSION = "SESSION_EXPIRED";

/**
 * "Xóa tài khoản" with a typed confirmation: the button unlocks only once the
 * user types their own email, the GitHub-style guard for an irreversible action.
 */
export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Xóa tài khoản</Button>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const user = useAppSelector(selectSessionUser);
  const isPro = useIsPro();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; stale: boolean } | null>(null);

  if (!user) return null;
  const confirmText = user.email;
  const matches = typed.trim().toLowerCase() === confirmText.toLowerCase();

  const handleDelete = async () => {
    setPending(true);
    setError(null);
    const { error: authError } = await authClient.deleteUser();
    if (authError) {
      setPending(false);
      const stale = authError.code === STALE_SESSION;
      setError({
        stale,
        message: stale
          ? "Để bảo vệ tài khoản, hãy đăng nhập lại rồi xóa tài khoản trong vòng 24 giờ."
          : getAuthErrorMessage(authError),
      });
      return;
    }
    clearAllChats();
    queryClient.clear();
    navigate("/", { replace: true });
  };

  const signInAgain = async () => {
    await authClient.signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
            Xóa tài khoản?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p>Thao tác này xóa vĩnh viễn tài khoản và mọi dữ liệu, không thể khôi phục:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Bài đọc, flashcard, câu hỏi và lịch sử chat</li>
            <li>Kho từ vựng, bộ từ và lịch ôn tập</li>
            <li>Lịch sử thanh toán và hóa đơn</li>
          </ul>
          {isPro && (
            <p className="rounded-md bg-amber-soft px-3 py-2 text-amber-text">
              Gói Pro còn hạn sẽ mất theo tài khoản và không được hoàn tiền.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Nhập <span className="font-semibold text-foreground select-all">{confirmText}</span> để xác nhận
            </Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={pending}
              autoFocus
            />
          </div>

          {error && (
            <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive">
              <p>{error.message}</p>
              {error.stale && (
                <Button size="sm" variant="secondary" onClick={signInAgain}>Đăng nhập lại</Button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={pending}>Hủy</Button>
            <Button variant="destructive" disabled={!matches || pending} onClick={handleDelete}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Xóa vĩnh viễn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
