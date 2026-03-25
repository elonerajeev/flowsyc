import { motion } from "framer-motion";

const shapes = [
  { emoji: "🚀", x: "10%", y: "15%", size: 40, delay: 0, duration: 6 },
  { emoji: "💎", x: "85%", y: "20%", size: 36, delay: 1, duration: 7 },
  { emoji: "⚡", x: "75%", y: "70%", size: 32, delay: 0.5, duration: 5 },
  { emoji: "🎯", x: "20%", y: "75%", size: 38, delay: 2, duration: 8 },
  { emoji: "✨", x: "50%", y: "10%", size: 28, delay: 1.5, duration: 6 },
  { emoji: "🔮", x: "90%", y: "50%", size: 34, delay: 0.8, duration: 7 },
  { emoji: "💡", x: "5%", y: "45%", size: 30, delay: 2.5, duration: 5.5 },
  { emoji: "📊", x: "60%", y: "85%", size: 32, delay: 1.2, duration: 6.5 },
  { emoji: "🌟", x: "35%", y: "50%", size: 24, delay: 3, duration: 8 },
];

const orbs = [
  { x: "15%", y: "25%", size: 300, color: "primary", opacity: 0.04, delay: 0 },
  { x: "70%", y: "60%", size: 250, color: "accent", opacity: 0.05, delay: 1 },
  { x: "50%", y: "80%", size: 200, color: "info", opacity: 0.03, delay: 2 },
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

      {/* Floating emojis */}
      {shapes.map((shape, i) => (
        <motion.div
          key={`emoji-${i}`}
          className="absolute select-none"
          style={{ left: shape.x, top: shape.y, fontSize: shape.size }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.15, 0.15, 0],
            scale: [0.5, 1, 1, 0.5],
            y: [0, -20, 10, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        >
          {shape.emoji}
        </motion.div>
      ))}

      {/* Geometric wireframe shapes */}
      {[
        { x: "30%", y: "20%", size: 60 },
        { x: "65%", y: "40%", size: 45 },
        { x: "15%", y: "60%", size: 55 },
      ].map((geo, i) => (
        <motion.div
          key={`geo-${i}`}
          className="absolute border border-primary/[0.06] rounded-xl"
          style={{ left: geo.x, top: geo.y, width: geo.size, height: geo.size }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}
