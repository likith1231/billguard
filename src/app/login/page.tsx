import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import Nav from "@/components/ui/Nav";

export const metadata = { title: "Sign in — BillGuard", robots: { index: false } };

export default function LoginPage() {
  return (
    <>
      <Nav />
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
