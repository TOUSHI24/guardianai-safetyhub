import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, MapPin, Pencil, Plus, ShieldCheck, Trash2, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { triggerSos } from "@/lib/sos.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GuardianAI" },
      { name: "description", content: "Your SOS button, trusted contacts and emergency history." },
      { property: "og:title", content: "Dashboard — GuardianAI" },
      { property: "og:description", content: "Your SOS button, trusted contacts and emergency history." },
    ],
  }),
  component: Dashboard,
});

type Contact = { id: string; name: string; email: string; notify: boolean };
type SosResult = { status: string; sent: number; failed: number; total: number; errors: string[] };

function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const sos = useServerFn(triggerSos);

  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()).data,
  });
  const contacts = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trusted_contacts").select("id,name,email,notify").order("created_at");
      if (error) throw error;
      return data as Contact[];
    },
  });
  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("emergency_events").select("*").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  const [phase, setPhase] = useState<"idle" | "locating" | "sending">("idle");
  const [result, setResult] = useState<(SosResult & { located: boolean }) | null>(null);
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);

  const name = profile.data?.full_name || (user.user_metadata?.full_name as string) || user.email;

  async function pressSos() {
    if (phase !== "idle") return;
    setResult(null);
    setPhase("locating");
    const loc = await getLocation();
    setPhase("sending");
    try {
      const r = await sos({ data: { latitude: loc?.latitude ?? null, longitude: loc?.longitude ?? null, message: `${name} pressed SOS and needs help immediately.` } });
      setResult({ ...r, located: !!loc });
      if (r.status === "sent") toast.success(`Alert emailed to ${r.sent} contact${r.sent === 1 ? "" : "s"}`);
      else if (r.status === "no_contacts") toast.warning("Event saved, but you have no enabled contacts.");
      else toast.error("Some emails failed to send");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "SOS failed");
    } finally {
      setPhase("idle");
      qc.invalidateQueries({ queryKey: ["events"] });
    }
  }

  async function saveContact() {
    if (!editing) return;
    const n = (editing.name ?? "").trim();
    const em = (editing.email ?? "").trim();
    if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return toast.error("Enter a name and a valid email");
    const { error } = editing.id
      ? await supabase.from("trusted_contacts").update({ name: n, email: em }).eq("id", editing.id)
      : await supabase.from("trusted_contacts").insert({ name: n, email: em, user_id: user.id });
    if (error) return toast.error(error.message);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }
  async function toggle(c: Contact) {
    await supabase.from("trusted_contacts").update({ notify: !c.notify }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }
  async function remove(c: Contact) {
    if (!confirm(`Delete ${c.name}?`)) return;
    await supabase.from("trusted_contacts").delete().eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }
  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const enabled = contacts.data?.filter((c) => c.notify).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> GuardianAI
        </div>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 pb-16">
        <section className="rounded-3xl bg-card p-6 text-center shadow-card md:p-10">
          <p className="text-sm text-muted-foreground">Hello,</p>
          <h1 className="text-2xl font-bold md:text-3xl">{name}</h1>
          <div className="relative mx-auto my-8 flex h-56 w-56 items-center justify-center md:h-64 md:w-64">
            {phase === "idle" && <span className="animate-sos-pulse absolute inset-4 rounded-full bg-primary/40" />}
            <button
              onClick={pressSos}
              disabled={phase !== "idle"}
              aria-label="Send SOS alert"
              className="sos-button relative flex h-48 w-48 flex-col items-center justify-center rounded-full font-display text-5xl font-extrabold transition-transform active:scale-95 disabled:opacity-80 md:h-56 md:w-56"
            >
              {phase === "idle" ? "SOS" : <Loader2 className="h-12 w-12 animate-spin" />}
              <span className="mt-1 text-xs font-medium tracking-wide">
                {phase === "locating" ? "Getting location…" : phase === "sending" ? "Sending alerts…" : "Tap for help"}
              </span>
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Alerts go to {enabled} enabled contact{enabled === 1 ? "" : "s"}.</p>
          {result && (
            <div className="mx-auto mt-5 max-w-md rounded-2xl bg-muted p-4 text-left text-sm">
              <StatusLine status={result.status} sent={result.sent} total={result.total} />
              <p className="mt-1 text-muted-foreground">{result.located ? "Location included." : "Location unavailable — alert sent without it."}</p>
              {result.errors.length > 0 && <p className="mt-2 break-words text-destructive">{result.errors.join(" · ")}</p>}
            </div>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Trusted contacts</h2>
              <Button size="sm" onClick={() => setEditing({ name: "", email: "" })}><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </div>
            {contacts.data?.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet. Add someone you trust.</p>}
            <ul className="divide-y">
              {contacts.data?.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                  </div>
                  <Switch checked={c.notify} onCheckedChange={() => toggle(c)} aria-label="Notifications" />
                  <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-card">
            <h2 className="mb-4 text-lg font-bold">Recent emergency events</h2>
            {events.data?.length === 0 && <p className="text-sm text-muted-foreground">No emergencies yet.</p>}
            <ul className="space-y-3">
              {events.data?.map((e) => (
                <li key={e.id} className="rounded-2xl bg-muted p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{new Date(e.created_at).toLocaleString()}</span>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{e.risk}</span>
                  </div>
                  <div className="mt-1"><StatusLine status={e.email_status} sent={e.emails_sent} total={e.emails_sent + e.emails_failed} /></div>
                  {e.latitude != null && e.longitude != null ? (
                    <a className="mt-1 inline-flex items-center gap-1 text-primary underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${e.latitude},${e.longitude}`}>
                      <MapPin className="h-3.5 w-3.5" /> {e.latitude.toFixed(5)}, {e.longitude.toFixed(5)}
                    </a>
                  ) : <p className="mt-1 text-muted-foreground">No location</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit contact" : "Add contact"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input maxLength={80} value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" maxLength={255} value={editing?.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveContact}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusLine({ status, sent, total }: { status: string; sent: number; total: number }) {
  if (status === "sent") return <p className="flex items-center gap-1.5 font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Email sent to {sent}/{total}</p>;
  if (status === "partial") return <p className="flex items-center gap-1.5 font-medium text-warning"><AlertTriangle className="h-4 w-4" /> Partially sent ({sent}/{total})</p>;
  if (status === "no_contacts") return <p className="flex items-center gap-1.5 font-medium text-warning"><AlertTriangle className="h-4 w-4" /> No enabled contacts</p>;
  if (status === "pending") return <p className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Sending…</p>;
  return <p className="flex items-center gap-1.5 font-medium text-destructive"><XCircle className="h-4 w-4" /> Email failed ({sent}/{total})</p>;
}
