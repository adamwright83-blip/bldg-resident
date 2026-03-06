// ============================================
// The Vault — Resident ID, Booking History, Receipts
// Premium dark UI matching BLDG.chat warm brown palette
// ============================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shield, Clock, ChevronRight, Package, Shirt, Car, Dog, SprayCan, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ───

interface VaultProps {
  onBack: () => void;
}

// ─── Helpers ───

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  laundry: <Shirt size={16} />,
  "dry-cleaning": <Shirt size={16} />,
  "car-wash": <Car size={16} />,
  grooming: <Dog size={16} />,
  cleaning: <SprayCan size={16} />,
  amenity: <Package size={16} />,
  maintenance: <Package size={16} />,
  other: <Package size={16} />,
};

const SERVICE_LABELS: Record<string, string> = {
  laundry: "Laundry",
  "dry-cleaning": "Dry Cleaning",
  "car-wash": "Car Wash",
  grooming: "Grooming",
  cleaning: "Cleaning",
  amenity: "Amenity",
  maintenance: "Maintenance",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#C9A96E",
  paid: "#7EB89A",
  confirmed: "#C9A96E",
  "in-progress": "#7EB89A",
  completed: "#7EB89A",
  cancelled: "#9E8E82",
};

function formatBuildingName(slug: string | null | undefined): string {
  if (!slug) return "—";
  if (slug.includes("opus")) return "For Opus LA";
  if (slug.includes("century")) return "For Century Park East";
  return slug;
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  // Format +13101234567 → (310) 123-4567
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const mid = digits.slice(4, 7);
    const last = digits.slice(7);
    return `(${area}) ${mid}-${last}`;
  }
  return phone;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ───

