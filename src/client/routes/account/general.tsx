import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { DeleteAccountButton, ProfileForm } from "@/client/features/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";

export default function AccountGeneralRoute() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm />
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
            Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu. Không thể hoàn tác.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
