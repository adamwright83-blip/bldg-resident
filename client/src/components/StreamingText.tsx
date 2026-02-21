import { useState, useEffect, useRef, useMemo } from "react";
import { Streamdown } from "streamdown";

interface StreamingTextProps {
  content: string;
  onComplete?: () => void;
}

/**
 * StreamingText — Visual character-by-character reveal for AI responses
 *
 * Phase 1.8 Tempo Shift:
 *   - Morning (6-12): crisp cadence, ~5ms/char
 *   - Afternoon (12-18): standard cadence, ~7ms/char
 *   - Evening (18-22): measured cadence, ~9ms/char
 *   - Night (22-6): deliberate cadence, ~12ms/char
 *   - 500ms pause before the final line (Phantom Thread / Depth Charge moment)
 *
 * - Receives full response text (no backend streaming required)
 * - Shows blinking cursor during reveal (~530ms blink)
 * - Respects prefers-reduced-motion (renders instantly if set)
 * - Stops immediately if component unmounts
 */
export function StreamingText({ content, onComplete }: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const charsRevealedRef = useRef<number>(0);
  const pauseAppliedRef = useRef<boolean>(false);
  const pauseStartRef = useRef<number>(0);

  // Tempo Shift: cadence based on time of day
  const msPerChar = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 5;   // Morning: crisp
    if (hour >= 12 && hour < 18) return 7;  // Afternoon: standard
    if (hour >= 18 && hour < 22) return 9;  // Evening: measured
    return 12;                               // Night: deliberate
  }, []);

  // Find the last line break for the 500ms pause point
  const pauseIndex = useMemo(() => {
    // Only pause if content has multiple lines (Phantom Thread / Depth Charge)
    const lastNewline = content.lastIndexOf("\n");
    if (lastNewline <= 0 || lastNewline >= content.length - 2) return -1;
    // Only pause if the final line is short (< 80 chars) — likely an observation line
    const finalLine = content.slice(lastNewline + 1).trim();
    if (finalLine.length > 80 || finalLine.length < 5) return -1;
    return lastNewline;
  }, [content]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || content.length === 0) {
      setDisplayedContent(content);
      setIsStreaming(false);
      onComplete?.();
      return;
    }

    // Reset refs for new content
    startTimeRef.current = 0;
    charsRevealedRef.current = 0;
    pauseAppliedRef.current = false;
    pauseStartRef.current = 0;

    const PAUSE_DURATION = 500; // 500ms pause before final line

    const reveal = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      // Check if we're in a pause
      if (pauseStartRef.current > 0) {
        if (timestamp - pauseStartRef.current < PAUSE_DURATION) {
          animationFrameRef.current = requestAnimationFrame(reveal);
          return;
        }
        // Pause complete — adjust start time to account for pause
        startTimeRef.current += PAUSE_DURATION;
        pauseStartRef.current = 0;
      }

      const elapsed = timestamp - startTimeRef.current;
      const targetChars = Math.floor(elapsed / msPerChar);
      const charsToReveal = Math.min(targetChars, content.length);

      // Check if we should pause before the final line
      if (
        pauseIndex > 0 &&
        !pauseAppliedRef.current &&
        charsToReveal >= pauseIndex
      ) {
        pauseAppliedRef.current = true;
        pauseStartRef.current = timestamp;
        // Show content up to the pause point
        charsRevealedRef.current = pauseIndex;
        setDisplayedContent(content.slice(0, pauseIndex));
        animationFrameRef.current = requestAnimationFrame(reveal);
        return;
      }

      if (charsToReveal > charsRevealedRef.current) {
        charsRevealedRef.current = charsToReveal;
        setDisplayedContent(content.slice(0, charsToReveal));
      }

      if (charsToReveal < content.length) {
        animationFrameRef.current = requestAnimationFrame(reveal);
      } else {
        setIsStreaming(false);
        onComplete?.();
      }
    };

    animationFrameRef.current = requestAnimationFrame(reveal);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [content, onComplete, msPerChar, pauseIndex]);

  return (
    <div className="streaming-text">
      <Streamdown>{displayedContent}</Streamdown>
      {isStreaming && <span className="streaming-cursor" />}
    </div>
  );
}
