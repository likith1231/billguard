import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import Nav from "@/components/ui/Nav";

export const metadata = { title: "Create account — BillGuard", robots: { index: false } };

export default function SignupPage() {
  return (
    <>
      <Nav />
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
