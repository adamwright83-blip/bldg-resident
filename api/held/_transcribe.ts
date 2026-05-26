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
  const formData = new FormData();
  const filename = `held-voice-request.${getFileExtension(mimeType)}`;
  const audioBlob = new Blob([new Uint8Array(input.audioBuffer)], {
    type: mimeType,
  });

  formData.append("file", audioBlob, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append(
    "prompt",
    input.prompt ??
      "Transcribe the resident's service request. Preserve names, dates, locations, deadlines, return-by constraints, and other important details."
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "Accept-Encoding": "identity",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return {
      ok: false,
      error: "OpenAI transcription request failed",
      details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`,
    };
  }

  const data = (await response.json()) as { text?: string };
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
