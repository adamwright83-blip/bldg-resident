import { useEffect, useMemo, useRef, useState } from "react";

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

const COMPOSITE_PATHS = {
  car_detail:
    "M40 145 C70 118 113 118 139 145 C158 165 189 166 210 145 C236 118 280 119 304 146 C322 166 352 164 367 145 C381 129 392 139 386 158 C374 199 307 202 286 164 C275 145 249 145 238 164 C216 203 147 203 126 164 C115 145 87 145 76 164 C64 184 36 176 40 145",
  dog_grooming:
    "M58 160 C83 116 139 117 153 160 C166 199 207 197 219 159 C232 120 282 118 304 150 C326 178 352 163 346 136 C337 94 266 95 253 137 C242 175 199 176 187 138 C174 94 101 94 90 137 C84 158 68 171 58 160",
  laundry_pickup:
    "M50 154 C82 116 132 113 158 146 C176 169 211 168 230 146 C256 116 306 116 334 148 C354 171 368 169 378 151 C362 198 302 207 271 169 C254 148 223 149 207 171 C179 207 117 199 101 160 C91 136 68 137 50 154",
  laundry_pickup_deadline:
    "M42 151 C78 111 132 114 158 145 C177 168 210 169 229 145 C253 115 303 115 332 146 C351 166 369 164 381 144 C389 166 376 191 349 196 C316 202 288 186 269 162 C253 143 224 143 208 165 C183 201 119 204 100 162 C88 134 61 137 42 151 M314 120 C336 105 361 111 369 130 C377 151 358 171 334 164 C312 157 300 136 314 120",
  multi_service_default:
    "M45 156 C75 114 129 112 158 147 C178 171 209 168 229 144 C255 113 307 115 334 148 C353 171 375 166 384 145 C384 190 326 207 289 170 C269 149 239 148 219 172 C188 207 125 205 104 161 C92 137 64 136 45 156 M98 121 C121 94 168 95 187 122 C206 149 247 150 268 123 C287 98 328 99 344 124",
  ride_airport:
    "M42 162 C75 128 126 128 157 160 C180 184 214 183 235 158 C258 130 304 129 334 157 C358 179 377 171 383 149 C386 192 325 204 293 169 C273 148 245 148 226 169 C195 204 131 203 105 166 C89 143 61 144 42 162",
};

export function getHeldCompositePath(
  displayRequest: string,
  services: HeldParsedService[] = []
) {
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
  const [penStyle, setPenStyle] = useState({
    left: "20%",
    top: "42%",
    transform: "translate(-45%, -88%) rotate(-18deg)",
  });
  const [isComplete, setIsComplete] = useState(false);
  const path = useMemo(
    () => getHeldCompositePath(displayRequest, services),
    [displayRequest, services]
  );
  const duration = useMemo(() => getDuration(services), [services]);

  useEffect(() => {
    const svgPath = pathRef.current;
    if (!svgPath) return undefined;

    const totalLength = svgPath.getTotalLength();
    svgPath.style.strokeDasharray = `${totalLength}`;
    svgPath.style.strokeDashoffset = `${totalLength}`;

    let startedAt = 0;
    let holdTimer: number | null = null;

    const tick = (time: number) => {
      if (!startedAt) startedAt = time;
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentLength = totalLength * eased;
      const point = svgPath.getPointAtLength(currentLength);
      const next = svgPath.getPointAtLength(Math.min(totalLength, currentLength + 3));
      const angle =
        (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;

      svgPath.style.strokeDashoffset = `${totalLength - currentLength}`;
      setPenStyle({
        left: `${(point.x / 430) * 100}%`,
        top: `${(point.y / 260) * 100}%`,
        transform: `translate(-45%, -88%) rotate(${(angle + 82).toFixed(2)}deg)`,
      });

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      setIsComplete(true);
      holdTimer = window.setTimeout(onDrawingComplete, 600);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
      }
    };
  }, [duration, onDrawingComplete, path]);

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

      <section className="absolute left-1/2 top-[17%] z-10 w-[66%] -translate-x-1/2">
        <div className="relative aspect-[0.78/1] w-full overflow-visible bg-[#f7ecd9]/88 shadow-[0_16px_24px_rgba(50,35,20,0.16)]">
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
          </svg>
          <img
            alt=""
            className="pointer-events-none absolute z-20 h-[58%] select-none drop-shadow-[0_14px_20px_rgba(35,24,12,0.24)] transition-[opacity] duration-500"
            draggable={false}
            src={ASSETS.pen}
            style={penStyle}
          />
        </div>
      </section>

      <p className="pointer-events-none absolute left-[12%] right-[12%] top-[62%] z-10 text-center font-serif text-[14px] italic leading-5 text-[#4a3d32]">
        One line. One record.
      </p>

      <img
        alt=""
        className="pointer-events-none absolute bottom-[-1%] left-1/2 z-10 w-[96%] -translate-x-1/2 select-none drop-shadow-[0_18px_24px_rgba(45,29,16,0.22)]"
        draggable={false}
        src={ASSETS.cradle}
      />
    </div>
  );
}
