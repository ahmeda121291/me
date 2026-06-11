import ClubCheckout from "@/components/ClubCheckout";

export const metadata = { title: "The Club" };

const INSIDE = [
  ["Five more game modes", "All-Star, All-NBA, MVP, ROY, and the max-contract debate — unlimited, endless."],
  ["The complete archive", "Every past daily ballot, playable."],
  ["Your Voter Profile", "Your archetype, your Voter DNA, and an AI-written read on how you actually judge careers."],
  ["The Pending Tracker", "Your unresolved verdicts, scored the day history rules — with an alert."],
  ["No ads. Ever.", "The free game stays free. The Club is the only thing we sell."],
] as const;

const FAQ = [
  ["Do I need an account to play the daily ballot?", "Never. The daily game is free forever, no login. The Club is for people who want more than one a day."],
  ["What happens when I buy?", "Checkout creates your account in one motion — finish paying, and a sign-in link lands in your email."],
  ["Can I cancel?", "Anytime, from your account page. One tap into the billing portal."],
] as const;

export default function ClubPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 pb-20">
      <p className="text-xs uppercase tracking-widest text-bronze">Membership</p>
      <h1 className="mt-1 text-4xl font-semibold">The Club</h1>
      <p className="mt-2 opacity-80">
        One ballot a day is a habit. The Club is an obsession.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {INSIDE.map(([title, blurb]) => (
          <li key={title} className="rounded-2xl border border-line p-4">
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 text-sm opacity-75">{blurb}</p>
          </li>
        ))}
      </ul>

      <ClubCheckout />

      <h2 className="mt-10 text-xl font-semibold">Questions</h2>
      <dl className="mt-3 flex flex-col gap-4">
        {FAQ.map(([q, a]) => (
          <div key={q}>
            <dt className="font-semibold">{q}</dt>
            <dd className="mt-1 text-sm opacity-75">{a}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
