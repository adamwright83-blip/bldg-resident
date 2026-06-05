import { useLayoutEffect, useMemo, useRef, useState } from "react";

export type HeldParsedService = {
  type: string;
  timing?: string | null;
  deadline?: string | null;
};

type HeldArtistDrawingProps = {
  displayRequest: string;
  onDrawingComplete: () => void;
  services?: HeldParsedService[];
};

const ASSETS = {
  cradle: "/held/nursery-cradle.png",
  pen: "/held/fountainpenfull.png",
};

// Final locked Picasso single-line drawings (approved 2026-06-04).
// `main` is the primary gesture the fountain-pen nib traces live (getTotalLength).
// `details` are small accent strokes (ear, eye, nose, shower) revealed right after
// the main line completes — they keep the nib animation clean on a single path.
type HeldDrawing = { main: string; details?: string[] };

const COMPOSITE_PATHS: Record<string, HeldDrawing> = {
  // CAR — open rear gap, abstract flowing silhouette, two wheel arches.
  car_detail: {
    main: "M392 158 C376 148 320 146 280 144 C252 122 214 112 170 112 C126 112 96 126 82 152 C64 150 40 152 40 170 C40 184 60 188 70 184 M70 184 C68 166 96 166 104 184 C112 188 290 188 298 184 M298 184 C296 166 324 166 332 184 C338 188 360 188 372 182",
  },
  // DOG — canine profile looking up at an abstract shower head; ear, eye, nose accents.
  dog_grooming: {
    main: "M88 150 C76 138 80 120 96 118 C108 116 116 120 124 130 C148 132 196 132 224 132 C236 132 248 128 256 116 C262 106 270 96 286 96 C300 96 312 104 320 116 C326 124 336 124 344 120 C354 116 360 122 356 130 C352 138 340 138 332 136 C326 148 322 156 320 162 M320 162 C318 150 308 146 300 150 C290 154 282 152 276 160 C270 178 262 196 256 202 M256 202 C258 184 250 174 240 176 C220 180 160 180 140 176 C130 174 124 184 124 196 C124 204 116 210 108 208 M108 208 C112 196 106 188 96 188 C86 188 82 178 86 168 C88 160 86 154 88 150",
    details: [
      "M296 100 C284 104 278 118 282 134 C284 142 294 142 300 136",
      "M306 116 C306 114 309 114 309 116 C309 118 306 118 306 116",
      "M352 128 C350 126 346 126 344 129",
      "M296 44 C296 44 332 36 366 44 M308 50 L304 66 M324 48 L320 68 M340 48 L338 68 M356 50 L354 68",
    ],
  },
  // FOLDED SHIRT — collar, shoulders, sleeves, hem; open terminal at the collar.
  laundry_pickup: {
    main: "M150 110 C150 110 138 100 130 110 C116 126 108 150 124 156 C140 162 148 150 150 136 C150 160 150 196 150 200 C150 210 160 214 170 214 L262 214 C272 214 282 210 282 200 C282 196 282 160 282 136 C284 150 292 162 308 156 C324 150 316 126 302 110 C294 100 282 110 282 110 M282 110 C272 100 250 100 240 112 C232 122 200 122 192 112 C184 102 168 102 158 110",
  },
  // Deadline laundry uses the same approved shirt (the deadline is conveyed in copy).
  laundry_pickup_deadline: {
    main: "M150 110 C150 110 138 100 130 110 C116 126 108 150 124 156 C140 162 148 150 150 136 C150 160 150 196 150 200 C150 210 160 214 170 214 L262 214 C272 214 282 210 282 200 C282 196 282 160 282 136 C284 150 292 162 308 156 C324 150 316 126 302 110 C294 100 282 110 282 110 M282 110 C272 100 250 100 240 112 C232 122 200 122 192 112 C184 102 168 102 158 110",
  },
  // MULTI / BUNDLE — a loose continuous knot suggesting several things gathered.
  multi_service_default: {
    main: "M84 132 C130 96 200 100 232 134 C262 166 232 206 190 200 C150 194 144 156 178 146 C214 135 252 158 274 126 C294 96 344 104 354 144 C360 174 332 202 300 190",
  },
  // PAPER AIRPLANE — swept delta, tail notch left open.
  ride_airport: {
    main: "M66 152 C140 142 300 110 364 96 C374 94 378 104 368 112 C320 150 250 196 236 200 C228 204 222 196 226 188 L246 150 L66 152 M246 150 L210 138",
  },
};

