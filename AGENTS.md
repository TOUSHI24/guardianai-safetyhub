<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- SOS emails are sent from a server function via a hand-written SMTP client (src/lib/smtp.server.ts) using Brevo SMTP secrets — user required SMTP, not the Brevo HTTP API.
- Behaviour scoring uses a shared deterministic pure module and authenticated server functions over owner-scoped stored samples; baseline learning excludes unresolved anomalous samples to avoid teaching unsafe activity as normal.
- Live geolocation monitoring runs only while the page is open; demo state stays in memory and never sends email or writes real safety records.
