import OpenAI, { toFile } from "openai";

type TranscriptionResult =
  | { ok: true; text: string }
  | { ok: false; error: string; details?: string };

export async function transcribeWithOpenAI(input: {
  audioBuffer: Buffer;
  mimeType: string;
  prompt?: string;
}): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "OpenAI transcription service authentication is missing",
      details: "OPENAI_API_KEY is not set",
    };
  }

  const mimeType = normalizeAudioMimeType(input.mimeType);
  const filename = `held-voice-request.${getFileExtension(mimeType)}`;
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "whisper-1";
  const prompt =
    input.prompt ??
    "Transcribe the resident's service request. Preserve names, dates, locations, deadlines, return-by constraints, and other important details.";

  try {
    const client = new OpenAI({ apiKey });
    const file = await toFile(input.audioBuffer, filename, { type: mimeType });
    const data = await client.audio.transcriptions.create({
      file,
      language: "en",
      model,
      prompt,
      response_format: "json",
      temperature: 0,
    });

    if (!data.text) {
      return {
        ok: false,
        error: "Invalid OpenAI transcription response",
      };
    }

    return {
      ok: true,
      text: data.text.replace(/\s+/g, " ").trim(),
    };
  } catch (error) {
    return {
      ok: false,
      error: "OpenAI transcription request failed",
      details: getOpenAIErrorDetails(error),
    };
  }
}

function getFileExtension(mimeType: string) {
  const mimeToExt: Record<string, string> = {
    "audio/aac": "aac",
    "audio/m4a": "m4a",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/oga": "oga",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/webm": "webm",
    "video/mp4": "m4a",
    "video/webm": "webm",
  };

  return mimeToExt[normalizeAudioMimeType(mimeType)] || "webm";
}

function normalizeAudioMimeType(mimeType: string) {
  const compact = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!compact) return "audio/webm";
  if (compact === "audio/x-m4a") return "audio/m4a";
  return compact;
}

function getOpenAIErrorDetails(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    const body =
      typeof error.error === "string" ? error.error : JSON.stringify(error.error ?? {});
    return `${error.status ?? "unknown_status"} ${error.name}${body ? `: ${body}` : ""}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown transcription error";
}
