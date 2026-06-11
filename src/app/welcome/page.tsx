import WelcomeStatus from "@/components/WelcomeStatus";

export const metadata = { title: "Welcome to The Club" };

export default function WelcomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-5 py-16 text-center">
      <p className="text-xs uppercase tracking-widest text-bronze">Membership confirmed</p>
      <h1 className="text-4xl font-semibold">You’re in The Club.</h1>
      <WelcomeStatus />
    </main>
  );
}
