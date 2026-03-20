/**
 * Receipt page — /receipt/:token
 * Verifies JWT server-side, expands to BldgReceiptViewModel via POST /api/receipt/expand.
 */
import { useParams } from "wouter";
import { useMemo, useState, useEffect } from "react";
import { API_BASE } from "@/const";
import { ReceiptPaper } from "@/components/receipt/ReceiptPaper";
import type { BldgReceiptViewModel } from "@shared/receiptViewModel";

function extractTokenFromLocation(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  const fromPath = path.includes("/receipt/")
    ? (path.split("/receipt/")[1] ?? "")
    : "";
  const raw = decodeURIComponent(fromPath.trim());
  return raw.split("/")[0].split("?")[0].split("#")[0].trim();
}

export default function Receipt() {
  const params = useParams<{ token?: string }>();
  const tokenFromParams = params?.token ?? "";
  const token = useMemo(() => {
    const a = (tokenFromParams || "").trim();
    if (a) {
      return decodeURIComponent(a).split("/")[0].split("?")[0].split("#")[0].trim();
    }
    return extractTokenFromLocation();
  }, [tokenFromParams]);

  const [model, setModel] = useState<BldgReceiptViewModel | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function expand() {
      try {
        setLoading(true);
        setInvalid(false);
        setLoadError(null);
        const res = await fetch(`${API_BASE}/api/receipt/expand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.status === 401) {
          setInvalid(true);
          setModel(null);
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setLoadError(
            typeof body.error === "string" ? body.error : "Could not load receipt"
          );
          setModel(null);
          return;
        }
        const data = (await res.json()) as BldgReceiptViewModel;
        if (data?.schemaVersion === 1 && data.branding && data.lines) {
          setModel(data);
        } else {
          setLoadError("Invalid receipt data");
          setModel(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Network error");
          setModel(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    expand();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm">
        Loading receipt…
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-100">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-7 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900 mb-2">
            This receipt link is no longer valid.
          </h1>
          <p className="text-sm text-neutral-500">
            Reply in chat and we&apos;ll help you locate your receipt.
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !model) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-100">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-7 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900 mb-2">
            Could not load receipt
          </h1>
          <p className="text-sm text-neutral-500">{loadError}</p>
        </div>
      </div>
    );
  }

  return <ReceiptPaper model={model} />;
}
