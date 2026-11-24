import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { authClient } from "@/client/lib/auth/auth-client";
import { credentialErrorText, getAuthErrorMessage } from "@/client/lib/api/error-message";
import { useAppDispatch, useAppSelector } from "@/client/lib/store/hooks";
import { selectSessionUser, sessionUserUpdated } from "@/client/lib/store/session-slice";
import { normalizeUsername, usernameError } from "@/shared/auth/credential-rules";

/**
 * One identity field, like most SaaS profiles: the username, which is also
 * the shown name (sign-up sets name = username, so both are saved together).
 * Better Auth's username plugin rejects a taken or malformed one. Email stays
 * read-only.
 */
export function ProfileForm() {
  const user = useAppSelector(selectSessionUser);
  const dispatch = useAppDispatch();
  const current = user?.username ?? user?.name ?? "";
  const [value, setValue] = useState(current);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const next = normalizeUsername(value);
  const changed = next !== current;
  const problem = changed ? credentialErrorText(usernameError(next)) : undefined;
  const message = problem ?? serverError;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changed || problem || pending) return;
    setPending(true);
    setServerError(null);
    const { error } = await authClient.updateUser({ name: next, username: next, displayUsername: next });
    setPending(false);
    if (error) {
      setServerError(getAuthErrorMessage(error));
      return;
    }
    dispatch(sessionUserUpdated({ name: next, username: next }));
    setSaved(true);
  };

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" type="email" value={user.email} disabled readOnly />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-username">Tên người dùng</Label>
        <Input
          id="profile-username"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setServerError(null);
            setSaved(false);
          }}
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? "profile-username-error" : undefined}
        />
        {message && (
          <p id="profile-username-error" className="text-xs text-destructive">{message}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!changed || Boolean(problem) || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Lưu thay đổi
        </Button>
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm text-success">
          {saved && !changed && (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Đã cập nhật tên người dùng.
            </>
          )}
        </p>
      </div>
    </form>
  );
}
