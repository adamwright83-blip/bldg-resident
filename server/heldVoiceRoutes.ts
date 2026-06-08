import type { Express, Request, Response } from "express";
import { buildHeldPhoneFollowupReply } from "./_core/heldPhoneFollowup";
import { parseHeldVoiceIntent } from "./_core/heldVoiceIntent";
import { transcribeAudioBuffer } from "./_core/voiceTranscription";

type HeldVoiceCommandBody = {
  audioBase64?: string;
  mimeType?: string;
};

type HeldPhoneFollowupBody = {
  displayRequest?: string;
  message?: string;
  previousMessages?: string[];
  services?: Array<{
    type?: string;
    timing?: string | null;
    deadline?: string | null;
    orderId?: string | null;
    status?: string | null;
  }>;
};

export function registerHeldVoiceRoutes(app: Express) {
  app.post("/api/held/phone-followup", async (req: Request, res: Response) => {
    const body = req.body as HeldPhoneFollowupBody;
    const message = body.message?.replace(/\s+/g, " ").trim();

    if (!message) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    try {
      const reply = await buildHeldPhoneFollowupReply({
        displayRequest: body.displayRequest,
        message,
        previousMessages: Array.isArray(body.previousMessages)
          ? body.previousMessages.filter((item): item is string => typeof item === "string")
          : [],
        services: Array.isArray(body.services)
          ? body.services
              .filter(service => typeof service.type === "string")
              .map(service => ({
                type: service.type!,
                timing: typeof service.timing === "string" ? service.timing : null,
                deadline: typeof service.deadline === "string" ? service.deadline : null,
                orderId: typeof service.orderId === "string" ? service.orderId : null,
                status: typeof service.status === "string" ? service.status : null,
              }))
          : [],
      });

      res.json({ reply });
    } catch (error) {
      console.error("[HeldVoiceRoutes] phone follow-up failed", error);
      res.status(500).json({
        error: "Phone follow-up processing failed.",
      });
    }
  });

  app.post("/api/held/voice-command", async (req: Request, res: Response) => {
    const body = req.body as HeldVoiceCommandBody;
    const audioBase64 = body.audioBase64?.trim();
    const mimeType = body.mimeType?.trim() || "audio/webm";

    if (!audioBase64) {
      res.status(400).json({ error: "Audio is required." });
      return;
    }

    try {
      const audioBuffer = Buffer.from(stripDataUrlPrefix(audioBase64), "base64");
      const transcription = await transcribeAudioBuffer({
        audioBuffer,
        language: "en",
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

      const rawTranscript = transcription.text.replace(/\s+/g, " ").trim();
      const parsedIntent = await parseHeldVoiceIntent(rawTranscript);

      res.json({
        rawTranscript,
        displayRequest: parsedIntent.display_request,
        parsedIntent,
        clarificationQuestion: parsedIntent.clarification_question,
        clarificationOptions: parsedIntent.clarification_options,
        needsClarification: parsedIntent.needs_clarification,
      });
    } catch (error) {
      console.error("[HeldVoiceRoutes] voice command failed", error);
      res.status(500).json({
        error: "Voice command processing failed.",
      });
    }
  });
}

function stripDataUrlPrefix(value: string) {
  const commaIndex = value.indexOf(",");
  if (value.startsWith("data:") && commaIndex >= 0) {
    return value.slice(commaIndex + 1);
  }
  return value;
}
