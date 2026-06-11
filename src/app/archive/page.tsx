import ArchiveList from "@/components/ArchiveList";

export const metadata = { title: "The Archive" };

export default function ArchivePage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <h1 className="text-3xl font-semibold">The Archive</h1>
      <p className="mt-1 text-sm opacity-70">
        Every ballot that's ever gone live. Members replay any of them.
      </p>
      <ArchiveList />
    </main>
  );
}
