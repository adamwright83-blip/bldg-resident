// ============================================
// ServicesDrawer — iOS-style bottom sheet
// Slides up from bottom with spring animation.
// Shows all 6 services as full-width rows.
// Manus AI / Apple-inspired design.
// ============================================

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface ServiceRow {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
  subtitle?: string;
}

interface ServicesDrawerProps {
  open: boolean;
  onClose: () => void;
  services: ServiceRow[];
  onSelectService: (service: ServiceRow) => void;
  disabled?: boolean;
}

export default function ServicesDrawer({
  open,
  onClose,
  services,
  onSelectService,
  disabled,
}: ServicesDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="services-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="services-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 340,
              mass: 0.8,
            }}
          >
            {/* Drag handle */}
            <div className="services-drawer-handle" onClick={onClose}>
              <div className="services-drawer-handle-pill" />
            </div>

            {/* Title */}
            <div className="services-drawer-title">Services</div>

            {/* Service rows */}
            <div className="services-drawer-list">
              {services.map((svc, i) => (
                <motion.button
                  key={svc.id}
                  className="services-drawer-row"
                  onClick={() => {
                    onSelectService(svc);
                    onClose();
                  }}
                  disabled={disabled}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <span className="services-drawer-row-icon">{svc.icon}</span>
                  <div className="services-drawer-row-text">
                    <span className="services-drawer-row-label">{svc.label}</span>
                    {svc.subtitle && (
                      <span className="services-drawer-row-subtitle">{svc.subtitle}</span>
                    )}
                  </div>
                  <ChevronRight size={16} className="services-drawer-row-chevron" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
