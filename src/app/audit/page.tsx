import { Suspense } from "react";
import AuditApp from "@/components/audit/AuditApp";
import Nav from "@/components/ui/Nav";

export const metadata = { title: "Audit a bill — BillGuard" };

export default function AuditPage() {
  return (
    <>
      <Nav />
      <Suspense>
        <AuditApp />
      </Suspense>
    </>
  );
}
