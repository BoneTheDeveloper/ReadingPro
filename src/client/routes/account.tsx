import { useAppSelector } from "@/client/lib/store/hooks";
import { selectSessionUser } from "@/client/lib/store/session-slice";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Separator } from "@/client/components/ui/separator";

export { DashboardError as ErrorBoundary } from "@/client/components/layout/dashboard-error";

export default function AccountRoute() {
  const user = useAppSelector(selectSessionUser);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cài đặt tài khoản</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý cài đặt và tùy chọn tài khoản của bạn
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ</CardTitle>
          <CardDescription>
            Thông tin hồ sơ công khai của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              defaultValue={user?.name || ""}
              placeholder="Tên của bạn"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email không thể thay đổi
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảo mật</CardTitle>
          <CardDescription>
            Quản lý mật khẩu và cài đặt bảo mật
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
            <Input id="current-password" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <Input id="new-password" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
            <Input id="confirm-password" type="password" />
          </div>
          <Button>Cập nhật mật khẩu</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Vùng nguy hiểm</CardTitle>
          <CardDescription>
            Hành động không thể đảo ngược cho tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Xóa tài khoản</Button>
          <p className="text-xs text-muted-foreground mt-2">
            Hành động này là vĩnh viễn và không thể hoàn tác
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
