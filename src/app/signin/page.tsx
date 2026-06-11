import SignInForm from "@/components/SignInForm";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-12">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm opacity-70">
        A magic link, no password. Saving your streak is the only thing an
        account is ever required for.
      </p>
      <SignInForm />
    </main>
  );
}