export function getHeldCompositePath(
  displayRequest: string,
  services: HeldParsedService[] = []
): HeldDrawing {
  const serviceTypes = services.map(service => service.type).join(" ");
  const haystack = `${displayRequest} ${serviceTypes}`.toLowerCase();

  if (/laundry/.test(haystack) && /deadline|friday|returned?|before|by\s+\w+/.test(haystack)) {
    return COMPOSITE_PATHS.laundry_pickup_deadline;
  }

  if (/laundry/.test(haystack)) return COMPOSITE_PATHS.laundry_pickup;
  if (/dog|groom/.test(haystack)) return COMPOSITE_PATHS.dog_grooming;
  if (/airport|ride|uber|waymo|lax/.test(haystack)) return COMPOSITE_PATHS.ride_airport;
  if (/car|detail|wash/.test(haystack)) return COMPOSITE_PATHS.car_detail;

  return COMPOSITE_PATHS.multi_service_default;
}

function getDuration(services: HeldParsedService[] = []) {
  if (services.length <= 1) return 1800;
  if (services.length === 2) return 2400;
  return 3200;
}

export function HeldArtistDrawing({
  displayRequest,
  onDrawingComplete,
  services = [],
}: HeldArtistDrawingProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  // Ceremonial lead-in: the pen glides into the canvas from above (where it hung
  // in the home world) and only touches down on the first stroke point before any
  // line appears. `APPROACH_MS` is the travel time; the trace begins after it.
  const APPROACH_MS = 520;
  const [penStyle, setPenStyle] = useState({
    left: "50%",
    top: "-14%",
    transform: "translate(-30%, -86%) rotate(8deg)",
    transition: `left ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  });
  const [hasEntered, setHasEntered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const drawing = useMemo(
    () => getHeldCompositePath(displayRequest, services),
    [displayRequest, services]
  );
  const path = drawing.main;
  const details = drawing.details ?? [];
  const duration = useMemo(() => getDuration(services), [services]);
  onDrawingCompleteRef.current = onDrawingComplete;

  useLayoutEffect(() => {
    const svgPath = pathRef.current;
    if (!svgPath) return undefined;

    completedRef.current = false;
    setIsComplete(false);

    let holdTimer: number | null = null;
    let fallbackTimer: number | null = null;
    let startWatchTimer: number | null = null;
    let approachTimer: number | null = null;
    let hasAnimatedFrame = false;

    const completeDrawing = (reason: "complete" | "fallback" | "invalid_path") => {
      if (completedRef.current) return;
      completedRef.current = true;

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (startWatchTimer !== null) {
        window.clearTimeout(startWatchTimer);
        startWatchTimer = null;
      }
      if (approachTimer !== null) {
        window.clearTimeout(approachTimer);
        approachTimer = null;
      }

      svgPath.style.strokeDashoffset = "0";
      setIsComplete(true);
      if (reason !== "complete") {
        console.warn("[HELD][Drawing] fallback used", { reason });
      } else {
        console.debug("[HELD][Drawing] completed");
      }
      // Hold long enough for the accent strokes (ear/eye/nose/shower) to finish
      // fading in before the screen transforms into clay tokens.
      holdTimer = window.setTimeout(() => onDrawingCompleteRef.current(), 1150);
    };

    let totalLength = 0;
    try {
      totalLength = svgPath.getTotalLength();
    } catch (error) {
      console.warn("[HELD][Drawing] path length unavailable", error);
      completeDrawing("invalid_path");
      return () => {
        if (holdTimer !== null) {
          window.clearTimeout(holdTimer);
        }
      };
    }

    if (!Number.isFinite(totalLength) || totalLength <= 0) {
      completeDrawing("invalid_path");
      return () => {
        if (holdTimer !== null) {
          window.clearTimeout(holdTimer);
        }
      };
    }

    svgPath.style.strokeDasharray = `${totalLength}`;
    svgPath.style.strokeDashoffset = `${totalLength}`;
    const start = svgPath.getPointAtLength(0);
    const nextStart = svgPath.getPointAtLength(3);
    const startAngle =
      (Math.atan2(nextStart.y - start.y, nextStart.x - start.x) * 180) / Math.PI;

    // Phase 1 (ceremonial): glide the pen from its off-canvas entry pose down to
    // the first stroke point. The CSS transition (set in initial penStyle) does
    // the easing. No line is drawn yet — dashoffset is still full length.
    setPenStyle({
      left: `${(start.x / 430) * 100}%`,
      top: `${(start.y / 260) * 100}%`,
      transform: `translate(-30%, -86%) rotate(${(startAngle + 82).toFixed(2)}deg)`,
      transition: `left ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    });
    setHasEntered(true);

    let startedAt = 0;
    const tick = (time: number) => {
      if (completedRef.current) return;
      hasAnimatedFrame = true;
      if (startWatchTimer !== null) {
        window.clearTimeout(startWatchTimer);
        startWatchTimer = null;
      }
      if (!startedAt) startedAt = time;
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentLength = totalLength * eased;
      let point: DOMPoint;
      let next: DOMPoint;
      let angle = -18;
      try {
        point = svgPath.getPointAtLength(currentLength);
        next = svgPath.getPointAtLength(Math.min(totalLength, currentLength + 3));
        angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
      } catch (error) {
        console.warn("[HELD][Drawing] path point unavailable", error);
        completeDrawing("fallback");
        return;
      }

      svgPath.style.strokeDashoffset = `${totalLength - currentLength}`;
      // No CSS transition during the trace — the nib must track the line per frame.
      setPenStyle({
        left: `${(point.x / 430) * 100}%`,
        top: `${(point.y / 260) * 100}%`,
        transform: `translate(-30%, -86%) rotate(${(angle + 82).toFixed(2)}deg)`,
        transition: "none",
      });

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      completeDrawing("complete");
    };

    // Phase 2 (after the pen lands): begin tracing the line. Watchdogs are armed
    // here so the approach time isn't counted against the "did it start" check.
    approachTimer = window.setTimeout(() => {
      if (completedRef.current) return;
      startWatchTimer = window.setTimeout(() => {
        if (!hasAnimatedFrame) {
          completeDrawing("fallback");
        }
      }, 500);
      fallbackTimer = window.setTimeout(() => {
        completeDrawing("fallback");
      }, duration + 900);
      rafRef.current = window.requestAnimationFrame(tick);
    }, APPROACH_MS);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
      }
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      if (startWatchTimer !== null) {
        window.clearTimeout(startWatchTimer);
      }
      if (approachTimer !== null) {
        window.clearTimeout(approachTimer);
      }
    };
  }, [duration, path]);

  return (
    <div className="absolute inset-0 z-[80] overflow-hidden bg-[#f4ecdf]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,252,246,0.78), rgba(244,235,222,0.9)), url(/held/held-paper-bg.png)",
          backgroundPosition: "center",
          backgroundSize: "cover, 420px 420px",
        }}
      />
      <header className="pointer-events-none absolute left-[8%] top-[8%] z-10">
        <p className="text-[15px] tracking-[0.08em] text-[#2d251d]">HELD.chat</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#7a6d5f]">
          Setting it in motion.
        </p>
      </header>

      <section
        className="absolute left-1/2 top-[16%] z-10 w-[66%] -translate-x-1/2 transition-[opacity,transform] duration-[560ms]"
        style={{
          opacity: hasEntered ? 1 : 0,
          transform: hasEntered
            ? "translate(-50%, 0)"
            : "translate(-50%, 14px) scale(0.97)",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          className="relative aspect-[0.78/1] w-full overflow-visible bg-[#f7ecd9]/88 shadow-[0_16px_24px_rgba(50,35,20,0.16)]"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,248,235,0.86), rgba(245,232,210,0.74)), url(/held/yourrequest-texture.png)",
            backgroundPosition: "center",
            backgroundSize: "cover, 260px 260px",
            clipPath:
              "polygon(1% 0, 99% 1%, 100% 98%, 96% 100%, 73% 99%, 49% 100%, 24% 99%, 0 98%, 1% 74%, 0 49%, 1% 24%)",
          }}
        >
          <svg
            aria-label="Composite service drawing"
            className={`absolute inset-[7%] h-[86%] w-[86%] overflow-visible transition-opacity duration-700 ${
              isComplete ? "opacity-75" : "opacity-100"
            }`}
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 430 260"
          >
            <path
              ref={pathRef}
              d={path}
              fill="none"
              opacity="0.92"
              stroke="#1A1A1A"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            {details.map((detail, index) => (
              <path
                key={index}
                d={detail}
                fill="none"
                stroke="#1A1A1A"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                style={{
                  opacity: isComplete ? 0.92 : 0,
                  transition: `opacity 320ms ease ${120 + index * 70}ms`,
                }}
              />
            ))}
          </svg>
          <img
            alt=""
            className="pointer-events-none absolute z-20 h-[42%] select-none drop-shadow-[0_14px_20px_rgba(35,24,12,0.24)] transition-[opacity] duration-500"
            decoding="sync"
            draggable={false}
            loading="eager"
            src={ASSETS.pen}
            style={penStyle}
          />
          <p className="pointer-events-none absolute bottom-[8%] right-[12%] z-10 font-serif text-[18px] italic text-[#2a2520]/75">
            Held.
          </p>
        </div>
      </section>

      <p className="pointer-events-none absolute left-[12%] right-[12%] top-[61%] z-10 text-center font-serif text-[14px] italic leading-5 text-[#4a3d32]">
        One line. One record.
      </p>

      <img
        alt=""
        className="pointer-events-none absolute bottom-[-1%] left-1/2 z-10 w-[96%] -translate-x-1/2 select-none mix-blend-multiply drop-shadow-[0_18px_24px_rgba(45,29,16,0.22)]"
        draggable={false}
        loading="eager"
        src={ASSETS.cradle}
      />
    </div>
  );
}
