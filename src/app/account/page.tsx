import AccountPanel from "@/components/auth/AccountPanel";
import Nav from "@/components/ui/Nav";

export const metadata = { title: "Account — BillGuard", robots: { index: false } };

export default function AccountPage() {
  return (
    <>
      <Nav />
      <AccountPanel />
    </>
  );
}
