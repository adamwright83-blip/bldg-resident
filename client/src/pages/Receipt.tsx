/**
 * Receipt page — /receipt/:token
 * User-facing page for JWT-authenticated receipts. Fetches payload from GET /api/receipt/[token].
 * BLDG aesthetic: warm dark background, gold accents, DM Sans.
 */

import { useParams } from "wouter";
import { useEffect, useState } from "react";

interface ReceiptPayload {
  orderId: number;
  customerId: string | number | null;
  totalWeight: number | null;
  finalAmount: number | null;
  currency: string;
  vendorName: string | null;
  iat: number | null;
  exp: number | null;
}

export default function Receipt() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [payload, setPayload] = useState<ReceiptPayload | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "";
    fetch(`${base}/api/receipt/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) {
          setInvalid(true);
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.orderId != null) setPayload(data);
        else setInvalid(true);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="receipt-page" style={receiptPageStyle}>
        <div className="receipt-card" style={cardStyle}>
          <p style={mutedStyle}>Loading...</p>
        </div>
      </div>
    );
  }

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
