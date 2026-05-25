import { useEffect, useRef, useState } from "react";

type VoiceState = "idle" | "mic-entering" | "listening" | "holding";

type InkPoint = {
  x: number;
  y: number;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  abort: () => void;
  start: () => void;
  stop: () => void;
  onend: ((event?: unknown) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onresult:
    | ((event: {
        results: ArrayLike<{
          0?: { transcript?: string };
          isFinal?: boolean;
        }>;
      }) => void)
    | null;
};

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
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

export function HeldVoiceCaptureTray({
  active,
  onEditRequest,
  onTranscriptChange,
  transcript,
}: HeldVoiceCaptureTrayProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const pathRef = useRef<SVGPathElement | null>(null);
  const pointsRef = useRef<InkPoint[]>(seedPoints());
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const smoothedAmpRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const chainRef = useRef<HTMLImageElement | null>(null);
  const nibRef = useRef<HTMLImageElement | null>(null);
  const displayTranscript =
    transcript?.trim() || "Listening for what you need.";

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    if (!active) {
      setVoiceState("idle");
      return undefined;
    }

    let cancelled = false;

    const cleanup = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      recognitionRef.current?.abort();
      recognitionRef.current = null;

      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      dataRef.current = null;
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
      } else {
        smoothedAmpRef.current = smoothedAmpRef.current * 0.9 + 0.006;
      }

      updateInkLine();
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const startSpeechRecognition = () => {
      const SpeechRecognitionConstructor = (
        (window as SpeechWindow).SpeechRecognition ??
        (window as SpeechWindow).webkitSpeechRecognition
      ) as unknown as (new () => SpeechRecognitionLike) | undefined;

      if (!SpeechRecognitionConstructor) {
        return;
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = event => {
        const words: string[] = [];

        for (let index = 0; index < event.results.length; index += 1) {
          words.push(event.results[index][0]?.transcript ?? "");
        }

        const nextTranscript = words.join(" ").replace(/\s+/g, " ").trim();
        if (nextTranscript) {
          onTranscriptChangeRef.current?.(nextTranscript);
        }
      };
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
      }
    };

    const start = async () => {
      try {
        setVoiceState("mic-entering");
        pointsRef.current = seedPoints();
        pathRef.current?.setAttribute("d", buildSmoothPath(pointsRef.current));

        await wait(700);

        if (cancelled) {
          return;
        }

        setVoiceState("listening");
        tick();

        try {
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

          startSpeechRecognition();
        } catch {
          analyserRef.current = null;
          dataRef.current = null;
        }
      } catch {
        cleanup();
        setVoiceState("idle");
      }
    };

    void start();

    return () => {
      cancelled = true;
      setVoiceState("holding");
      cleanup();
    };
  }, [active]);

  return (
    <div
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-0 z-20 overflow-hidden transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0"
      }`}
      data-held-voice-state={voiceState}
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
          {displayTranscript}
        </p>
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
