import { useEffect } from "react";
import { Link, useNavigate, useRouteError } from "react-router";
import { getErrorMessage } from "@/client/lib/api/error-message";

/**
 * Exported as the `ErrorBoundary` of each dashboard page route, so a page
 * error renders inside the sidebar layout instead of replacing it.
 */
export function DashboardError() {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-100 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Đã xảy ra lỗi</h2>
      <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate(0)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Thử lại
        </button>
        <Link
          to="/study"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
