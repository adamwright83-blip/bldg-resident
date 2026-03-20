/**
 * LivingBuilding — Animated window grid logo for BLDG.chat
 *
 * Design: 5×5 grid of apartment windows on a near-black background.
 * Animation: Windows light up floor by floor, bottom-to-top (power-on sequence).
 * After power-on, 3 random windows gently pulse in an idle loop.
 *
 * Props:
 *   size       — pixel size of the square (default 120)
 *   autoPlay   — start the power-on sequence immediately (default true)
 *   onComplete — called when the power-on sequence finishes
 *   idle       — skip power-on, go straight to idle pulse (for inline logo use)
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Window grid layout ──────────────────────────────────────────────────────
// 5 columns × 5 rows = 25 windows
// "lit" windows in the icon: scattered organically, not uniform
const GRID_COLS = 5;
const GRID_ROWS = 5;

// Which windows are "home" (lit in idle state) — 0-indexed, row-major
const HOME_WINDOWS = new Set([1, 5, 8, 12, 16, 19, 22]);

// Idle pulse windows (subset of HOME_WINDOWS that gently breathe)
const PULSE_WINDOWS = [1, 12, 22];

// ─── Timing ──────────────────────────────────────────────────────────────────
const FLOOR_DELAY   = 0.18; // seconds between each floor lighting up
const WINDOW_STAGGER = 0.06; // seconds between windows within a floor
const TOTAL_DURATION = GRID_ROWS * FLOOR_DELAY + 0.4; // ~1.3s

// Rows light up bottom-to-top: row 4 first, row 0 last
function getWindowDelay(row: number, col: number): number {
  const floorIndex = GRID_ROWS - 1 - row; // 0 = bottom floor
  return floorIndex * FLOOR_DELAY + col * WINDOW_STAGGER;
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg:          "#12100E",
  windowDark:  "#1C1A18",
  windowFrame: "#2A2825",
  windowLit:   "#C9A84C",
  windowGlow:  "rgba(201,168,76,0.35)",
  windowWarm:  "#E8C97A",
};

// ─── Component ───────────────────────────────────────────────────────────────
interface LivingBuildingProps {
  size?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
  idle?: boolean;
  className?: string;
}

export default function LivingBuilding({
  size = 120,
  autoPlay = true,
  onComplete,
  idle = false,
  className = "",
}: LivingBuildingProps) {
  const [phase, setPhase] = useState<"off" | "powering" | "idle">(
    idle ? "idle" : "off"
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (idle) { setPhase("idle"); return; }
    if (!autoPlay) return;

    // Small delay before starting so the tile fade-out completes first
    timerRef.current = setTimeout(() => {
      setPhase("powering");
      // After all windows have lit, transition to idle
      timerRef.current = setTimeout(() => {
        setPhase("idle");
        onComplete?.();
      }, (TOTAL_DURATION + 0.3) * 1000);
    }, 80);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoPlay, idle, onComplete]);

  // Padding inside the square
  const pad = size * 0.1;
  const innerSize = size - pad * 2;
  const gap = size * 0.025;
  const windowW = (innerSize - gap * (GRID_COLS - 1)) / GRID_COLS;
  const windowH = (innerSize - gap * (GRID_ROWS - 1)) / GRID_ROWS;
  const radius = windowW * 0.12;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Background */}
      <rect width={size} height={size} rx={size * 0.22} fill={C.bg} />

      {/* Window grid */}
      {Array.from({ length: GRID_ROWS }).map((_, row) =>
        Array.from({ length: GRID_COLS }).map((_, col) => {
          const idx = row * GRID_COLS + col;
          const isHome = HOME_WINDOWS.has(idx);
          const isPulse = PULSE_WINDOWS.includes(idx);
          const delay = getWindowDelay(row, col);

          const x = pad + col * (windowW + gap);
          const y = pad + row * (windowH + gap);

          // Determine lit state
          const lit =
            phase === "idle"
              ? isHome
              : phase === "powering"
              ? isHome
              : false;

          return (
            <g key={idx}>
              {/* Glow bloom (only when lit) */}
              {lit && (
                <motion.rect
                  x={x - windowW * 0.3}
                  y={y - windowH * 0.3}
                  width={windowW * 1.6}
                  height={windowH * 1.6}
                  rx={radius * 2}
                  fill={C.windowGlow}
                  initial={{ opacity: 0 }}
                  animate={
                    phase === "idle" && isPulse
                      ? { opacity: [0.5, 0.9, 0.5], transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: idx * 0.4 } }
                      : { opacity: 0.7, transition: { delay, duration: 0.25 } }
                  }
                />
              )}

              {/* Window frame */}
              <rect
                x={x}
                y={y}
                width={windowW}
                height={windowH}
                rx={radius}
                fill={C.windowFrame}
              />

              {/* Window fill — animates from dark to lit */}
              <motion.rect
                x={x + 1}
                y={y + 1}
                width={windowW - 2}
                height={windowH - 2}
                rx={radius * 0.8}
                initial={{ fill: C.windowDark }}
                animate={
                  phase === "off"
                    ? { fill: C.windowDark }
                    : phase === "powering" && isHome
                    ? {
                        fill: [C.windowDark, C.windowWarm, C.windowLit],
                        transition: { delay, duration: 0.35, ease: "easeOut" },
                      }
                    : phase === "idle" && isHome
                    ? isPulse
                      ? {
                          fill: [C.windowLit, C.windowWarm, C.windowLit],
                          transition: {
                            duration: 2.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: idx * 0.4,
                          },
                        }
                      : { fill: C.windowLit }
                    : { fill: C.windowDark }
                }
              />

              {/* Window divider lines (cross) — subtle architectural detail */}
              <line
                x1={x + windowW / 2}
                y1={y + 2}
                x2={x + windowW / 2}
                y2={y + windowH - 2}
                stroke={C.windowFrame}
                strokeWidth={0.8}
                opacity={0.6}
              />
              <line
                x1={x + 2}
                y1={y + windowH / 2}
                x2={x + windowW - 2}
                y2={y + windowH / 2}
                stroke={C.windowFrame}
                strokeWidth={0.8}
                opacity={0.6}
              />
            </g>
          );
        })
      )}
    </svg>
  );
}

// ─── Full-screen transition overlay ─────────────────────────────────────────
// Used between tile tap and chat thread reveal
export function LivingBuildingTransition({
  onComplete,
}: {
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#12100E",
        zIndex: 50,
        gap: 20,
      }}
    >
      <LivingBuilding
        size={140}
        autoPlay
        onComplete={onComplete}
      />
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{
          color: "#C9A84C",
          fontSize: 12,
          letterSpacing: "0.12em",
          fontFamily: "inherit",
          textTransform: "uppercase",
        }}
      >
        Connecting you to your building…
      </motion.p>
    </motion.div>
  );
}
