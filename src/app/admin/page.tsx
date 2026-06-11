import AdminPanel from "@/components/AdminPanel";

export const metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-semibold">The back office</h1>
      <AdminPanel />
    </main>
  );
}
