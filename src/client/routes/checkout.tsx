import { redirect, useParams } from "react-router";
import { authClient } from "@/client/lib/auth/auth-client";
import { CheckoutPage } from "@/client/features/subscription";

export async function clientLoader() {
  const { data } = await authClient.getSession();
  if (!data) throw redirect("/login");
  return null;
}

export default function CheckoutRoute() {
  const { orderId } = useParams();
  return <CheckoutPage key={orderId} orderId={orderId!} />;
}
