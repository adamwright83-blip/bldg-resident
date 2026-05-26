import { useEffect, useRef, useState } from "react";

type VoiceVisualState = "idle" | "mic-entering" | "listening" | "holding";
type VoiceStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "summarizing"
  | "awaiting_confirmation"
  | "clarifying"
  | "confirmed"
  | "complete"
  | "error";

type InkPoint = {
  x: number;
  y: number;
};

type InkMark = {
  id: number;
  x: number;
  y: number;
};

type ParsedIntent = {
  display_request: string;
  services: Array<{
    type: string;
    timing: string | null;
    deadline: string | null;
    location: string | null;
    constraints: string[];
  }>;
  needs_clarification: boolean;
  clarification_question: string | null;
  clarification_options: string[];
};

type VoiceCommandResponse = {
  rawTranscript: string;
  displayRequest: string;
  parsedIntent: ParsedIntent;
  clarificationQuestion: string | null;
  clarificationOptions: string[];
  needsClarification: boolean;
};

type HeldVoiceCaptureTrayProps = {
  active: boolean;
  onConfirmRequest?: (request: string, services: ParsedIntent["services"]) => void;
  onEditRequest: (request?: string) => void;
  onTranscriptChange?: (transcript: string) => void;
  transcript?: string;
};

const ASSETS = {
  nib: "/held/nib-ink.png",
  requestCard: "/held/your-request-card.png",
  tray: "/held/audiomode-nursery-tray.png",
};

const MAX_POINTS = 140;
const SPEED = 1.65;
const BASELINE_Y = 50;
const START_X = 4;
const END_X = 94;
const SILENCE_MS = 1500;
const MAX_RECORDING_MS = 12000;
const VOICE_THRESHOLD = 0.055;

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function getAmplitude(data: Uint8Array<ArrayBuffer>) {
  let sum = 0;

  for (let index = 0; index < data.length; index += 1) {
    const centered = data[index] - 128;
    sum += centered * centered;
  }

  const rms = Math.sqrt(sum / data.length) / 128;
  return Math.min(1, rms * 2.4);
}

function buildSmoothPath(points: InkPoint[]) {
  if (points.length < 2) {
    return "";
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(
      2
    )}, ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  return path;
}

function seedPoints() {
  const points: InkPoint[] = [];

  for (let index = 0; index < 58; index += 1) {
    points.push({
      x: START_X + index * 1.45,
      y: BASELINE_Y,
    });
  }

  return points;
}

function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];

  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === "string" ? result : "");
    };
    reader.readAsDataURL(blob);
  });
}

