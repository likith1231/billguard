import { hasCredentials, letterStream } from "@/lib/claude";
import { templateLetter } from "@/lib/letter-template";
import type { AuditResult } from "@/lib/schema";

export const maxDuration = 120;

type Body = { audit: AuditResult; recipient: "insurer" | "hospital"; findingIds: string[]; sender?: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body?.audit?.findings || !Array.isArray(body.findingIds) || !body.findingIds.length) {
    return Response.json({ error: "Pick at least one finding to dispute." }, { status: 400 });
  }
  const recipient = body.recipient === "hospital" ? "hospital" : "insurer";
  const encoder = new TextEncoder();

  if (body.audit.mode === "demo" || !hasCredentials()) {
    const text = templateLetter(body.audit, recipient, body.findingIds, body.sender);
    // Stream the template in chunks so demo mode feels the same as live.
    const stream = new ReadableStream({
      async start(c) {
        for (let i = 0; i < text.length; i += 24) {
          c.enqueue(encoder.encode(text.slice(i, i + 24)));
          await new Promise((r) => setTimeout(r, 12));
        }
        c.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const ms = letterStream(body.audit, recipient, body.findingIds, body.sender);
  const stream = new ReadableStream({
    async start(c) {
      try {
        for await (const ev of ms) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            c.enqueue(encoder.encode(ev.delta.text));
          }
        }
      } catch (e) {
        console.error(e);
        c.enqueue(encoder.encode("\n\n[Letter generation was interrupted — please try again.]"));
      }
      c.close();
    },
    cancel() {
      ms.abort();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
