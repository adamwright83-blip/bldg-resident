import { useState, useRef, useEffect, useCallback } from "react";
import "./otp-screen.css";

interface OTPScreenProps {
  maskedPhone: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  isVerifying: boolean;
  error: string;
  previewBypass?: boolean;
}

const RESEND_COOLDOWN_S = 30;

export default function OTPScreen({
  maskedPhone,
  onVerify,
  onResend,
  isVerifying,
  error,
  previewBypass = false,
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
    <main className="otp-screen">
      <section className="otp-card">
      <h1>
        Thanks — HELD may now text this number for account and service updates.
      </h1>

      {/* Subhead */}
      <p className="otp-confirmation">
        {previewBypass ? `Enter your security code for ${maskedPhone} to continue.` : `We sent your security code to ${maskedPhone}.`}
      </p>

      {/* 6-digit input */}
      <div className="otp-digits" onPaste={handlePaste}>
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
            className={`otp-digit${error ? " otp-digit--error" : ""}`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="otp-status otp-error">{error}</p>
      )}

      {/* Verifying indicator */}
      {isVerifying && (
        <p className="otp-status">Verifying...</p>
      )}

      {/* Resend */}
      <button
        onClick={handleResend}
        disabled={resendTimer > 0 || resending || isVerifying}
        className="otp-resend"
      >
        {resendTimer > 0 ? `Resend code (${resendTimer}s)` : resending ? "Sending..." : "Resend code"}
      </button>
      </section>

      {/* Footer */}
      <p className="otp-footer">
        Powered by BLDG.chat
      </p>
    </main>
  );
}

export function VerificationCompleteScreen() {
  return <main className="otp-screen"><section className="otp-card">
    <div className="verified-mark" aria-hidden="true">✓</div>
    <h1>Your number is verified.</h1>
    <p className="otp-confirmation">HELD will use it for the account and service updates you approved.</p>
  </section><p className="otp-footer">Powered by BLDG.chat</p></main>;
}
