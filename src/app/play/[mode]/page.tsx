import { notFound } from "next/navigation";
import { MODES, modeBySlug } from "@/lib/modes";
import EndlessMode from "@/components/EndlessMode";

export function generateStaticParams() {
  return MODES.map((m) => ({ mode: m.slug }));
}

export default async function ModePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const config = modeBySlug(mode);
  if (!config) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-6">
      <EndlessMode modeKey={config.key} />
    </main>
  );
}
