// ============================================
// BLDG ServiceBookingSheet
// Manages the booking flow:
// Step 1: Service-specific form
// Step 2: Confirmation (replaces content in same sheet)
// ============================================

import { useState } from "react";
import BottomSheet from "@/components/layout/BottomSheet";
import LaundrySheet from "./LaundrySheet";
import GenericServiceSheet from "./GenericServiceSheet";
import BookingConfirmation from "./BookingConfirmation";
import { useApp } from "@/contexts/AppContext";
import { nanoid } from "nanoid";

interface ServiceBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  service: "laundry" | "dry-cleaning" | "grooming" | "amenity" | null;
  serviceName?: string;
}

export default function ServiceBookingSheet({
  isOpen,
  onClose,
  service,
  serviceName,
}: ServiceBookingSheetProps) {
  const [step, setStep] = useState<"form" | "confirmed">("form");
  const { dispatch } = useApp();

  const handleConfirm = () => {
    // Add a new order
    const orderNum = `LB-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
    dispatch({
      type: "ADD_ORDER",
      payload: {
        id: nanoid(),
        service: service === "amenity" ? "laundry" : (service || "laundry"),
        status: "scheduled",
        orderNumber: orderNum,
        pickupWindow: "Today, 6–8pm",
        pickupLocation: "Front Desk",
        deliveryWindow: "Tomorrow, 6–8pm",
        total: "Total after intake",
        createdAt: new Date().toISOString(),
      },
    });
    setStep("confirmed");
  };

  const handleClose = () => {
    setStep("form");
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      {step === "form" ? (
        service === "laundry" ? (
          <LaundrySheet onConfirm={handleConfirm} />
        ) : (
          <GenericServiceSheet
            serviceName={serviceName || "Service"}
            onConfirm={handleConfirm}
          />
        )
      ) : (
        <BookingConfirmation
          pickupWindow="Today, 6–8pm"
          location="Front Desk"
          onDone={handleClose}
        />
      )}
    </BottomSheet>
  );
}
