/**
 * /orders/:orderId — BldgReceiptViewModel via GET /api/receipt/session/:orderId (server branding + vendor resolution).
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { API_BASE } from "@/const";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { ReceiptPaper } from "@/components/receipt/ReceiptPaper";
import type { BldgReceiptViewModel } from "@shared/receiptViewModel";

export default function OrderReceipt() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [, navigate] = useLocation();

  const [model, setModel] = useState<BldgReceiptViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    async function fetchReceipt() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_BASE}/api/receipt/session/${encodeURIComponent(orderId)}`,
          { credentials: "include" }
        );

        if (res.status === 401) {
          navigate("/");
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Failed to load receipt (${res.status})`
          );
        }

        const data = (await res.json()) as BldgReceiptViewModel;
        setModel(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load receipt");
      } finally {
        setLoading(false);
      }
    }

    fetchReceipt();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100">
        <div className="flex flex-col items-center gap-4">
          <span
            className="font-display text-[#B5A48B] text-[28px] tracking-wide"
            style={{ letterSpacing: "0.06em" }}
          >
            BLDG
          </span>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <div
              className="animate-spin rounded-full border-2 border-t-transparent size-5"
              style={{ borderColor: "#B5A48B", borderTopColor: "transparent" }}
            />
            Loading your receipt…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-100">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="size-10 text-amber-800/70" strokeWidth={1.5} />
          <p className="text-base font-medium text-neutral-800">
            Unable to load receipt
          </p>
          <p className="text-sm text-neutral-500 max-w-[280px]">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 px-6 py-2.5 rounded-[10px] text-sm font-medium text-white cursor-pointer"
            style={{ background: "#B5A48B" }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!model) return null;

  return (
    <>
      <ReceiptPaper model={model} />
      <div className="print:hidden flex justify-center px-4 pb-10 bg-neutral-100">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/")}
          className="w-full max-w-md py-3.5 rounded-xl text-[15px] font-medium text-white cursor-pointer"
          style={{ background: "#B5A48B" }}
        >
          Continue to Home
        </motion.button>
      </div>
    </>
  );
}
