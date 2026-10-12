import type { RiskLevel } from "../types";

const COLORS: Record<RiskLevel, string> = {
  Low: "bg-emerald-500",
  Moderate: "bg-amber-500",
  High: "bg-orange-500",
  Severe: "bg-red-500",
  "No Travel": "bg-red-900",
};

export default function RiskBadge({
  level,
  size = "md",
}: {
  level: RiskLevel;
  size?: "sm" | "md";
}) {
  const sizeCls = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white ${COLORS[level]} ${sizeCls}`}
    >
      {level}
    </span>
  );
}
