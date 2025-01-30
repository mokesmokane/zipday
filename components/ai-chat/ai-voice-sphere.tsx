"use client"

import type React from "react"
import { motion } from "framer-motion"

interface PulsatingSphereVisualizerProps {
  isActive: boolean
  audioLevel: number
  className?: string
  color?: "blue" | "purple" | "green"
  onClick?: () => void
}

export const PulsatingSphereVisualizer: React.FC<
  PulsatingSphereVisualizerProps
> = ({ isActive, audioLevel, className = "", color = "blue", onClick }) => {
  const scaleFactor = 1 + Math.min(audioLevel * 1.5, 1) * 0.4
  const baseStiffness = 100 - audioLevel * 50
  const baseDamping = 15 + audioLevel * 5

  const gradientColors = {
    blue: {
      from: "from-blue-300",
      to: "to-purple-400",
      innerFrom: "from-blue-200",
      innerTo: "to-purple-300",
      shadow: "rgba(147, 197, 253, 0.5)"
    },
    purple: {
      from: "from-purple-300",
      to: "to-pink-400",
      innerFrom: "from-purple-200",
      innerTo: "to-pink-300",
      shadow: "rgba(168, 147, 253, 0.5)"
    },
    green: {
      from: "from-green-300",
      to: "to-emerald-400",
      innerFrom: "from-green-200",
      innerTo: "to-emerald-300",
      shadow: "rgba(147, 253, 176, 0.5)"
    }
  }

  const colors = gradientColors[color]

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      onClick={onClick}
    >
      <motion.div
        className={`size-full rounded-full bg-gradient-to-br ${colors.from} ${colors.to} shadow-lg`}
        style={{
          boxShadow: `0 0 30px ${colors.shadow}`
        }}
        animate={{
          scale: isActive ? scaleFactor : 1
        }}
        transition={{
          type: "spring",
          stiffness: baseStiffness,
          damping: baseDamping,
          mass: 1,
          restDelta: 0.001
        }}
      >
        <motion.div
          className={`size-full rounded-full bg-gradient-to-br ${colors.innerFrom} ${colors.innerTo} opacity-75`}
          animate={{
            scale: isActive ? 0.9 + audioLevel * 0.1 : 0.85
          }}
          transition={{
            type: "spring",
            stiffness: baseStiffness * 1.2,
            damping: baseDamping * 1.1,
            mass: 0.8,
            restDelta: 0.001
          }}
        />
      </motion.div>
    </div>
  )
}
