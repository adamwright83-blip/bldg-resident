import { useState, useRef, useEffect, useCallback } from "react";

interface OTPScreenProps {
  maskedPhone: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  isVerifying: boolean;
  error: string;
}

const RESEND_COOLDOWN_S = 30;

export default function OTPScreen({
  maskedPhone,
  onVerify,
  onResend,
  isVerifying,
  error,
}: OTPScreenProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_S);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      const next = [...digits];
      next[index] = digit;
      setDigits(next);

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 filled
      if (digit && index === 5) {
        const code = next.join("");
        if (code.length === 6) {
          onVerify(code);
        }
      } else if (digit) {
        const code = next.join("");
        if (code.length === 6) {
          onVerify(code);
        }
      }
    },
    [digits, onVerify]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted.length === 6) {
        e.preventDefault();
        const next = pasted.split("");
        setDigits(next);
        onVerify(pasted);
      }
    },
    [onVerify]
  );

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
      setResendTimer(RESEND_COOLDOWN_S);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF7F2",
        padding: "0 32px",
      }}
    >
      {/* Headline */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "#2C2824",
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        Enter your code.
      </h1>

      {/* Subhead */}
      <p style={{ fontSize: 14, color: "#8A7D6B", marginBottom: 32 }}>
        Sent to {maskedPhone}
      </p>

      {/* 6-digit input */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
        onPaste={handlePaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isVerifying}
            style={{
              width: 44,
              height: 52,
              borderRadius: 10,
              border: error ? "1.5px solid #C25B4A" : "1px solid #E0D9CE",
              background: "#FFFFFF",
              fontSize: 22,
              fontWeight: 600,
              textAlign: "center" as const,
              color: "#2C2824",
              fontFamily: "inherit",
              outline: "none",
              caretColor: "#C9A96E",
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 13, color: "#C25B4A", marginBottom: 12 }}>{error}</p>
      )}

      {/* Verifying indicator */}
      {isVerifying && (
        <p style={{ fontSize: 13, color: "#8A7D6B", marginBottom: 12 }}>Verifying...</p>
      )}

      {/* Resend */}
      <button
        onClick={handleResend}
        disabled={resendTimer > 0 || resending || isVerifying}
        style={{
          background: "none",
          border: "none",
          fontSize: 13,
          color: resendTimer > 0 ? "#B0A89C" : "#2C2824",
          cursor: resendTimer > 0 ? "default" : "pointer",
          fontFamily: "inherit",
          textDecoration: resendTimer > 0 ? "none" : "underline",
          padding: 0,
        }}
      >
        {resendTimer > 0 ? `Resend code (${resendTimer}s)` : resending ? "Sending..." : "Resend code"}
      </button>

      {/* Footer */}
      <p
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 11,
          color: "#B0A89C",
          letterSpacing: "0.04em",
        }}
      >
        Powered by BLDG.chat
      </p>
    </div>
  );
}
