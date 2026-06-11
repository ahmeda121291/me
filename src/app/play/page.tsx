import PlayHub from "@/components/PlayHub";

export const metadata = { title: "Play" };

export default function PlayPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <h1 className="text-3xl font-semibold">The modes</h1>
      <p className="mt-1 text-sm opacity-70">
        Five more ways to get a career wrong in public.
      </p>
      <PlayHub />
    </main>
  );
}
