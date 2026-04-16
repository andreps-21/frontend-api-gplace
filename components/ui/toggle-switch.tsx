import { useState } from "react"
import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ToggleSwitch({ 
  checked, 
  onChange, 
  disabled = false, 
  size = "md",
  className 
}: ToggleSwitchProps) {
  const [isPressed, setIsPressed] = useState(false)

  const sizeClasses = {
    sm: "h-5 w-9",
    md: "h-6 w-11", 
    lg: "h-7 w-13"
  }

  const thumbSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  const thumbPositionClasses = {
    sm: checked ? "translate-x-4" : "translate-x-0",
    md: checked ? "translate-x-5" : "translate-x-0",
    lg: checked ? "translate-x-6" : "translate-x-0"
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        "relative inline-flex items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        checked 
          ? "bg-green-500 hover:bg-green-600" 
          : "bg-gray-200 hover:bg-gray-300",
        disabled && "opacity-50 cursor-not-allowed",
        isPressed && "scale-95",
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
          thumbSizeClasses[size],
          thumbPositionClasses[size]
        )}
      />
    </button>
  )
}
