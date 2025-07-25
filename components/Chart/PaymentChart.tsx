"use client";
import { useTheme } from "@/context/theme-context";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyPaymentStats {
  date: string; // Format varies: "YYYY-MM-DD" for daily, "YYYY-WXX" for weekly, "YYYY-MM" for monthly
  upiPayments: number;
  cryptoPayments: number;
  upiAmount: number;
  cryptoAmount: number;
}

interface PaymentChartProps {
  dailyStats: DailyPaymentStats[];
  period: "daily" | "weekly" | "monthly";
  onPeriodChange: (period: "daily" | "weekly" | "monthly") => void;
}

interface TooltipPayload {
  name: string;
  value: number;
  fill: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="custom-tooltip"
      style={{
        backgroundColor: "#fff",
        padding: 12,
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        fontSize: 12,
        color: "#333",
      }}
    >
      <p style={{ marginBottom: 8, fontWeight: 600 }}>{label}</p>
      {payload.map((entry, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                backgroundColor: entry.fill,
                marginRight: 6,
                borderRadius: 2,
              }}
            />
            {entry.name}
          </span>
          <span style={{ fontWeight: 600 }}>
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// Custom cursor for the chart
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomCursor: React.FC<any> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
}) => (
  <rect x={x} y={y} width={width} height={height} fill="rgba(0,0,0,0.05)" />
);

// Helper function to format date based on period
const formatDateForChart = (dateString: string, period: string): string => {
  switch (period) {
    case "daily":
      // "2024-01-15" -> "01-15"
      return dateString.slice(5);
    case "weekly":
      // "2024-W03" -> "W03"
      return dateString.split("-")[1];
    case "monthly":
      // "2025-07" -> "Jul"
      const month = dateString.split("-")[1];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthIndex = parseInt(month, 10) - 1;
      return monthNames[monthIndex] || month; // Fallback to original month if parsing fails
    default:
      return dateString;
  }
};

// Helper function to get period display label
const getPeriodLabel = (period: string): string => {
  switch (period) {
    case "daily":
      return "Last 7 Days";
    case "weekly":
      return "Last 4 Weeks";
    case "monthly":
      return "Last 12 Months";
    default:
      return "";
  }
};

const PaymentChart: React.FC<PaymentChartProps> = ({
  dailyStats,
  period,
  onPeriodChange,
}) => {
  const { theme } = useTheme();

  // Format data for chart based on selected period
  const chartData = dailyStats.map((d) => ({
    date: formatDateForChart(d.date, period),
    "UPI Payments": d.upiPayments,
    "Crypto Payments": d.cryptoPayments,
  }));

  return (
    <div
      className="bg-[#4A87D833] border dark:border-[#FFFFFF33] border-[#00000033] py-3 rounded-2xl"
      style={{ width: "100%", height: 450 }}
    >
      {/* Header with period selector */}
      <div className="flex justify-between items-center mx-10 mb-4">
        <div className="flex gap-6">
          <LegendDot color="#0ABAB5" label="UPI Payments" />
          <LegendDot color="#f97316" label="Crypto Payments" />
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {getPeriodLabel(period)}
          </span>
          <select
            value={period}
            onChange={(e) =>
              onPeriodChange(e.target.value as "daily" | "weekly" | "monthly")
            }
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     cursor-pointer"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 50 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={
              theme === "dark" ? "rgba(179,165,198,0.2)" : "rgba(0,0,0,0.1)"
            }
          />
          <XAxis
            dataKey="date"
            tick={{ fill: theme === "dark" ? "#B3A5C6" : "#333" }}
            axisLine={{ stroke: theme === "dark" ? "#B3A5C6" : "#333" }}
          />
          <YAxis
            tick={{ fill: theme === "dark" ? "#B3A5C6" : "#333" }}
            axisLine={{ stroke: theme === "dark" ? "#B3A5C6" : "#333" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
          <Bar dataKey="UPI Payments" fill="#0ABAB5" />
          <Bar dataKey="Crypto Payments" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <div className="flex items-center">
    <div
      style={{ width: 12, height: 12, backgroundColor: color }}
      className="mr-2 rounded-sm"
    />
    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
  </div>
);

export default PaymentChart;
