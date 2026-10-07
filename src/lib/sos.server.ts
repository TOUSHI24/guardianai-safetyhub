import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const esc = (s: string) => s.replace(/[&<>"\']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "\'": "&#39;" })[c] ?? c);
export async function dispatchSos(supabase: SupabaseClient<Database>, userId: string, data: { latitude: number | null; longitude: number | null; message: string; trigger?: string; risk_score?: number; risk?: string; reasons?: string[]; user_response?: string }) {

    const { sendMail } = await import("./smtp.server");

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    const name = profile?.full_name || "A GuardianAI user";

    const { data: event, error: evErr } = await supabase
      .from("emergency_events")
      .insert({ user_id: userId, message: data.message, latitude: data.latitude, longitude: data.longitude, trigger: data.trigger ?? "manual_sos", risk_score: data.risk_score ?? 100, risk: data.risk ?? "CRITICAL", reasons: data.reasons ?? [], user_response: data.user_response ?? null })
      .select()
      .single();
    if (evErr || !event) throw new Error(evErr?.message ?? "Could not save emergency event");

    const { data: contacts } = await supabase.from("trusted_contacts").select("name,email").eq("notify", true);
    const recipients = contacts ?? [];

    const cfg = {
      host: process.env["BREVO_SMTP_HOST"] ?? "",
      port: Number(process.env["BREVO_SMTP_PORT"] ?? 587),
      user: process.env["BREVO_SMTP_USER"] ?? "",
      pass: process.env["BREVO_SMTP_PASSWORD"] ?? "",
      from: process.env["BREVO_FROM_EMAIL"] ?? "",
      fromName: "GuardianAI",
    };

    const when = new Date(event.created_at).toUTCString();
    const hasLoc = data.latitude != null && data.longitude != null;
    const maps = hasLoc ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}` : null;
    const locText = hasLoc ? `${data.latitude}, ${data.longitude}` : "Location unavailable";
    const subject = "GuardianAI Emergency Alert";
    const text = `EMERGENCY ALERT from ${name}\n\nMessage: ${data.message}\nRisk: ${data.risk ?? "CRITICAL"}\nDate/time: ${when}\nLatitude/Longitude: ${locText}\n${maps ? `Google Maps: ${maps}\n` : ""}\nPlease check on them immediately.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="color:#c8102e;margin:0 0 12px">🚨 GuardianAI Emergency Alert</h2>
<p><strong>${esc(name)}</strong> has triggered an SOS and may need help.</p>
<table cellpadding="6" style="border-collapse:collapse">
<tr><td><b>Message</b></td><td>${esc(data.message)}</td></tr>
<tr><td><b>Risk</b></td><td style="color:#c8102e;font-weight:bold">${esc(data.risk ?? "CRITICAL")}</td></tr>
<tr><td><b>Date/time</b></td><td>${esc(when)}</td></tr>
<tr><td><b>Latitude/Longitude</b></td><td>${esc(locText)}</td></tr>
</table>
${maps ? `<p><a href="${maps}" style="background:#c8102e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open location in Google Maps</a></p>` : ""}
<p>Please check on them immediately.</p></div>`;

    let sent = 0;
    const errors: string[] = [];
    if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) {
      errors.push("Email settings are missing on the server.");
    } else {
      for (const c of recipients) {
        try {
          await sendMail(cfg, c.email, subject, text, html);
          sent++;
        } catch (e) {
          errors.push(`${c.email}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    const failed = recipients.length - sent;
    const status = recipients.length === 0 ? "no_contacts" : sent === recipients.length ? "sent" : sent > 0 ? "partial" : "failed";

    await supabase
      .from("emergency_events")
      .update({ email_status: status, emails_sent: sent, emails_failed: failed, email_error: errors.join(" | ").slice(0, 1000) || null })
      .eq("id", event.id);

    return { eventId: event.id, status, sent, failed, total: recipients.length, errors };

}
