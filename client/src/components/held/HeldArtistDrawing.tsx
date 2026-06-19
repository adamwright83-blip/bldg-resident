import { useLayoutEffect, useMemo, useRef, useState } from "react";

export type HeldParsedService = {
  type: string;
  timing?: string | null;
  deadline?: string | null;
  // Real order/coordination state used by post-order narration. Present only
  // when the plan/order actually carries it.
  orderId?: string | number | null;
  status?: string | null;
  dogName?: string | null;
  guestRelation?: string | null;
  providerCandidates?: Array<{ name: string; window?: string | null }> | null;
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
type HeldDrawing = { id: string; main: string; details?: string[] };

const COMPOSITE_PATHS: Record<string, HeldDrawing> = {
  // All glyphs below are generated from ONE approved master per subject
  // (continuous-line illustration standard, user-approved 2026-06-12) and
  // programmatically fitted into single-subject and woven layouts. To restyle
  // a subject, edit its master and regenerate — never hand-tweak the weaves.
  // CAR — sedan profile: hood→cabin→trunk in one travel, two wheel arcs.
  car_detail: {
    id: "car_detail",
    main: "M 105 162 C 132.5 157.4 160 155.9 181.4 154.3 C 192.1 137.5 213.5 128.4 236.4 126.8 C 260.8 125.3 280.7 133 291.4 148.2 C 306.7 149.8 320.4 152.8 323.5 160.5 C 325 166.6 318.9 169.6 312.8 169.6 M 312.8 169.6 C 311.3 157.4 292.9 157.4 291.4 169.6 C 286.8 172.7 176.8 172.7 172.2 169.6 M 172.2 169.6 C 170.7 157.4 152.4 157.4 150.8 169.6 C 144.7 171.2 132.5 171.2 126.4 168.1 C 120.3 165 115.7 163.5 105 162",
    details: [
      "M 201.3 154.3 C 207.4 140.6 224.2 134.5 239.4 134.5 C 254.7 134.5 266.9 139.1 273.1 148.2",
      "M 236.4 155.9 L 247.1 155.9",
    ],
  },
  // DOG — standing profile: ear, back, tail, legs, chest in one line.
  dog_grooming: {
    id: "dog_grooming",
    main: "M 105 130.8 C 110.2 117.8 120.6 109.9 131 109.9 C 133.6 102.1 141.4 99.5 146.7 104.7 C 149.3 109.9 144.1 115.2 138.8 116.5 C 172.7 109.9 218.3 104.7 253.4 109.9 C 276.8 112.6 293.8 120.4 299 133.4 C 309.4 125.6 318.5 115.2 322.4 104.7 C 325 115.2 319.8 130.8 309.4 141.2 C 306.8 159.4 302.9 178.9 300.3 198.5 L 291.2 198.5 C 293.8 180.2 295.1 167.2 293.8 156.8 C 276.8 159.4 237.8 162 211.7 159.4 C 210.4 175 209.1 188.1 207.8 198.5 L 198.7 198.5 C 200 182.8 200 169.8 198.7 159.4 C 185.7 154.2 172.7 149 164.9 141.2 C 149.3 141.2 133.6 138.6 120.6 138.6 C 112.8 137.3 106.3 134.7 105 130.8",
    details: [
      "M 123.2 121.7 C 124.5 120.4 125.8 120.4 127.1 121.7",
      "M 154.5 112.6 C 157.1 120.4 157.1 125.6 154.5 130.8",
    ],
  },
  // FOLDED SHIRT — collar V, shoulders, folded sleeves, hem; placket + crease accents.
  laundry_pickup: {
    id: "laundry_pickup",
    main: "M294 177 C311 151 345 143 377 140 C410 137 438 119 468 123 C495 128 518 147 548 157 C568 164 584 174 583 188 C581 203 561 207 536 207 C506 208 483 216 454 222 C422 229 393 226 366 214 C342 203 320 199 298 200 C279 201 266 196 267 186 C268 181 278 177 294 177 M280 214 C259 219 249 233 254 246 C260 261 281 266 303 267 C329 268 347 278 369 289 C392 301 411 301 432 291 C454 280 478 267 508 263 C535 260 555 247 556 234 C557 222 544 214 527 214 M269 267 C250 275 247 289 258 300 C272 313 296 314 320 314 C344 314 365 320 386 335 C411 354 428 360 447 348 C465 336 475 314 502 308 C525 302 542 292 542 281 C542 271 531 265 517 264 M223 305 C233 346 240 392 248 438 C254 472 276 491 312 498 C356 507 444 507 488 498 C524 491 546 472 552 438 C560 392 567 346 577 305 M223 305 C212 277 195 268 187 279 C178 291 191 316 224 333 M577 305 C588 277 605 268 613 279 C622 291 609 316 576 333",
    details: [
      "M337 203 C362 218 383 235 407 244 C430 253 451 248 470 238 C492 226 514 217 545 215",
      "M306 267 C329 276 344 294 367 302 C389 310 408 306 426 296 C451 282 473 270 506 264",
      "M493 219 C511 207 533 202 551 204 M490 275 C510 268 529 268 541 273",
    ],
  },
  // Deadline laundry uses the same approved shirt (the deadline is conveyed in copy).
  laundry_pickup_deadline: {
    id: "laundry_pickup_deadline",
    main: "M294 177 C311 151 345 143 377 140 C410 137 438 119 468 123 C495 128 518 147 548 157 C568 164 584 174 583 188 C581 203 561 207 536 207 C506 208 483 216 454 222 C422 229 393 226 366 214 C342 203 320 199 298 200 C279 201 266 196 267 186 C268 181 278 177 294 177 M280 214 C259 219 249 233 254 246 C260 261 281 266 303 267 C329 268 347 278 369 289 C392 301 411 301 432 291 C454 280 478 267 508 263 C535 260 555 247 556 234 C557 222 544 214 527 214 M269 267 C250 275 247 289 258 300 C272 313 296 314 320 314 C344 314 365 320 386 335 C411 354 428 360 447 348 C465 336 475 314 502 308 C525 302 542 292 542 281 C542 271 531 265 517 264 M223 305 C233 346 240 392 248 438 C254 472 276 491 312 498 C356 507 444 507 488 498 C524 491 546 472 552 438 C560 392 567 346 577 305 M223 305 C212 277 195 268 187 279 C178 291 191 316 224 333 M577 305 C588 277 605 268 613 279 C622 291 609 316 576 333",
    details: [
      "M337 203 C362 218 383 235 407 244 C430 253 451 248 470 238 C492 226 514 217 545 215",
      "M306 267 C329 276 344 294 367 302 C389 310 408 306 426 296 C451 282 473 270 506 264",
      "M493 219 C511 207 533 202 551 204 M490 275 C510 268 529 268 541 273",
    ],
  },
  // SCISSORS — two crossing blades with finger rings; pivot screw accent.
  haircut: {
    id: "haircut",
    main: "M 300.3 108.8 L 217.9 152.8 C 193 166.3 162.3 179.7 150.8 183.5 C 137.4 188.3 129.7 198.8 135.5 208.4 C 141.2 218 154.6 218 162.3 210.3 C 170 202.7 168 191.2 158.5 187.3 M 300.3 189.3 L 217.9 145.2 C 193 131.8 162.3 118.3 150.8 114.5 C 137.4 109.7 129.7 99.2 135.5 89.6 C 141.2 80 154.6 80 162.3 87.7 C 170 95.3 168 106.8 158.5 110.7",
    details: [
      "M 214 149 C 216 147.1 219.8 147.1 221.7 149",
    ],
  },
  // MULTI / BUNDLE — a loose continuous knot suggesting several things gathered.
  multi_service_default: {
    id: "multi_service_default",
    main: "M84 132 C130 96 200 100 232 134 C262 166 232 206 190 200 C150 194 144 156 178 146 C214 135 252 158 274 126 C294 96 344 104 354 144 C360 174 332 202 300 190",
  },
  // WOVEN — shirt upper-left, dog upper-right, car along the bottom.
  woven_shirt_dog_car: {
    id: "woven_shirt_dog_car",
    main: "M 107.9 55.6 C 114.9 64.8 129 68.3 136 69.7 C 143 68.3 157.1 64.8 164.1 55.6 C 173.2 57 181.7 59.1 188 62.6 C 185.2 76.7 181 87.9 174.6 95 C 169.7 91.5 166.2 89.4 162 87.9 L 163.4 117.5 C 163.4 121 161.3 122.4 157.8 122.4 L 114.2 122.4 C 110.7 122.4 108.6 121 108.6 117.5 L 110 87.9 C 105.8 89.4 102.3 91.5 97.4 95 C 91 87.9 86.8 76.7 84 62.6 C 90.3 59.1 98.8 57 107.9 55.6 M 206 77.2 C 209.6 68.1 216.9 62.7 224.2 62.7 C 226 57.2 231.5 55.4 235.2 59 C 237 62.7 233.3 66.3 229.7 67.2 C 253.4 62.7 285.3 59 309.9 62.7 C 326.3 64.5 338.1 70 341.8 79.1 C 349.1 73.6 355.4 66.3 358.2 59 C 360 66.3 356.4 77.2 349.1 84.5 C 347.2 97.3 344.5 111 342.7 124.6 L 336.3 124.6 C 338.1 111.9 339 102.8 338.1 95.5 C 326.3 97.3 298.9 99.1 280.7 97.3 C 279.8 108.2 278.9 117.3 278 124.6 L 271.6 124.6 C 272.5 113.7 272.5 104.6 271.6 97.3 C 262.5 93.6 253.4 90 247.9 84.5 C 237 84.5 226 82.7 216.9 82.7 C 211.5 81.8 206.9 80 206 77.2 M 100 216.8 C 127 212.3 154 210.8 175 209.3 C 185.5 192.8 206.5 183.8 229 182.3 C 253 180.8 272.5 188.3 283 203.3 C 298 204.8 311.5 207.8 314.5 215.3 C 316 221.3 310 224.3 304 224.3 M 304 224.3 C 302.5 212.3 284.5 212.3 283 224.3 C 278.5 227.3 170.5 227.3 166 224.3 M 166 224.3 C 164.5 212.3 146.5 212.3 145 224.3 C 139 225.8 127 225.8 121 222.8 C 115 219.8 110.5 218.3 100 216.8",
  },
  // WOVEN — shirt + dog only (no car unless a car service was requested).
  woven_shirt_dog: {
    id: "woven_shirt_dog",
    main: "M 107.9 82.6 C 114.9 91.8 129 95.3 136 96.7 C 143 95.3 157.1 91.8 164.1 82.6 C 173.2 84 181.7 86.1 188 89.6 C 185.2 103.7 181 114.9 174.6 122 C 169.7 118.5 166.2 116.4 162 114.9 L 163.4 144.5 C 163.4 148 161.3 149.4 157.8 149.4 L 114.2 149.4 C 110.7 149.4 108.6 148 108.6 144.5 L 110 114.9 C 105.8 116.4 102.3 118.5 97.4 122 C 91 114.9 86.8 103.7 84 89.6 C 90.3 86.1 98.8 84 107.9 82.6 M 202 109.9 C 205.7 100.6 213.2 95 220.7 95 C 222.6 89.3 228.2 87.5 231.9 91.2 C 233.8 95 230 98.7 226.3 99.6 C 250.6 95 283.3 91.2 308.6 95 C 325.4 96.8 337.6 102.4 341.3 111.8 C 348.8 106.2 355.3 98.7 358.1 91.2 C 360 98.7 356.3 109.9 348.8 117.4 C 346.9 130.5 344.1 144.5 342.2 158.5 L 335.7 158.5 C 337.6 145.4 338.5 136.1 337.6 128.6 C 325.4 130.5 297.4 132.3 278.7 130.5 C 277.7 141.7 276.8 151 275.9 158.5 L 269.3 158.5 C 270.2 147.3 270.2 138 269.3 130.5 C 260 126.7 250.6 123 245 117.4 C 233.8 117.4 222.6 115.5 213.2 115.5 C 207.6 114.6 202.9 112.7 202 109.9",
  },
  // WOVEN — dog upper, car lower.
  woven_dog_car: {
    id: "woven_dog_car",
    main: "M 118 85.9 C 122.6 74.4 131.8 67.6 141 67.6 C 143.3 60.7 150.1 58.4 154.7 63 C 157 67.6 152.4 72.2 147.8 73.3 C 177.7 67.6 217.9 63 248.9 67.6 C 269.5 69.9 284.4 76.7 289 88.2 C 298.2 81.3 306.3 72.2 309.7 63 C 312 72.2 307.4 85.9 298.2 95.1 C 295.9 111.2 292.5 128.4 290.2 145.6 L 282.2 145.6 C 284.4 129.6 285.6 118.1 284.4 108.9 C 269.5 111.2 235.1 113.5 212.1 111.2 C 211 125 209.8 136.4 208.7 145.6 L 200.7 145.6 C 201.8 131.8 201.8 120.4 200.7 111.2 C 189.2 106.6 177.7 102 170.8 95.1 C 157 95.1 143.3 92.8 131.8 92.8 C 124.9 91.7 119.1 89.4 118 85.9 M 96 224.2 C 124 219.6 152 218 173.8 216.4 C 184.7 199.3 206.4 190 229.8 188.4 C 254.7 186.9 274.9 194.7 285.8 210.2 C 301.3 211.8 315.3 214.9 318.4 222.7 C 320 228.9 313.8 232 307.6 232 M 307.6 232 C 306 219.6 287.3 219.6 285.8 232 C 281.1 235.1 169.1 235.1 164.4 232 M 164.4 232 C 162.9 219.6 144.2 219.6 142.7 232 C 136.4 233.6 124 233.6 117.8 230.4 C 111.6 227.3 106.9 225.8 96 224.2",
  },
  // TOWN CAR pickup — the same sedan at travel scale with a departing-flight mark.
  ride_airport: {
    id: "ride_airport",
    main: "M 115 171.8 C 140 167.6 165 166.3 184.4 164.9 C 194.2 149.6 213.6 141.3 234.4 139.9 C 256.7 138.5 274.7 145.4 284.4 159.3 C 298.3 160.7 310.8 163.5 313.6 170.4 C 315 176 309.4 178.8 303.9 178.8 M 303.9 178.8 C 302.5 167.6 285.8 167.6 284.4 178.8 C 280.3 181.5 180.3 181.5 176.1 178.8 M 176.1 178.8 C 174.7 167.6 158.1 167.6 156.7 178.8 C 151.1 180.1 140 180.1 134.4 177.4 C 128.9 174.6 124.7 173.2 115 171.8",
    details: [
      "M 202.5 164.9 C 208.1 152.4 223.3 146.8 237.2 146.8 C 251.1 146.8 262.2 151 267.8 159.3",
      "M 234.4 166.3 L 244.2 166.3",
      "M 128 80.4 L 200 65.2 M 177.3 57.6 L 200 65.2 L 181.1 80.4",
    ],
  },
};
export function getHeldCompositePath(
  displayRequest: string,
  services: HeldParsedService[] = []
): HeldDrawing {
  const serviceTypes = services.map(service => service.type).join(" ");
  const haystack = `${displayRequest} ${serviceTypes}`.toLowerCase();

  // MULTI-SUBJECT: when the request spans several services, draw a woven sketch
  // that holds each subject on the one card — not just the first match. This
  // matches the vision board's composed portrait. We detect distinct subjects
  // from the haystack and pick the closest pre-composed weave.
  const hasLaundry = /laundry|shirt|fold|dry\s*clean/.test(haystack);
  const hasDog = /dog|groom|pet/.test(haystack);
  const hasCar = /car|detail|wash/.test(haystack);
  const hasRide = /airport|ride|uber|waymo|lax/.test(haystack);
  const subjectCount = [hasLaundry, hasDog, hasCar, hasRide].filter(Boolean).length;

  if (subjectCount >= 2) {
    // Prefer the richest available weave for the detected subjects. Do not use
    // car-containing drawings unless a car service was actually requested.
    if (hasLaundry && hasDog && hasCar) {
      return COMPOSITE_PATHS.woven_shirt_dog_car;
    }
    if (hasLaundry && hasDog) {
      return COMPOSITE_PATHS.woven_shirt_dog;
    }
    if (hasDog && hasCar) {
      return COMPOSITE_PATHS.woven_dog_car;
    }
    if (hasLaundry && hasCar) {
      return COMPOSITE_PATHS.woven_shirt_dog_car;
    }
    return COMPOSITE_PATHS.multi_service_default;
  }

  if (/laundry/.test(haystack) && /deadline|friday|returned?|before|by\s+\w+/.test(haystack)) {
    return COMPOSITE_PATHS.laundry_pickup_deadline;
  }

  if (/laundry/.test(haystack)) return COMPOSITE_PATHS.laundry_pickup;
  if (/dog|groom/.test(haystack)) return COMPOSITE_PATHS.dog_grooming;
  if (/haircut|barber|trim/.test(haystack)) return COMPOSITE_PATHS.haircut;
  if (/airport|ride|uber|waymo|lax/.test(haystack)) return COMPOSITE_PATHS.ride_airport;
  if (/car|detail|wash/.test(haystack)) return COMPOSITE_PATHS.car_detail;

  return COMPOSITE_PATHS.multi_service_default;
}

function getDuration(services: HeldParsedService[] = []) {
  if (services.length <= 1) return 1800;
  if (services.length === 2) return 2400;
  return 3200;
}

// Every visible mark belongs to the nib route. Keeping detail paths separate
// made the laundry drawing read as two large animated shapes followed by lines
// that simply appeared. Joining the authored paths preserves their order while
// letting the existing stroke/hop timeline physically draw each one.
export function getPenTracePath(drawing: HeldDrawing) {
  return [drawing.main, ...(drawing.details ?? [])].join(" ");
}

export function getPenTraceSegments(drawing: HeldDrawing) {
  return getPenTracePath(drawing).split(/(?=M)/).map(segment => segment.trim()).filter(Boolean);
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
    transform: "translate(-50%, -92%) rotate(8deg)",
    transition: `left ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  });
  const [hasEntered, setHasEntered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const drawing = useMemo(
    () => getHeldCompositePath(displayRequest, services),
    [displayRequest, services]
  );
  const path = useMemo(() => getPenTracePath(drawing), [drawing]);
  const traceSegments = useMemo(() => getPenTraceSegments(drawing), [drawing]);
  const isLaundryDrawing = drawing.id === "laundry_pickup" || drawing.id === "laundry_pickup_deadline";
  const canvasX = isLaundryDrawing ? 150 : 0;
  const canvasY = isLaundryDrawing ? 100 : 0;
  const canvasWidth = isLaundryDrawing ? 500 : 430;
  const canvasHeight = isLaundryDrawing ? 430 : 260;
  // Laundry has several long sculptural passes. Giving it a real five-second
  // ink budget keeps the basket from materializing ahead of the nib.
  const duration = useMemo(
    () => (isLaundryDrawing ? 5200 : getDuration(services)),
    [isLaundryDrawing, services],
  );
  onDrawingCompleteRef.current = onDrawingComplete;

  useLayoutEffect(() => {
    const svgPath = pathRef.current;
    if (!svgPath) return undefined;
    const visiblePaths = Array.from(
      svgPath.parentElement?.querySelectorAll<SVGPathElement>("[data-held-trace-stroke]") ?? [],
    );

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

      visiblePaths.forEach(visiblePath => {
        visiblePath.style.strokeDashoffset = "0";
      });
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

    visiblePaths.forEach(visiblePath => {
      const length = visiblePath.getTotalLength();
      visiblePath.style.strokeDasharray = `${length}`;
      visiblePath.style.strokeDashoffset = `${length}`;
    });

    // ── Stroke map ─────────────────────────────────────────────────────────
    // A one-line drawing is still made of a few distinct strokes (each `M`
    // starts one). The nib must draw stroke by stroke and physically LIFT
    // between them — getPointAtLength alone teleports across M-gaps, which is
    // exactly what made the pen look possessed. We measure each subpath with a
    // detached path element to find the cumulative length boundaries.
    type Stroke = { from: number; to: number; index: number };
    const strokes: Stroke[] = [];
    try {
      const segments = path.split(/(?=M)/).map(s => s.trim()).filter(Boolean);
      const ns = "http://www.w3.org/2000/svg";
      let cursor = 0;
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const probe = document.createElementNS(ns, "path");
        probe.setAttribute("d", segment);
        const segmentLength = probe.getTotalLength();
        if (Number.isFinite(segmentLength) && segmentLength > 1) {
          strokes.push({ from: cursor, to: cursor + segmentLength, index });
        }
        cursor += segmentLength;
      }
    } catch {
      // Measurement is an enhancement — fall back to one continuous stroke.
    }
    if (strokes.length === 0) {
      strokes.push({ from: 0, to: totalLength, index: 0 });
    }

    // ── Pen hand model ─────────────────────────────────────────────────────
    // A hand holds a pen at a near-constant tilt; the tangent only *sways* it.
    // Fold the tangent so leftward travel doesn't flip the pen, damp it well
    // below 1:1, and smooth between frames. Rotation pivots at the NIB
    // (transform-origin 30% 86%) so the tip stays glued to the line while the
    // barrel sways above it.
    const BASE_TILT = 58;
    const SWAY = 0.22;
    const foldTangent = (deg: number) => {
      let a = ((deg % 360) + 360) % 360;
      if (a > 90 && a < 270) a -= 180;
      if (a >= 270) a -= 360;
      return a;
    };
    let smoothedTilt = BASE_TILT;
    let tiltInitialized = false;
    const penPoseAt = (
      length: number,
      strokeFrom = 0,
      strokeTo = totalLength,
    ): { x: number; y: number; tilt: number } => {
      const point = svgPath.getPointAtLength(length);
      // Tangent samples stay clamped INSIDE the active stroke — crossing an
      // M-boundary would aim the pen at the next subpath for a frame.
      const ahead = svgPath.getPointAtLength(Math.min(strokeTo, length + 2.5));
      const behind = svgPath.getPointAtLength(Math.max(strokeFrom, length - 2.5));
      const tangent =
        (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
      const target = BASE_TILT + foldTangent(tangent) * SWAY;
      if (!tiltInitialized) {
        smoothedTilt = target;
        tiltInitialized = true;
      } else {
        smoothedTilt += (target - smoothedTilt) * 0.16;
      }
      return { x: point.x, y: point.y, tilt: smoothedTilt };
    };
    const applyPen = (
      pose: { x: number; y: number; tilt: number },
      lifted: boolean,
    ) => {
      setPenStyle({
        left: `${((pose.x - canvasX) / canvasWidth) * 100}%`,
        top: `${((pose.y - canvasY) / canvasHeight) * 100}%`,
        transform: `translate(-50%, -92%) rotate(${pose.tilt.toFixed(2)}deg)${
          lifted ? " translateY(-7px) scale(1.03)" : ""
        }`,
        transition: "none",
      });
    };

    // ── Timeline ───────────────────────────────────────────────────────────
    // `duration` is the ink-down budget, split across strokes by length; each
    // stroke eases in and out (touch-down, confidence, lift-off). Pen-up hops
    // ADD to the timeline — stealing them from ink time would make complex
    // weaves sprint, and the line must stay unhurried.
    const HOP_MS = 240;
    const drawBudget = duration;
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeHop = (t: number) => 1 - Math.pow(1 - t, 3);

    type Beat =
      | { kind: "draw"; from: number; to: number; index: number; ms: number }
      | { kind: "hop"; from: number; to: number; ms: number };
    const beats: Beat[] = [];
    strokes.forEach((stroke, index) => {
      const share = (stroke.to - stroke.from) / totalLength;
      beats.push({
        kind: "draw",
        from: stroke.from,
        to: stroke.to,
        index: stroke.index,
        ms: Math.max(220, drawBudget * share),
      });
      const nextStroke = strokes[index + 1];
      if (nextStroke) {
        // Only a REAL spatial gap earns a pen lift. Many M commands in these
        // paths restart exactly where the line ended (authoring artifacts) —
        // hopping there would stutter a line that should flow continuously.
        let gap = 0;
        try {
          const endPoint = svgPath.getPointAtLength(Math.max(0, stroke.to - 0.2));
          const nextPoint = svgPath.getPointAtLength(
            Math.min(totalLength, nextStroke.from + 0.2),
          );
          gap = Math.hypot(nextPoint.x - endPoint.x, nextPoint.y - endPoint.y);
        } catch {
          gap = 0;
        }
        if (gap > 7) {
          beats.push({ kind: "hop", from: stroke.to, to: nextStroke.from, ms: HOP_MS });
        }
      }
    });

    const startPose = penPoseAt(
      strokes[0].from + 0.15,
      strokes[0].from,
      strokes[0].to,
    );

    // Phase 1 (ceremonial): glide the pen from its off-canvas entry pose down to
    // the first stroke point. The CSS transition (set in initial penStyle) does
    // the easing. No line is drawn yet — dashoffset is still full length.
    setPenStyle({
      left: `${((startPose.x - canvasX) / canvasWidth) * 100}%`,
      top: `${((startPose.y - canvasY) / canvasHeight) * 100}%`,
      transform: `translate(-50%, -92%) rotate(${startPose.tilt.toFixed(2)}deg)`,
      transition: `left ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${APPROACH_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    });
    setHasEntered(true);

    let beatIndex = 0;
    let beatStartedAt = 0;
    const tick = (time: number) => {
      if (completedRef.current) return;
      hasAnimatedFrame = true;
      if (startWatchTimer !== null) {
        window.clearTimeout(startWatchTimer);
        startWatchTimer = null;
      }
      const beat = beats[beatIndex];
      if (!beat) {
        completeDrawing("complete");
        return;
      }
      if (!beatStartedAt) beatStartedAt = time;
      const progress = Math.min(1, (time - beatStartedAt) / beat.ms);

      try {
        if (beat.kind === "draw") {
          const eased = easeInOut(progress);
          const currentLength = beat.from + (beat.to - beat.from) * eased;
          // Ink exists ONLY where the nib has passed: one shared progress
          // value drives both the reveal and the pen pose. The pose sample is
          // clamped just inside this stroke — at the exact boundary length the
          // SVG API returns the PREVIOUS subpath's endpoint, which would snap
          // the pen back for one frame right after each hop.
          const activeVisiblePath = visiblePaths[beat.index];
          if (activeVisiblePath) {
            const strokeLength = beat.to - beat.from;
            const localLength = currentLength - beat.from;
            activeVisiblePath.style.strokeDashoffset = `${Math.max(0, strokeLength - localLength)}`;
          }
          applyPen(
            penPoseAt(
              Math.max(currentLength, beat.from + 0.15),
              beat.from,
              beat.to,
            ),
            false,
          );
        } else {
          // Pen-up: ink frozen at the stroke end; the pen travels a raised
          // line to the next stroke's start and touches down.
          const eased = easeHop(progress);
          const fromPoint = svgPath.getPointAtLength(beat.from);
          const toPoint = svgPath.getPointAtLength(
            Math.min(totalLength, beat.to + 0.1),
          );
          const x = fromPoint.x + (toPoint.x - fromPoint.x) * eased;
          const y = fromPoint.y + (toPoint.y - fromPoint.y) * eased;
          const lift = Math.sin(progress * Math.PI);
          applyPen({ x, y, tilt: smoothedTilt }, lift > 0.2);
        }
      } catch (error) {
        console.warn("[HELD][Drawing] path point unavailable", error);
        completeDrawing("fallback");
        return;
      }

      if (progress >= 1) {
        beatIndex += 1;
        beatStartedAt = 0;
        if (beatIndex >= beats.length) {
          completeDrawing("complete");
          return;
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    // Phase 2 (after the pen lands): begin tracing the line. Watchdogs are armed
    // here so the approach time isn't counted against the "did it start" check.
    const totalTimelineMs = beats.reduce((sum, beat) => sum + beat.ms, 0);
    approachTimer = window.setTimeout(() => {
      if (completedRef.current) return;
      startWatchTimer = window.setTimeout(() => {
        if (!hasAnimatedFrame) {
          completeDrawing("fallback");
        }
      }, 500);
      fallbackTimer = window.setTimeout(() => {
        completeDrawing("fallback");
      }, totalTimelineMs + 900);
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
  }, [canvasHeight, canvasWidth, canvasX, canvasY, duration, path]);

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
        className="absolute left-[14%] right-[14%] top-[15%] z-10 transition-[opacity,transform] duration-[560ms]"
        style={{
          opacity: hasEntered ? 1 : 0,
          transform: hasEntered
            ? "translate(0, 0)"
            : "translate(0, 14px) scale(0.97)",
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
            viewBox={`${canvasX} ${canvasY} ${canvasWidth} ${canvasHeight}`}
          >
            <path
              ref={pathRef}
              d={path}
              fill="none"
              opacity="0"
              stroke="transparent"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            {traceSegments.map((segment, index) => (
              <path
                data-held-trace-stroke={index}
                d={segment}
                fill="none"
                key={`${drawing.id}-${index}`}
                opacity="0.92"
                stroke="#1A1A1A"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            ))}
          </svg>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-20 h-[78%] w-[68px] overflow-hidden drop-shadow-[0_14px_20px_rgba(35,24,12,0.24)] transition-[opacity] duration-500"
            data-held-drawing-pen="true"
            style={penStyle}
          >
            <img
              alt=""
              className="absolute left-1/2 top-[-3%] h-[106%] w-auto max-w-none -translate-x-1/2 select-none"
              decoding="sync"
              draggable={false}
              loading="eager"
              src={ASSETS.pen}
            />
          </div>
          <p className="pointer-events-none absolute bottom-[8%] right-[12%] z-10 font-serif text-[18px] italic text-[#2a2520]/75">
            Held.
          </p>
        </div>
      </section>

      <p className="pointer-events-none absolute left-[12%] right-[12%] top-[61%] z-10 text-center font-serif text-[14px] italic leading-5 text-[#4a3d32]">
        Few things understood. Held has got them.
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
