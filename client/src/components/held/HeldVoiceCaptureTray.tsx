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
  onEditRequest: () => void;
  onTranscriptChange?: (transcript: string) => void;
  transcript?: string;
};

const ASSETS = {
  chain: "/held/fountainpen-chain.png",
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
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(
    null
  );
  const [clarificationOptions, setClarificationOptions] = useState<string[]>([]);
  const [confirmationProgress, setConfirmationProgress] = useState(0);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chainRef = useRef<HTMLImageElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const heardVoiceRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const nibRef = useRef<HTMLImageElement | null>(null);
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
      const time = performance.now() / 1000;
      const organicWave =
        Math.sin(time * 5.2) * amp * 18 +
        Math.sin(time * 2.1) * amp * 9 +
        Math.sin(time * 11) * amp * 3;
      const silenceDrift = Math.sin(time * 1.2) * 1.2;
      const y = BASELINE_Y + organicWave + silenceDrift;

      points.push({ x: END_X, y });

      for (const point of points) {
        point.x -= SPEED;
      }

      pointsRef.current = points.filter(point => point.x >= START_X);

      while (pointsRef.current.length > MAX_POINTS) {
        pointsRef.current.shift();
      }

      pathRef.current?.setAttribute("d", buildSmoothPath(pointsRef.current));

      const livePoint = pointsRef.current[pointsRef.current.length - 1];
      if (!livePoint) {
        return;
      }

      const nibX = 14 + livePoint.x * 0.62;
      const nibY = 42 + livePoint.y * 0.18;
      const nibRotation = 6 + amp * 5;

      if (nibRef.current) {
        nibRef.current.style.left = `${nibX}%`;
        nibRef.current.style.top = `${nibY}%`;
        nibRef.current.style.transform = `translate(-36%, -73%) rotate(${nibRotation.toFixed(
          2
        )}deg)`;
      }

      if (chainRef.current) {
        chainRef.current.style.left = `${nibX - 1.4}%`;
        chainRef.current.style.height = `${Math.max(28, nibY + 7).toFixed(
          2
        )}%`;
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
        setParsedIntent(null);
        setClarificationQuestion(null);
        setClarificationOptions([]);
        setConfirmationProgress(0);
        heardVoiceRef.current = false;
        lastVoiceAtRef.current = 0;
        recordingStartedAtRef.current = 0;
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

  const beginConfirmationDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (voiceStatus !== "awaiting_confirmation") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateConfirmationProgress(event);
  };

  const updateConfirmationProgress = (event: React.PointerEvent<HTMLDivElement>) => {
    if (voiceStatus !== "awaiting_confirmation") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const progress = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))
    );
    setConfirmationProgress(progress);
  };

  const completeConfirmationDrag = async () => {
    if (voiceStatus !== "awaiting_confirmation") return;
    if (confirmationProgress < 0.9) {
      setConfirmationProgress(0);
      return;
    }

    setConfirmationProgress(1);
    setVoiceStatus("confirmed");
    await wait(500);
    setVoiceStatus("complete");
  };

  const requestCardStamped =
    voiceStatus === "confirmed" || voiceStatus === "complete";

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
            strokeWidth="2.15"
            style={{ opacity: 0.9 }}
          />
        </svg>
        <img
          ref={chainRef}
          alt=""
          className="absolute top-[-63%] z-20 w-[4.8%] origin-top select-none object-fill"
          draggable={false}
          src={ASSETS.chain}
          style={{ left: "70.9%", height: "55%" }}
        />
        <img
          ref={nibRef}
          alt=""
          className="absolute z-30 w-[16%] select-none drop-shadow-[0_8px_12px_rgba(35,24,12,0.22)]"
          draggable={false}
          src={ASSETS.nib}
          style={{
            left: "72%",
            top: "51%",
            transform: "translate(-36%, -73%) rotate(7deg)",
            transition: "transform 80ms linear, left 80ms linear, top 80ms linear",
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
        <p className="pointer-events-none absolute left-[6%] top-[46%] max-w-[68%] -translate-y-1/2 font-serif text-[15px] italic leading-5 text-[#2f2923]">
          {requestCopy}
        </p>

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
          <div
            aria-label="Set it in motion"
            className="absolute bottom-[8%] left-[6%] h-8 w-[72%] touch-none"
            onPointerDown={beginConfirmationDrag}
            onPointerMove={updateConfirmationProgress}
            onPointerUp={completeConfirmationDrag}
            role="slider"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(confirmationProgress * 100)}
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
          </div>
        )}

        {voiceStatus === "confirmed" && (
          <p className="pointer-events-none absolute bottom-[13%] left-[6%] font-serif text-[13px] italic text-[#9a681f]">
            Taking custody.
          </p>
        )}

        <button
          aria-label="Open composer"
          className="absolute right-[5%] top-[26%] h-[48%] w-[15%] rounded opacity-0"
          onClick={onEditRequest}
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
    return "I heard you, but I need you to type this one.";
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