export default function Vault({ onBack }: VaultProps) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Fetch user profile for Vault
  const { data: profileData } = trpc.chat.getVaultProfile.useQuery();
  const user = profileData?.user || null;

  // Fetch booking history
  const { data: requestsData, isLoading } = trpc.chat.getRequests.useQuery();
  const requests = requestsData?.requests || [];

  // All bookings in one list, newest first
  const allBookings = [...requests].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const memberSince = user?.createdAt ? formatDate(user.createdAt) : "—";

  return (
    <div className="vault-container">
      {/* Header */}
      <div className="vault-header">
        <button className="vault-back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <span className="vault-title">The Vault</span>
        <div style={{ width: 36 }} /> {/* Spacer for centering */}
      </div>

      {/* Resident ID Card */}
      <motion.div
        className="vault-id-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="vault-id-badge">
          <Shield size={16} color="#C9A96E" />
          <span>RESIDENT ID</span>
        </div>
        <div className="vault-id-name">
          {user?.firstName || "Guest"} {user?.lastName || ""}
        </div>
        <div className="vault-id-details">
          <div className="vault-id-row">
            <span className="vault-id-label">Building</span>
            <span className="vault-id-value">{formatBuildingName(user?.buildingSlug)}</span>
          </div>
          <div className="vault-id-row">
            <span className="vault-id-label">Unit</span>
            <span className="vault-id-value">{user?.unit || "—"}</span>
          </div>
          <div className="vault-id-row">
            <span className="vault-id-label">Phone</span>
            <span className="vault-id-value">{formatPhone(user?.phoneE164)}</span>
          </div>
          <div className="vault-id-row">
            <span className="vault-id-label">Card</span>
            <span className="vault-id-value">
              {user?.paymentMethodSaved ? `•••• ${user.cardLast4 || "****"}` : "Not saved"}
            </span>
          </div>
          <div className="vault-id-row">
            <span className="vault-id-label">Member since</span>
            <span className="vault-id-value">{memberSince}</span>
          </div>
        </div>
        <div className="vault-id-footer">
          <span>BLDG.chat</span>
          <span>·</span>
          <span>{formatBuildingName(user?.buildingSlug)}</span>
        </div>
      </motion.div>

      {/* All Bookings */}
      <motion.div
        className="vault-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="vault-section-header">
          <Clock size={14} />
          <span>Bookings</span>
          {allBookings.length > 0 && (
            <span className="vault-section-count">{allBookings.length}</span>
          )}
        </div>
        {isLoading ? (
          <div className="vault-empty">Loading...</div>
        ) : allBookings.length === 0 ? (
          <div className="vault-empty">No bookings yet.</div>
        ) : (
          allBookings.map((req: any) => (
            <button
              key={req.id}
              className="vault-booking-row"
              onClick={() => setSelectedRequest(req)}
            >
              <span className="vault-booking-icon">
                {SERVICE_ICONS[req.serviceType] || <Package size={16} />}
              </span>
              <div className="vault-booking-info">
                <span className="vault-booking-service">
                  {SERVICE_LABELS[req.serviceType] || req.serviceType}
                </span>
                <span className="vault-booking-date">
                  {req.scheduledDate || formatDate(req.createdAt)}
                  {req.scheduledWindow ? ` · ${req.scheduledWindow}` : ""}
                </span>
              </div>
              <span
                className="vault-booking-status"
                style={{ color: STATUS_COLORS[req.status] || "#9E8E82" }}
              >
                {req.status}
              </span>
              <ChevronRight size={14} className="vault-booking-chevron" />
            </button>
          ))
        )}
      </motion.div>

      {/* Booking Detail Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            className="vault-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="vault-detail-card"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="vault-detail-header">
                <span className="vault-detail-title">
                  {SERVICE_LABELS[selectedRequest.serviceType] || selectedRequest.serviceType}
                </span>
                <button
                  className="vault-detail-close"
                  onClick={() => setSelectedRequest(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="vault-detail-body">
                <div className="vault-detail-row">
                  <span className="vault-detail-label">Status</span>
                  <span
                    className="vault-detail-value"
                    style={{ color: STATUS_COLORS[selectedRequest.status] }}
                  >
                    {selectedRequest.status}
                  </span>
                </div>
                <div className="vault-detail-row">
                  <span className="vault-detail-label">Scheduled</span>
                  <span className="vault-detail-value">
                    {selectedRequest.scheduledDate || "—"}
                  </span>
                </div>
                <div className="vault-detail-row">
                  <span className="vault-detail-label">Window</span>
                  <span className="vault-detail-value">
                    {selectedRequest.scheduledWindow || "—"}
                  </span>
                </div>
                {selectedRequest.upgradeLabel && (
                  <div className="vault-detail-row">
                    <span className="vault-detail-label">Add-on</span>
                    <span className="vault-detail-value">
                      {selectedRequest.upgradeLabel}
                      {selectedRequest.upgradePriceCents
                        ? ` (+$${(selectedRequest.upgradePriceCents / 100).toFixed(2)})`
                        : ""}
                    </span>
                  </div>
                )}
                {selectedRequest.requestSummary && (
                  <div className="vault-detail-row">
                    <span className="vault-detail-label">Summary</span>
                    <span className="vault-detail-value">
                      {selectedRequest.requestSummary}
                    </span>
                  </div>
                )}
                <div className="vault-detail-row">
                  <span className="vault-detail-label">Created</span>
                  <span className="vault-detail-value">
                    {formatDate(selectedRequest.createdAt)}
                  </span>
                </div>
                {selectedRequest.receiptUrl && (
                  <div className="vault-detail-row">
                    <span className="vault-detail-label">Receipt</span>
                    <span className="vault-detail-value">
                      <a
                        href={selectedRequest.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vault-receipt-link"
                      >
                        View receipt
                        {selectedRequest.orderId != null ? ` · Order #${selectedRequest.orderId}` : ""}
                      </a>
                    </span>
                  </div>
                )}
              </div>

              <div className="vault-detail-footer">
                Fulfilled by Laundry Butler.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
