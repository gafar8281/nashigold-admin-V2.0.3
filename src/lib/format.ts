import type { TargetUnit } from "@/lib/constants"

const sarFormatter = new Intl.NumberFormat("en-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 0,
})

const gramsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

const sarAxisFormatter = new Intl.NumberFormat("en-SA", {
  style: "currency",
  currency: "SAR",
  notation: "compact",
  maximumFractionDigits: 1,
})

const gramsAxisFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatTargetValue(value: number, unit: TargetUnit): string {
  if (unit === "SAR") return sarFormatter.format(value)
  return `${gramsFormatter.format(value)} g`
}

export function formatTargetAxisValue(value: number, unit: TargetUnit): string {
  if (unit === "SAR") return sarAxisFormatter.format(value)
  return `${gramsAxisFormatter.format(value)} g`
}

export function formatProgressPercent(achieved: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((achieved / target) * 100))
}
