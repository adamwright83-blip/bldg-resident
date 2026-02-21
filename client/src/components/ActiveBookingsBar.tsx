/**
 * ActiveBookingsBar — horizontal chip row showing active bookings.
 * Tapping a chip opens an overlay card with Modify/Cancel actions.
 *
 * Phase 2.0: pulseFirst prop adds a subtle border pulse to the
 * first (soonest) booking chip every 8 seconds.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Booking {
  id: number;
  serviceType: string;
  scheduledDate: string | null;
  scheduledWindow: string | null;
  recurrencePattern?: string | null;
  status: string;
}

interface ActiveBookingsBarProps {
  bookings: Booking[];
  onModify: (bookingId: number, newDate: string, newWindow: string) => void;
  onCancel: (bookingId: number) => void;
  /** When true, the first chip gets a subtle border pulse animation */
  pulseFirst?: boolean;
}

export default function ActiveBookingsBar({
  bookings,
  onModify,
  onCancel,
  pulseFirst = false,
}: ActiveBookingsBarProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModifyOptions, setShowModifyOptions] = useState(false);

  if (bookings.length === 0) return null;

  const timeOptions = [
    { date: "Tomorrow", window: "9–11 AM" },
    { date: "Tomorrow", window: "12–2 PM" },
    { date: "Tomorrow", window: "7–9 PM" },
    { date: "This Thursday", window: "7–10 AM" },
    { date: "This Friday", window: "7–10 AM" },
    { date: "This Saturday", window: "9–12 PM" },
  ];

  const handleTimeSelect = (date: string, window: string) => {
    if (selectedBooking) {
      onModify(selectedBooking.id, date, window);
      setShowModifyOptions(false);
      setSelectedBooking(null);
    }
  };

  const handleCancel = () => {
    if (selectedBooking) {
      onCancel(selectedBooking.id);
      setShowModifyOptions(false);
      setSelectedBooking(null);
    }
  };

  return (
    <>
      {/* Horizontal chip row */}
      <div className="active-bookings-bar">
        {bookings.map((booking, index) => (
          <button
            key={booking.id}
            onClick={() => setSelectedBooking(booking)}
            className={`active-booking-chip ${pulseFirst && index === 0 ? "booking-chip-pulse" : ""}`}
          >
            <span className="active-booking-chip-service">
              {booking.serviceType}
            </span>
            <span className="active-booking-chip-date">
              {booking.scheduledDate}
            </span>
          </button>
        ))}
      </div>

      {/* Overlay card */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Backdrop */}
            <motion.div
              className="overlay-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedBooking(null);
                setShowModifyOptions(false);
              }}
            />

            {/* Card — flexbox centering wrapper avoids framer-motion transform conflict */}
            <div className="overlay-card">
              <motion.div
                className="overlay-card-inner"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {/* Close button */}
                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setShowModifyOptions(false);
                  }}
                  className="overlay-card-close"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>

                {/* Status badge */}
                <div className="overlay-card-status">CONFIRMED</div>

                {/* Service + recurrence */}
                <div className="overlay-card-header">
                  <span className="overlay-card-service">
                    {selectedBooking.serviceType}
                  </span>
                  {selectedBooking.recurrencePattern && (
                    <span className="overlay-card-recurrence">
                      {selectedBooking.recurrencePattern}
                    </span>
                  )}
                </div>

                {/* Date + window */}
                <div className="overlay-card-details">
                  <p className="overlay-card-date">{selectedBooking.scheduledDate}</p>
                  <p className="overlay-card-window">{selectedBooking.scheduledWindow}</p>
                </div>

                {/* Actions */}
                <div className="overlay-card-actions">
                  {!showModifyOptions ? (
                    <button
                      onClick={() => setShowModifyOptions(true)}
                      className="overlay-card-btn-modify"
                    >
                      Modify time
                    </button>
                  ) : (
                    <div className="overlay-card-modify-options">
                      {timeOptions.map((opt) => (
                        <button
                          key={`${opt.date}-${opt.window}`}
                          onClick={() => handleTimeSelect(opt.date, opt.window)}
                          className="overlay-card-time-option"
                        >
                          {opt.date} {opt.window}
                        </button>
                      ))}
                      <button
                        onClick={handleCancel}
                        className="overlay-card-btn-cancel"
                      >
                        Cancel pickup
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
