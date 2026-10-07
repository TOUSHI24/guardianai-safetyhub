import net from "node:net";
import tls from "node:tls";

type Sock = net.Socket | tls.TLSSocket;

function reader(sock: Sock) {
  let buf = "";
  const waiters: ((s: string) => void)[] = [];
  const onData = (d: Buffer) => {
    buf += d.toString("utf8");
    // A full reply ends with a line "XYZ <text>\r\n"
    for (;;) {
      const lines = buf.split("\r\n");
      let end = -1;
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) { end = i; break; }
      }
      if (end === -1) return;
      const reply = lines.slice(0, end + 1).join("\n");
      buf = lines.slice(end + 1).join("\r\n");
      const w = waiters.shift();
      if (w) w(reply);
    }
  };
  sock.on("data", onData);
  return {
    next: () =>
      new Promise<string>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("SMTP timeout")), 20000);
        waiters.push((s) => { clearTimeout(t); resolve(s); });
      }),
    detach: () => sock.off("data", onData),
  };
}

async function cmd(sock: Sock, r: ReturnType<typeof reader>, line: string | null, expect: number) {
  if (line !== null) sock.write(line + "\r\n");
  const reply = await r.next();
  const code = parseInt(reply.slice(0, 3), 10);
  if (code !== expect) throw new Error(`SMTP error after "${line?.startsWith("AUTH") ? "AUTH" : line}": ${reply}`);
  return reply;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

export interface SmtpConfig { host: string; port: number; user: string; pass: string; from: string; fromName: string }

export async function sendMail(cfg: SmtpConfig, to: string, subject: string, text: string, html: string) {
  const implicitTls = cfg.port === 465;
  let sock: Sock = await new Promise<Sock>((resolve, reject) => {
    const s = implicitTls
      ? tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host }, () => resolve(s))
      : net.connect({ host: cfg.host, port: cfg.port }, () => resolve(s));
    s.once("error", reject);
  });
  let r = reader(sock);
  try {
    await cmd(sock, r, null, 220);
    await cmd(sock, r, "EHLO guardianai.app", 250);
    if (!implicitTls) {
      await cmd(sock, r, "STARTTLS", 220);
      r.detach();
      const plain = sock as net.Socket;
      sock = await new Promise<Sock>((resolve, reject) => {
        const s = tls.connect({ socket: plain, servername: cfg.host }, () => resolve(s));
        s.once("error", reject);
      });
      r = reader(sock);
      await cmd(sock, r, "EHLO guardianai.app", 250);
    }
    await cmd(sock, r, `AUTH PLAIN ${b64(`\0${cfg.user}\0${cfg.pass}`)}`, 235);
    await cmd(sock, r, `MAIL FROM:<${cfg.from}>`, 250);
    await cmd(sock, r, `RCPT TO:<${to}>`, 250);
    await cmd(sock, r, "DATA", 354);
    const boundary = "gai_" + Math.random().toString(36).slice(2);
    const body = [
      `From: =?UTF-8?B?${b64(cfg.fromName)}?= <${cfg.from}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@guardianai.app>`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(text).replace(/.{76}/g, "$&\r\n"),
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(html).replace(/.{76}/g, "$&\r\n"),
      `--${boundary}--`,
      ".",
    ].join("\r\n");
    await cmd(sock, r, body, 250);
    sock.write("QUIT\r\n");
  } finally {
    setTimeout(() => sock.destroy(), 200);
  }
}
