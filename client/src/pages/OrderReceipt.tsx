/**
 * /orders/:orderId — Displays the receipt fetched from Laundry Butler API.
 *
 * The backend at GET /api/orders/:orderId/receipt proxies the request
 * to Laundry Butler using the shared API secret. This page fetches
 * that endpoint and renders a clean receipt UI.
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { API_BASE } from "@/const";
import { motion } from "framer-motion";
import { CheckCircle, Clock, ChevronRight, AlertCircle } from "lucide-react";

interface LineItem {
  name: string;
  qty?: number;
  price: number;
}

interface Receipt {
  orderId: string;
  serviceType: string;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent?: number;
  total: number;
  paid: boolean;
  status: string;
  address: string;
  unit: string;
  pickupWindow: string;
  deliveryWindow: string;
  timestamps?: {
    createdAt?: string;
    paidAt?: string;
  };
  phone?: string;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderReceipt() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [, navigate] = useLocation();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    async function fetchReceipt() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/api/orders/${orderId}/receipt`, {
          credentials: "include",
        });

        if (res.status === 401) {
          // Not authenticated — redirect to home
          navigate("/");
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Failed to load receipt (${res.status})`
          );
        }

        const data = await res.json();
        setReceipt(data);
      } catch (err: any) {
        setError(err.message || "Failed to load receipt");
      } finally {
        setLoading(false);
      }
    }

    fetchReceipt();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "#FAF8F5" }}
      >
        <div className="flex flex-col items-center gap-4">
          <span
            className="font-display"
            style={{ fontSize: 28, color: "#B5A48B", letterSpacing: "0.06em" }}
          >
            BLDG
          </span>
          <div className="flex items-center gap-2">
            <div
              className="animate-spin rounded-full border-2 border-t-transparent"
              style={{
                width: 20,
                height: 20,
                borderColor: "#B5A48B",
                borderTopColor: "transparent",
              }}
            />
            <span style={{ fontSize: 14, color: "#9B9590" }}>
              Loading your receipt...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "#FAF8F5" }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle size={40} strokeWidth={1.5} color="#C4785B" />
          <p style={{ fontSize: 16, color: "#4A4540", fontWeight: 500 }}>
            Unable to load receipt
          </p>
          <p style={{ fontSize: 13, color: "#9B9590", maxWidth: 280 }}>
            {error}
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: 12,
              padding: "10px 24px",
              background: "#B5A48B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  const StatusIcon = receipt.paid ? CheckCircle : Clock;
  const statusColor = receipt.paid ? "#6B8E6B" : "#C4A24B";
  const statusLabel = receipt.paid ? "Paid" : "Pending";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#FAF8F5" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-center"
        style={{ padding: "20px 20px 0" }}
      >
        <span
          className="font-display"
          style={{ fontSize: 28, color: "#B5A48B", letterSpacing: "0.06em" }}
        >
          BLDG
        </span>
      </div>

      {/* Receipt Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          margin: "20px 16px",
          background: "#FFFFFF",
          border: "1px solid #E8E3DC",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Status Banner */}
        <div
          className="flex items-center gap-3"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #F0ECE6",
          }}
        >
          <StatusIcon size={22} strokeWidth={1.5} color={statusColor} />
          <div className="flex flex-col gap-0.5">
            <span
              style={{ fontSize: 15, fontWeight: 600, color: statusColor }}
            >
              {statusLabel}
            </span>
            <span style={{ fontSize: 12, color: "#9B9590" }}>
              Order #{receipt.orderId}
            </span>
          </div>
        </div>

        {/* Service Type */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #F0ECE6",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#B5A48B",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {receipt.serviceType || "Laundry Service"}
          </span>
        </div>

        {/* Line Items */}
        <div style={{ padding: "12px 20px" }}>
          {receipt.lineItems?.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
              style={{
                padding: "8px 0",
                borderBottom:
                  i < receipt.lineItems.length - 1
                    ? "1px solid #F5F2EE"
                    : "none",
              }}
            >
              <span style={{ fontSize: 14, color: "#4A4540" }}>
                {item.name}
                {item.qty && item.qty > 1 ? ` × ${item.qty}` : ""}
              </span>
              <span style={{ fontSize: 14, color: "#4A4540", fontWeight: 500 }}>
                {formatCurrency(item.price)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div
          style={{
            padding: "12px 20px 16px",
            borderTop: "1px solid #F0ECE6",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 4 }}
          >
            <span style={{ fontSize: 13, color: "#9B9590" }}>Subtotal</span>
            <span style={{ fontSize: 13, color: "#9B9590" }}>
              {formatCurrency(receipt.subtotal)}
            </span>
          </div>
          {receipt.discountPercent && receipt.discountPercent > 0 && (
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 4 }}
            >
              <span style={{ fontSize: 13, color: "#6B8E6B" }}>
                Discount ({receipt.discountPercent}%)
              </span>
              <span style={{ fontSize: 13, color: "#6B8E6B" }}>
                -
                {formatCurrency(
                  Math.round(
                    receipt.subtotal * (receipt.discountPercent / 100)
                  )
                )}
              </span>
            </div>
          )}
          <div
            className="flex items-center justify-between"
            style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F0ECE6" }}
          >
            <span
              style={{ fontSize: 16, fontWeight: 600, color: "#4A4540" }}
            >
              Total
            </span>
            <span
              style={{ fontSize: 16, fontWeight: 600, color: "#4A4540" }}
            >
              {formatCurrency(receipt.total)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Delivery Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        style={{
          margin: "0 16px 20px",
          background: "#FFFFFF",
          border: "1px solid #E8E3DC",
          borderRadius: 16,
          padding: "16px 20px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#B5A48B",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            display: "block",
            marginBottom: 12,
          }}
        >
          Delivery Details
        </span>

        <div className="flex flex-col gap-3">
          {receipt.address && (
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: 12, color: "#9B9590" }}>Address</span>
              <span style={{ fontSize: 14, color: "#4A4540" }}>
                {receipt.address}
                {receipt.unit ? `, Unit ${receipt.unit}` : ""}
              </span>
            </div>
          )}
          {receipt.pickupWindow && (
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: 12, color: "#9B9590" }}>
                Pickup Window
              </span>
              <span style={{ fontSize: 14, color: "#4A4540" }}>
                {receipt.pickupWindow}
              </span>
            </div>
          )}
          {receipt.deliveryWindow && (
            <div className="flex flex-col gap-0.5">
              <span style={{ fontSize: 12, color: "#9B9590" }}>
                Delivery Window
              </span>
              <span style={{ fontSize: 14, color: "#4A4540" }}>
                {receipt.deliveryWindow}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Continue Button */}
      <div style={{ padding: "0 16px 32px" }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2"
          style={{
            width: "100%",
            padding: "14px 24px",
            background: "#B5A48B",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Continue to Home
          <ChevronRight size={18} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}
