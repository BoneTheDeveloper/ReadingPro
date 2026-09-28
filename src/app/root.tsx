import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useRouteError,
} from "react-router";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/query-client";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/lora";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const links = () => [{ rel: "icon", href: "/favicon.ico" }];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full overflow-hidden flex flex-col font-sans">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// Shown while route modules and client loaders (the dashboard session check)
// run on first load. Every page sits on this background, so there is no flash.
export function HydrateFallback() {
  return <div className="flex-1 bg-background" />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!notFound) console.error(error);
  }, [error, notFound]);

  return (
    <div className="flex-1 flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 px-8 text-center">
        <h1 className="text-2xl font-semibold">
          {notFound ? "404 - Không tìm thấy trang" : "Đã xảy ra lỗi"}
        </h1>
        {notFound ? (
          <a href="/" className="text-sm text-primary hover:underline">
            Về trang chủ
          </a>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
            </p>
            <button
              type="button"
              onClick={() => navigate(0)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Thử lại
            </button>
          </>
        )}
      </div>
    </div>
  );
}
