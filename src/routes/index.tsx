import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MapPin, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GuardianAI — One-tap SOS for women's safety" },
      { name: "description", content: "Press SOS to instantly email your trusted contacts with your live location." },
      { property: "og:title", content: "GuardianAI — One-tap SOS for women's safety" },
      { property: "og:description", content: "Press SOS to instantly email your trusted contacts with your live location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> GuardianAI
        </div>
        <Button asChild variant="ghost"><Link to="/auth">Log in</Link></Button>
      </header>
      <main className="mx-auto grid max-w-5xl items-center gap-12 px-5 py-12 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">Help is one tap away.</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            GuardianAI sends an emergency email with your location to the people you trust — the moment you press SOS.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Create account</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">Log in</Link></Button>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="relative flex h-64 w-64 items-center justify-center">
            <span className="animate-sos-pulse absolute inset-0 rounded-full bg-primary/40" />
            <div className="sos-button relative flex h-56 w-56 items-center justify-center rounded-full font-display text-5xl font-extrabold">SOS</div>
          </div>
        </div>
      </main>
      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-3">
        {[
          { icon: Users, t: "Trusted contacts", d: "Choose who gets alerted." },
          { icon: MapPin, t: "Live location", d: "Your coordinates + map link." },
          { icon: Mail, t: "Real email alerts", d: "Delivered instantly." },
        ].map(({ icon: I, t, d }) => (
          <div key={t} className="rounded-2xl bg-card p-5 shadow-card">
            <I className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t}</h3>
            <p className="text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
