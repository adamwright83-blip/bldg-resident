/**
 * FloatingIcons — Subtle floating service category icons that drift around the hero area.
 * Each icon has a different float period and path to create organic movement.
 * Color: Gold (#C9A961) accent palette.
 */

import { motion } from "framer-motion";
import {
  Shirt,
  Dog,
  Car,
  Wrench,
  SprayCan,
  Package,
  ShoppingBag,
} from "lucide-react";

const icons = [
  { Icon: Shirt, label: "Laundry", x: "-16%", y: "8%", delay: 0, duration: 6 },
  { Icon: Dog, label: "Pet Care", x: "108%", y: "5%", delay: 1.2, duration: 7 },
  { Icon: Car, label: "Car Wash", x: "-20%", y: "45%", delay: 0.6, duration: 5.5 },
  { Icon: Wrench, label: "Handyman", x: "108%", y: "45%", delay: 1.8, duration: 6.5 },
  { Icon: SprayCan, label: "Cleaning", x: "106%", y: "78%", delay: 0.3, duration: 7.5 },
  { Icon: Package, label: "Assembly", x: "-16%", y: "78%", delay: 2.1, duration: 5.8 },
  { Icon: ShoppingBag, label: "Marketplace", x: "110%", y: "25%", delay: 1.5, duration: 6.2 },
];

export default function FloatingIcons() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden lg:block">
      {icons.map(({ Icon, label, x, y, delay, duration }) => (
        <motion.div
          key={label}
          className="absolute"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 + delay, duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            animate={{
              y: [0, -12, 0, 8, 0],
              x: [0, 5, 0, -5, 0],
              rotate: [0, 3, 0, -3, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: delay,
            }}
            className="group"
          >
            <div className="glass rounded-xl p-3 transition-all duration-300">
              <Icon className="w-5 h-5 text-brand-gold/70" strokeWidth={1.5} />
            </div>
            <p
              className="text-[10px] text-white/30 text-center mt-1.5 whitespace-nowrap"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {label}
            </p>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