export function HeldVoiceCaptureTray({
  active,
  onConfirmRequest,
  onEditRequest,
  onTranscriptChange,
  transcript,
}: HeldVoiceCaptureTrayProps) {
  const [voiceVisualState, setVoiceVisualState] =
    useState<VoiceVisualState>("idle");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [rawTranscript, setRawTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [displayRequest, setDisplayRequest] = useState(transcript ?? "");
  const [inkMarks, setInkMarks] = useState<InkMark[]>([]);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(
    null
  );
  const [clarificationOptions, setClarificationOptions] = useState<string[]>([]);
  const [confirmationProgress, setConfirmationProgress] = useState(0);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const heardVoiceRef = useRef(false);
  const lastWaveOffsetRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveInkDotRef = useRef<HTMLSpanElement | null>(null);
  const nibHitboxRef = useRef<HTMLButtonElement | null>(null);
  const nibRef = useRef<HTMLImageElement | null>(null);
  const nibXRef = useRef(76);
  const nibYRef = useRef(53);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const pathRef = useRef<SVGPathElement | null>(null);
  const pointsRef = useRef<InkPoint[]>(seedPoints());
  const rafRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const shouldProcessRecordingRef = useRef(false);
  const smoothedAmpRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const requestCopy = getRequestCopy({
    displayRequest,
    liveTranscript,
    rawTranscript,
    voiceStatus,
  });
  const requestCopySize =
    requestCopy.length > 92
      ? "text-[13px] leading-4"
      : requestCopy.length > 58
        ? "text-[14px] leading-[18px]"
        : "text-[15px] leading-5";

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    if (transcript?.trim()) {
      setDisplayRequest(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (!active) {
      setVoiceVisualState("idle");
      setVoiceStatus("idle");
      return undefined;
    }

    let cancelled = false;

    const cleanup = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      shouldProcessRecordingRef.current = false;
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;

      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      dataRef.current = null;
    };

    const submitRecording = async (blob: Blob) => {
      if (cancelled || blob.size === 0) {
        return;
      }

      try {
        setVoiceVisualState("holding");
        setVoiceStatus("transcribing");
        const audioBase64 = await blobToBase64(blob);
        const response = await fetch("/api/held/voice-command", {
          body: JSON.stringify({
            audioBase64,
            mimeType: blob.type || "audio/webm",
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Voice command failed: ${response.status}`);
        }

        const result = (await response.json()) as VoiceCommandResponse;
        if (cancelled) {
          return;
        }

        setVoiceStatus("summarizing");
        await wait(420);

        setRawTranscript(result.rawTranscript);
        setDisplayRequest(result.displayRequest);
        setParsedIntent(result.parsedIntent);
        setClarificationQuestion(result.clarificationQuestion);
        setClarificationOptions(result.clarificationOptions ?? []);
        onTranscriptChangeRef.current?.(result.displayRequest);

        if (result.needsClarification) {
          setVoiceStatus("clarifying");
        } else {
          setVoiceStatus("awaiting_confirmation");
        }
      } catch (error) {
        console.error("[HeldVoiceCaptureTray] voice command failed", error);
        setVoiceStatus("error");
      }
    };

    const stopRecordingForProcessing = () => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        return;
      }

      shouldProcessRecordingRef.current = true;
      recorder.stop();
    };

    const updateInkLine = () => {
      const points = pointsRef.current;
      const amp = Math.max(smoothedAmpRef.current, 0.035);
      const speechAmp = Math.min(1, amp * 1.65);
      const time = performance.now() / 1000;
      const organicWave =
        Math.sin(time * 4.4) * speechAmp * 20 +
        Math.sin(time * 7.6 + Math.sin(time * 1.2)) * speechAmp * 8 +
        Math.sin(time * 12.5) * speechAmp * 2.5;
      const silenceDrift = Math.sin(time * 1.2) * 1.2;
      const targetOffset = organicWave + silenceDrift;
      lastWaveOffsetRef.current += (targetOffset - lastWaveOffsetRef.current) * 0.22;
      const y = BASELINE_Y + lastWaveOffsetRef.current;

      points.push({ x: END_X, y });

      for (const point of points) {
        point.x -= SPEED;
      }

      pointsRef.current = points.filter(point => point.x >= START_X);

      while (pointsRef.current.length > MAX_POINTS) {
        pointsRef.current.shift();
      }

      if (pathRef.current) {
        pathRef.current.setAttribute("d", buildSmoothPath(pointsRef.current));
        pathRef.current.style.strokeWidth = `${(1.45 + speechAmp * 0.95).toFixed(2)}`;
      }

      const livePoint = pointsRef.current[pointsRef.current.length - 1];
      if (livePoint && nibRef.current) {
        const xPercent = 14 + livePoint.x * 0.66;
        const yPercent = 43 + livePoint.y * 0.2;
        const tilt = 5 + Math.min(10, speechAmp * 8);
        nibXRef.current += (xPercent - nibXRef.current) * 0.26;
        nibYRef.current += (yPercent - nibYRef.current) * 0.26;
        nibRef.current.style.transform = `translate(-22%, -82%) rotate(${tilt.toFixed(2)}deg)`;
        nibRef.current.style.left = `${nibXRef.current.toFixed(2)}%`;
        nibRef.current.style.top = `${nibYRef.current.toFixed(2)}%`;
      }

      if (liveInkDotRef.current) {
        liveInkDotRef.current.style.left = `${nibXRef.current.toFixed(2)}%`;
        liveInkDotRef.current.style.top = `${nibYRef.current.toFixed(2)}%`;
      }

      if (nibHitboxRef.current) {
        nibHitboxRef.current.style.left = `${nibXRef.current.toFixed(2)}%`;
        nibHitboxRef.current.style.top = `${nibYRef.current.toFixed(2)}%`;
      }
    };

    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataRef.current;

      if (analyser && data) {
        analyser.getByteTimeDomainData(data);
        const rawAmp = getAmplitude(data);
        smoothedAmpRef.current = smoothedAmpRef.current * 0.82 + rawAmp * 0.18;

        if (rawAmp > VOICE_THRESHOLD) {
          heardVoiceRef.current = true;
          lastVoiceAtRef.current = performance.now();
        }

        const now = performance.now();
        const shouldStopForSilence =
          heardVoiceRef.current &&
          voiceStatusRef.current === "listening" &&
          now - lastVoiceAtRef.current > SILENCE_MS;
        const shouldStopForMaxLength =
          recordingStartedAtRef.current > 0 &&
          now - recordingStartedAtRef.current > MAX_RECORDING_MS;

        if (shouldStopForSilence || shouldStopForMaxLength) {
          stopRecordingForProcessing();
        }
      } else {
        smoothedAmpRef.current = smoothedAmpRef.current * 0.9 + 0.006;
      }

      updateInkLine();
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const start = async () => {
      try {
        setVoiceVisualState("mic-entering");
        setVoiceStatus("idle");
        setRawTranscript("");
        setLiveTranscript("");
        setDisplayRequest("");
        setInkMarks([]);
        setParsedIntent(null);
        setClarificationQuestion(null);
        setClarificationOptions([]);
        setConfirmationProgress(0);
        heardVoiceRef.current = false;
        lastVoiceAtRef.current = 0;
        recordingStartedAtRef.current = 0;
        lastWaveOffsetRef.current = 0;
        chunksRef.current = [];
        pointsRef.current = seedPoints();
        pathRef.current?.setAttribute("d", buildSmoothPath(pointsRef.current));

        await wait(700);

        if (cancelled) {
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.86;
        source.connect(analyser);

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        const mimeType = getSupportedRecordingMimeType();
        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );
        recorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const chunks = chunksRef.current;
          chunksRef.current = [];
          const shouldProcess = shouldProcessRecordingRef.current;
          shouldProcessRecordingRef.current = false;

          if (!shouldProcess || cancelled) {
            return;
          }

          const blob = new Blob(chunks, {
            type: recorder.mimeType || mimeType || "audio/webm",
          });
          void submitRecording(blob);
        };

        mediaRecorderRef.current = recorder;
        setVoiceVisualState("listening");
        setVoiceStatus("listening");
        recordingStartedAtRef.current = performance.now();
        recorder.start(250);
        tick();
        startDevSpeechFallback();
      } catch (error) {
        console.error("[HeldVoiceCaptureTray] microphone unavailable", error);
        cleanup();
        setVoiceStatus("error");
      }
    };

    void start();

    return () => {
      cancelled = true;
      setVoiceVisualState("holding");
      cleanup();
    };
  }, [active]);

  const voiceStatusRef = useRef(voiceStatus);
  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  const resolveClarification = (option: string) => {
    setDisplayRequest(current => `${current.replace(/[.?!]$/, "")}. ${option}.`);
    setClarificationQuestion(null);
    setClarificationOptions([]);
    setVoiceStatus("awaiting_confirmation");
  };

  const confirmRequest = async () => {
    if (voiceStatus !== "awaiting_confirmation") return;
    setConfirmationProgress(1);
    setVoiceStatus("confirmed");
    await wait(500);
    onConfirmRequest?.(displayRequest, parsedIntent?.services ?? []);
    setVoiceStatus("complete");
  };

  const requestCardStamped =
    voiceStatus === "confirmed" || voiceStatus === "complete";
  const editableRequestText = displayRequest || liveTranscript || rawTranscript || transcript || "";
  const canEditRequest =
    voiceStatus === "awaiting_confirmation" ||
    voiceStatus === "clarifying" ||
    voiceStatus === "error";
  const addInkMark = () => {
    const id = Date.now();
    setInkMarks(current => [
      ...current.slice(-2),
      { id, x: nibXRef.current, y: nibYRef.current },
    ]);
    window.setTimeout(() => {
      setInkMarks(current => current.filter(mark => mark.id !== id));
    }, 720);
  };

  return (
    <div
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-0 z-20 overflow-hidden transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0"
      }`}
      data-held-voice-status={voiceStatus}
      data-held-voice-state={voiceVisualState}
    >
      <div className="absolute left-1/2 top-[27%] w-[88%] -translate-x-1/2">
        <img
          alt=""
          className="pointer-events-none relative z-0 w-full select-none drop-shadow-[0_18px_24px_rgba(45,29,16,0.22)]"
          draggable={false}
          src={ASSETS.tray}
        />
        <svg
          aria-hidden="true"
          className="absolute left-[14%] top-[43%] z-10 h-[20%] w-[66%] overflow-visible"
          focusable="false"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path
            ref={pathRef}
            d={buildSmoothPath(pointsRef.current)}
            fill="none"
            stroke="#1f1a16"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            style={{ opacity: 0.9 }}
          />
        </svg>
        <span
          ref={liveInkDotRef}
          aria-hidden="true"
          className="pointer-events-none absolute z-[19] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f1a16]/70 blur-[0.5px]"
          style={{
            left: `${nibXRef.current}%`,
            top: `${nibYRef.current}%`,
          }}
        />
        {inkMarks.map(mark => (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-[18] h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[#1f1a16]/35 blur-[1px]"
            key={mark.id}
            style={{
              left: `${mark.x}%`,
              top: `${mark.y - 1}%`,
            }}
          />
        ))}
        <button
          ref={nibHitboxRef}
          aria-label="Nudge ink nib"
          className="pointer-events-auto absolute z-[21] h-[22%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
          onClick={addInkMark}
          style={{
            left: `${nibXRef.current}%`,
            top: `${nibYRef.current}%`,
          }}
          type="button"
        />
        <img
          ref={nibRef}
          alt=""
          className="pointer-events-none absolute z-20 h-[22%] select-none drop-shadow-[0_8px_12px_rgba(42,28,16,0.18)]"
          draggable={false}
          src={ASSETS.nib}
          style={{
            left: "76%",
            top: "53%",
            transform: "translate(-22%, -82%) rotate(7deg)",
            transformOrigin: "50% 92%",
          }}
        />
      </div>

      <div className="pointer-events-auto absolute left-1/2 top-[67%] z-40 w-[82%] -translate-x-1/2">
        <img
          alt=""
          className="w-full select-none drop-shadow-[0_10px_18px_rgba(54,38,23,0.12)]"
          draggable={false}
          src={ASSETS.requestCard}
        />
        <p
          className={`pointer-events-none absolute left-[6%] top-[46%] line-clamp-3 max-w-[68%] -translate-y-1/2 font-serif italic text-[#2f2923] ${requestCopySize}`}
        >
          {requestCopy}
        </p>
        {canEditRequest && (
          <button
            aria-label="Edit heard request"
            className="absolute left-[5%] top-[24%] h-[48%] w-[70%] rounded opacity-0"
            onClick={() => onEditRequest(editableRequestText)}
            type="button"
          />
        )}

        {requestCardStamped && (
          <div className="pointer-events-none absolute right-[15%] top-[43%] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#a77724] bg-[#b78632]/10 font-serif text-[18px] text-[#9a681f]">
            H
          </div>
        )}

        {voiceStatus === "clarifying" && clarificationQuestion && (
          <div className="absolute left-[6%] top-[72%] flex max-w-[78%] flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#956923]">
            <span className="basis-full text-[#5a4d40]">{clarificationQuestion}</span>
            {clarificationOptions.map(option => (
              <button
                className="font-serif text-[12px] underline decoration-[#b78a38]/35 underline-offset-4"
                key={option}
                onClick={() => resolveClarification(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {voiceStatus === "awaiting_confirmation" && (
          <button
            aria-label="Set it in motion"
            className="absolute bottom-[5%] left-[6%] min-h-11 w-[72%] touch-manipulation text-left transition-transform duration-150 active:scale-[0.98]"
            onClick={() => void confirmRequest()}
            type="button"
          >
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[#b78a38]/28" />
            <div
              className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-[#a77724]"
              style={{ width: `${confirmationProgress * 100}%` }}
            />
            <div
              className="absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#a77724] bg-[#c69b55] font-serif text-[15px] text-[#3b2614] shadow-[0_4px_10px_rgba(68,43,20,0.22)]"
              style={{
                left: `calc(${confirmationProgress * 100}% - 14px)`,
              }}
            >
              H
            </div>
            <p className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 font-serif text-[13px] text-[#9a681f]">
              Set it in motion →
            </p>
          </button>
        )}

        {voiceStatus === "confirmed" && (
          <p className="pointer-events-none absolute bottom-[13%] left-[6%] font-serif text-[13px] italic text-[#9a681f]">
            Taking custody.
          </p>
        )}

        <button
          aria-label="Open composer"
          className="absolute right-[5%] top-[26%] h-[48%] w-[15%] rounded opacity-0"
          onClick={() => onEditRequest(editableRequestText)}
          type="button"
        />
      </div>
    </div>
  );
}

function getRequestCopy({
  displayRequest,
  liveTranscript,
  rawTranscript,
  voiceStatus,
}: {
  displayRequest: string;
  liveTranscript: string;
  rawTranscript: string;
  voiceStatus: VoiceStatus;
}) {
  if (voiceStatus === "listening") {
    return "I hear you. Turning your words into a request.";
  }

  if (voiceStatus === "transcribing") {
    return "Turning your words into a request.";
  }

  if (voiceStatus === "summarizing") {
    return "Making sense of it.";
  }

  if (voiceStatus === "error") {
    return "I caught the motion, not the words. Try once more, or write it.";
  }

  if (displayRequest.trim()) {
    return displayRequest;
  }

  if (liveTranscript.trim()) {
    return liveTranscript;
  }

  if (rawTranscript.trim()) {
    return rawTranscript;
  }

  return "I hear you. Turning your words into a request.";
}

function startDevSpeechFallback() {
  const enabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("speechFallback") === "1";

  if (!enabled) {
    return;
  }

  // Production uses MediaRecorder upload. This hook is intentionally inert unless
  // a developer opts into the browser recognition fallback by query string.
}
