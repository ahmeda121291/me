import { Suspense } from "react";
import UnsubscribeClient from "@/components/UnsubscribeClient";

export const metadata = { title: "Unsubscribe" };

export default function UnsubscribePage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-16 text-center">
      <Suspense fallback={null}>
        <UnsubscribeClient />
      </Suspense>
    </main>
  );
}
