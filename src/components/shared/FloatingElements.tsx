import { motion } from "framer-motion";

const orbs = [
  { x: "12%", y: "12%", size: 360, color: "info", opacity: 0.12, delay: 0 },
  { x: "78%", y: "24%", size: 280, color: "accent", opacity: 0.09, delay: 1 },
  { x: "58%", y: "74%", size: 260, color: "primary", opacity: 0.08, delay: 2 },
];

export default function FloatingElements() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Gradient orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `hsl(var(--${orb.color}))`,
            opacity: orb.opacity,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}

      {/* Geometric wireframe shapes */}
      {[
        { x: "28%", y: "18%", size: 72 },
        { x: "72%", y: "42%", size: 54 },
        { x: "18%", y: "66%", size: 64 },
      ].map((geo, i) => (
        <motion.div
          key={`geo-${i}`}
          className="absolute rounded-[1.5rem] border border-primary/[0.08] bg-[linear-gradient(180deg,hsl(var(--card)_/_0.06),transparent)]"
          style={{ left: geo.x, top: geo.y, width: geo.size, height: geo.size }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}
