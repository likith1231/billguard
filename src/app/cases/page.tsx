import Nav from "@/components/ui/Nav";
import CasesApp from "@/components/audit/CasesApp";

export const metadata = { title: "My cases — BillGuard" };

export default function CasesPage() {
  return (
    <>
      <Nav />
      <CasesApp />
    </>
  );
}
