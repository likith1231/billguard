import { hasCredentials, letterStream } from "@/lib/claude";
import { requireUser } from "@/lib/auth/guard";
import { consumeQuota, refundQuota } from "@/lib/auth/limits";
import { isLang, type Lang } from "@/lib/letter-i18n";
import { templateLetter } from "@/lib/letter-template";
import type { AuditResult } from "@/lib/schema";

export const maxDuration = 120;

type Body = { audit: AuditResult; recipient: "insurer" | "hospital"; findingIds: string[]; sender?: string; lang?: Lang };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body?.audit?.findings || !Array.isArray(body.findingIds) || !body.findingIds.length) {
    return Response.json({ error: "Pick at least one finding to dispute." }, { status: 400 });
  }
  const recipient = body.recipient === "hospital" ? "hospital" : "insurer";
  const lang: Lang = isLang(body.lang) ? body.lang : "en";
  const encoder = new TextEncoder();

  const template = () => templateLetter(body.audit, recipient, body.findingIds, body.sender, lang);
  // Stream the template in chunks so it feels the same as a live letter.
  const typeOut = async (c: ReadableStreamDefaultController, text: string) => {
    for (let i = 0; i < text.length; i += 24) {
      c.enqueue(encoder.encode(text.slice(i, i + 24)));
      await new Promise((r) => setTimeout(r, 12));
    }
  };

  if (body.audit.mode !== "live" || !hasCredentials()) {
    const stream = new ReadableStream({
      async start(c) {
        await typeOut(c, template());
        c.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  // A letter written by Claude needs an account (it costs money). Without one, or once today's AI letters are used up,
  // the free template letter is served instead of an error: nobody is left without a letter.
  const templateResponse = (why: "template-signin" | "template-quota") => {
    const stream = new ReadableStream({
      async start(c) {
        await typeOut(c, template());
        c.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Letter-Source": why } });
  };
  const auth = await requireUser(req, "AI-written letters");
  if (!auth.ok) return templateResponse("template-signin");
  if (!auth.dev) {
    const quota = await consumeQuota(auth.user.id, "letter");
    if (!quota.allowed) return templateResponse("template-quota");
  }

  const ms = letterStream(body.audit, recipient, body.findingIds, body.sender, lang);
  const stream = new ReadableStream({
    async start(c) {
      let sent = false;
      try {
        for await (const ev of ms) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            sent = true;
            c.enqueue(encoder.encode(ev.delta.text));
          }
        }
      } catch (e) {
        console.error(e);
        // If the AI failed before writing anything (no credits, outage), fall back to the template.
        if (!sent) {
          if (!auth.dev) await refundQuota(auth.user.id, "letter").catch(() => undefined);
          await typeOut(c, template());
        }
        else c.enqueue(encoder.encode("\n\n[Letter generation was interrupted — please try again.]"));
      }
      c.close();
    },
    cancel() {
      ms.abort();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
