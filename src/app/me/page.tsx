import AccountPanel from "@/components/AccountPanel";

export const metadata = { title: "Your locker" };

export default function MePage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <h1 className="text-3xl font-semibold">Your locker</h1>
      <AccountPanel />
    </main>
  );
}
