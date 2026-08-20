'use client'

import { useEffect, useRef, useState } from 'react'

export default function GrinderDial({
  value,
  min = 0,
  max = 16,
  onChange,
  label,
}: {
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  label?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const angle = ((value - min) / (max - min)) * 360 - 180
  const handleX = 50 + 40 * Math.cos((angle * Math.PI) / 180)
  const handleY = 50 + 40 * Math.sin((angle * Math.PI) / 180)

  const toValue = (deg: number) => {
    let d = deg % 360
    if (d < 0) d += 360
    return Math.round(min + (d / 360) * (max - min))
  }

  const getAngle = (e: PointerEvent | React.PointerEvent) => {
    const el = containerRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
  }

  const update = (e: PointerEvent | React.PointerEvent) => {
    const v = toValue(getAngle(e))
    if (v !== value) onChange(v)
  }

  const onStart = (e: React.PointerEvent) => {
    setDragging(true)
    update(e)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => update(e)
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, value, onChange])

  return (
    <div className="flex w-full flex-col items-center">
      {label && (
        <label className="text-sm font-medium text-espresso-300">{label}</label>
      )}
      <div
        ref={containerRef}
        onPointerDown={onStart}
        className="relative mt-3 h-36 w-36 touch-none rounded-full bg-espresso-900 shadow-inner"
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#6f4e37"
            strokeWidth="4"
            fill="none"
          />
          <line
            x1="50"
            y1="50"
            x2={handleX}
            y2={handleY}
            stroke="#b38b6d"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={handleX} cy={handleY} r="6" fill="#b38b6d" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-espresso-100 pointer-events-none">
          {value}
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="rounded-xl bg-espresso-800 px-4 py-2 text-espresso-100"
        >
          −
        </button>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="rounded-xl bg-espresso-800 px-4 py-2 text-espresso-100"
        >
          +
        </button>
      </div>
    </div>
  )
}
