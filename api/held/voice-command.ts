import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseHeldCommand } from "./_intent.js";
import { transcribeWithOpenAI } from "./_transcribe.js";

type HeldVoiceCommandBody = {
  audioBase64?: string;
  mimeType?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = readVoiceBody(req.body);
    const audioBase64 = body.audioBase64?.trim();
    const mimeType = body.mimeType?.trim() || "audio/webm";

    if (!audioBase64) {
      res.status(400).json({ error: "Audio is required.", code: "missing_audio" });
      return;
    }

    const audioBuffer = Buffer.from(stripDataUrlPrefix(audioBase64), "base64");
    const transcription = await transcribeWithOpenAI({
      audioBuffer,
      mimeType,
      prompt:
        "Transcribe the resident's spoken service request exactly enough for intent parsing. Preserve dates, deadlines, names, locations, flight numbers, allergies, and constraints.",
    });

    if (!transcription.ok) {
      console.error("[HeldVoiceCommandAPI] transcription failed", {
        code: "transcription_failed",
        details: transcription.details,
        error: transcription.error,
        mimeType,
      });
      const includeDiagnostics = req.headers["x-held-diagnostics"] === "1";
      res.status(502).json({
        code: "transcription_failed",
        ...(includeDiagnostics && transcription.details
          ? { diagnostics: transcription.details }
          : {}),
        error: transcription.error,
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
      code: "voice_command_failed",
      error: "Voice command processing failed.",
    });
  }
}

function readVoiceBody(body: unknown): HeldVoiceCommandBody {
  if (!body) return {};

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as HeldVoiceCommandBody;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return body && typeof body === "object" ? (body as HeldVoiceCommandBody) : {};
}

function stripDataUrlPrefix(value: string) {
  const commaIndex = value.indexOf(",");
  if (value.startsWith("data:") && commaIndex >= 0) {
    return value.slice(commaIndex + 1);
  }
  return value;
}
