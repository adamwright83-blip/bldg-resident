// BLDG.chat Motion System — Framer Motion spring presets
// Use exactly as specified. No bounce, no overshoot.

export const springs = {
  snap: { type: "spring" as const, stiffness: 420, damping: 22, mass: 0.8 },
  sheet: { type: "spring" as const, stiffness: 340, damping: 28, mass: 1.0 },
  page: { type: "spring" as const, stiffness: 280, damping: 30, mass: 1.2 },
  micro: { type: "spring" as const, stiffness: 500, damping: 25, mass: 0.5 },
};

export const stagger = {
  delayChildren: 0.04,
  staggerChildren: 0.06,
};

// Card press interaction
export const cardTap = { scale: 0.97 };

// List item reveal
export const listItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};
