import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseHeldCommand } from "./_intent";
import { transcribeWithOpenAI } from "./_transcribe";

type HeldVoiceCommandBody = {
  audioBase64?: string;
  mimeType?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as HeldVoiceCommandBody;
  const audioBase64 = body.audioBase64?.trim();
  const mimeType = body.mimeType?.trim() || "audio/webm";

  if (!audioBase64) {
    res.status(400).json({ error: "Audio is required." });
    return;
  }

  try {
    const audioBuffer = Buffer.from(stripDataUrlPrefix(audioBase64), "base64");
    const transcription = await transcribeWithOpenAI({
      audioBuffer,
      mimeType,
      prompt:
        "Transcribe the resident's spoken service request exactly enough for intent parsing. Preserve dates, deadlines, names, locations, flight numbers, allergies, and constraints.",
    });

    if ("error" in transcription) {
      res.status(502).json({
        error: transcription.error,
        details: transcription.details,
      });
      return;
    }

    const rawTranscript = transcription.text;
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
    console.error("[HeldVoiceCommandAPI] voice command failed", error);
    res.status(500).json({
      error: "Voice command processing failed.",
    });
  }
}

function stripDataUrlPrefix(value: string) {
  const commaIndex = value.indexOf(",");
  if (value.startsWith("data:") && commaIndex >= 0) {
    return value.slice(commaIndex + 1);
  }
  return value;
}
