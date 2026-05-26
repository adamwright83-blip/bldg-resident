import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseHeldCommand } from "./_intent";

type HeldTextCommandBody = {
  text?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as HeldTextCommandBody;
  const rawTranscript = body.text?.replace(/\s+/g, " ").trim() ?? "";

  if (!rawTranscript) {
    res.status(400).json({ error: "Text is required." });
    return;
  }

  try {
    const parsedIntent = await parseHeldCommand(rawTranscript);

    res.status(200).json({
      rawTranscript,
      displayRequest: parsedIntent.display_request,
      parsedIntent,
      clarificationQuestion: parsedIntent.clarification_question,
      clarificationOptions: parsedIntent.clarification_options,
      needsClarification: parsedIntent.needs_clarification,
    });
  } catch (error) {
    console.error("[HeldTextCommandAPI] text command failed", error);
    res.status(500).json({
      error: "Text command processing failed.",
    });
  }
}
