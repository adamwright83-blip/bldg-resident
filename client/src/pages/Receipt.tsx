/**
 * Receipt page — /receipt/:token
 * Pure client-rendered: decode JWT payload in browser (no signature verification), render receipt.
 * BLDG aesthetic: warm dark background, gold accents, centered card.
 */

import { useParams } from "wouter";
import { useMemo } from "react";

interface ReceiptPayload {
  orderId?: number;
  totalWeight?: number | null;
  finalAmount?: number | null;
  currency?: string;
  vendorName?: string | null;
  iat?: number | null;
  exp?: number | null;
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  try {
    return decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return "";
  }
}

function decodeReceiptPayload(token: string): ReceiptPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    if (!json) return null;
    return JSON.parse(json) as ReceiptPayload;
  } catch {
    return null;
  }
}

function isExpired(payload: ReceiptPayload): boolean {
  const exp = payload.exp;
  if (exp == null || typeof exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return exp < now;
}

function isValidReceiptPayload(payload: ReceiptPayload | null): payload is ReceiptPayload {
  if (!payload || payload.orderId == null) return false;
  if (isExpired(payload)) return false;
  return true;
}

export default function Receipt() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const { payload, invalid } = useMemo(() => {
    const decoded = decodeReceiptPayload(token);
    if (isValidReceiptPayload(decoded)) return { payload: decoded, invalid: false };
    return { payload: null, invalid: true };
  }, [token]);

  if (invalid) {
    return (
      <div className="receipt-page" style={receiptPageStyle}>
        <div className="receipt-card receipt-card--error" style={cardStyle}>
          <h1 style={errorTitleStyle}>This receipt link is no longer valid.</h1>
          <p style={errorSecondaryStyle}>
            Reply in chat and we&apos;ll help you locate your receipt.
          </p>
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const amountDollars =
    payload.finalAmount != null ? (payload.finalAmount / 100).toFixed(2) : "—";
  const currency = payload.currency || "USD";
  const dateCharged =
    payload.iat != null
      ? new Date(payload.iat * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  return (
    <div className="receipt-page" style={receiptPageStyle}>
      <div className="receipt-card" style={cardStyle}>
        <p style={brandStyle}>BLDG.chat</p>
        <h1 style={titleStyle}>Receipt</h1>

        <div style={rowStyle}>
          <span style={mutedStyle}>Order</span>
          <span style={valueStyle}>#{payload.orderId}</span>
        </div>
        {payload.vendorName && (
          <div style={rowStyle}>
            <span style={mutedStyle}>Vendor</span>
            <span style={valueStyle}>{payload.vendorName}</span>
          </div>
        )}
        <div style={rowStyle}>
          <span style={mutedStyle}>Amount charged</span>
          <span style={valueStyle}>
            {currency} ${amountDollars}
          </span>
        </div>
        {payload.totalWeight != null && payload.totalWeight > 0 && (
          <div style={rowStyle}>
            <span style={mutedStyle}>Weight</span>
            <span style={valueStyle}>{payload.totalWeight} lbs</span>
          </div>
        )}
        {dateCharged && (
          <div style={rowStyle}>
            <span style={mutedStyle}>Date charged</span>
            <span style={valueStyle}>{dateCharged}</span>
          </div>
        )}
        <div style={rowStyle}>
          <span style={mutedStyle}>Currency</span>
          <span style={valueStyle}>{currency}</span>
        </div>

        <footer style={footerStyle}>Paid and processed securely.</footer>
      </div>
    </div>
  );
}

const receiptPageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg, #2C2824)",
  color: "var(--text-primary, #F5F0E8)",
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elevated, #3D3630)",
  borderRadius: 16,
  padding: "28px 24px",
  maxWidth: 400,
  width: "100%",
  border: "1px solid var(--border, rgba(245,240,232,0.14))",
};

const brandStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.08em",
  color: "var(--accent, #C9A96E)",
  marginBottom: 4,
  fontWeight: 600,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "var(--text-primary, #F5F0E8)",
  marginBottom: 24,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "10px 0",
  borderBottom: "1px solid var(--border-subtle, rgba(245,240,232,0.08))",
};

const mutedStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-secondary, rgba(245,240,232,0.78))",
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--text-primary, #F5F0E8)",
};

const footerStyle: React.CSSProperties = {
  marginTop: 24,
  paddingTop: 16,
  borderTop: "1px solid var(--border-subtle, rgba(245,240,232,0.08))",
  fontSize: 11,
  color: "var(--text-tertiary, rgba(245,240,232,0.55))",
  textAlign: "center",
};

const errorTitleStyle: React.CSSProperties = {
  ...titleStyle,
  marginBottom: 12,
};

const errorSecondaryStyle: React.CSSProperties = {
  ...mutedStyle,
  fontSize: 14,
};
