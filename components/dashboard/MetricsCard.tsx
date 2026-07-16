"use client";

interface MetricsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
  icon?: string;
  color?: "green" | "blue" | "orange" | "purple" | "red";
}

export default function MetricsCard({
  label,
  value,
  subtext,
  trend,
  icon,
  color = "green",
}: MetricsCardProps) {
  const colorClasses = {
    green: "border-green-100 bg-green-50/30",
    blue: "border-blue-100 bg-blue-50/30",
    orange: "border-orange-100 bg-orange-50/30",
    purple: "border-purple-100 bg-purple-50/30",
    red: "border-red-100 bg-red-50/30",
  };


  return (
    <div className={`p-6 rounded-xl border ${colorClasses[color]} backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`text-xs font-semibold ${trend.direction === "up" ? "text-green-600" : "text-red-600"}`}>
                {trend.direction === "up" ? "↑" : "↓"} {trend.value}
              </span>
            )}
          </div>
        </div>
        {icon && <div className="text-3xl">{icon}</div>}
      </div>
      {subtext && <p className="text-xs text-gray-600">{subtext}</p>}
    </div>
  );
}
