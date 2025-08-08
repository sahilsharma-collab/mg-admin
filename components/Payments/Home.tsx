"use client";
import React, { useState, useEffect } from "react";
import { IconUsers, IconUserBolt, IconCreditCard } from "@tabler/icons-react";
import PaymentChart from "../Chart/PaymentChart";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import Image from "next/image";

interface DailyPaymentStats {
  date: string;
  upiPayments: number;
  cryptoPayments: number;
  upiAmount: number;
  cryptoAmount: number;
}

interface PackagePaymentStats {
  packageId: string;
  packageName: string;
  totalPayments: number;
  totalAmount: number;
  upiPayments: number;
  upiAmount: number;
  cryptoPayments: number;
  cryptoAmount: number;
}

interface CurrentPeriodStats {
  upiPayments: number;
  upiAmount: number;
  cryptoPayments: number;
  cryptoAmount: number;
}

interface PaymentStats {
  period: string;
  periodStats: DailyPaymentStats[];
  currentPeriodStats: CurrentPeriodStats;
  totalStats: {
    totalUpiPayments: number;
    totalUpiAmount: number;
    totalCryptoPayments: number;
    totalCryptoAmount: number;
  };
  packageStats: PackagePaymentStats[];
}

const formatINR = (amount: number) => amount.toLocaleString("en-IN");
const formatUSD = (amount: number) => amount.toLocaleString("en-US");

const getTotalPeriodLabel = (period: string): string => {
  switch (period) {
    case "daily":
      return "Last 7 Days";
    case "weekly":
      return "Last 4 Weeks";
    case "monthly":
      return "Last 12 Months";
    case "custom":
      return "Selected Date Range";
    default:
      return "";
  }
};

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [period, setPeriod] = useState<
    "daily" | "weekly" | "monthly" | "custom" | ""
  >("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const token = Cookies.get("auth_token");

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return; // wait for both dates

    const fetchStats = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (period === "") {
          // "All" selected
          params.append("period", "custom");
          params.append("startDate", "2025-01-01"); // or earliest possible date in your DB
          params.append("endDate", new Date().toISOString().split("T")[0]);
        } else {
          params.append("period", period);
          if (period === "custom") {
            params.append("startDate", startDate);
            params.append("endDate", endDate);
          }
        }

        const res = await fetch(
          `${
            process.env.NEXT_PUBLIC_VIP_URL
          }/api/payment/stats?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setPaymentStats(data.stats);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, period, startDate, endDate]);

  return (
    <main className="container-padding mt-4 space-y-7">
      {/* Global Filter */}
      <section className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Payment Dashboard</h1>
          {paymentStats && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getTotalPeriodLabel(period)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Filter by:
          </span>
          <select
            value={period}
            onChange={(e) =>
              setPeriod(
                e.target.value as "daily" | "weekly" | "monthly" | "custom"
              )
            }
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     cursor-pointer min-w-[120px]"
          >
            <option value="">All</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>

          {/* Show date range only for custom */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              />
              <span>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
          )}
        </div>
      </section>

      {/* Current Period Stats */}

      {/* Total Stats Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {getTotalPeriodLabel(period)} Total Stats
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {loading ? (
            <LoadingCard />
          ) : (
            paymentStats && (
              <>
                <StatCard
                  title="Total Payments"
                  icon={<IconUsers stroke={2} />}
                  value={
                    paymentStats.totalStats.totalUpiPayments +
                    paymentStats.totalStats.totalCryptoPayments
                  }
                />
                <StatCard
                  title="Total Collection"
                  icon={<IconUserBolt stroke={2} />}
                  value={`$${formatUSD(
                    paymentStats.totalStats.totalUpiAmount +
                      paymentStats.totalStats.totalCryptoAmount
                  )}`}
                />
                <StatCard
                  title="Total UPI Payments"
                  icon={
                    <IconCreditCard stroke={2} className="text-green-600" />
                  }
                  value={
                    <>
                      <p className="text-3xl font-bold">
                        {paymentStats.totalStats.totalUpiPayments}
                      </p>
                      <p className="text-2xl text-green-700 dark:text-green-400">
                        ₹
                        {formatINR(paymentStats.totalStats.totalUpiAmount * 91)}
                      </p>
                    </>
                  }
                />
                <StatCard
                  title="Total Crypto Payments"
                  icon={
                    <Image
                      src="/Images/usdt.svg"
                      alt="USDT"
                      height={24}
                      width={24}
                    />
                  }
                  value={
                    <>
                      <p className="text-3xl font-bold">
                        {paymentStats.totalStats.totalCryptoPayments}
                      </p>
                      <p className="text-2xl text-orange-600 dark:text-orange-400">
                        ${formatUSD(paymentStats.totalStats.totalCryptoAmount)}
                      </p>
                    </>
                  }
                />
              </>
            )
          )}
        </div>
      </section>

      {/* Package Stats Section */}
      {!loading && paymentStats && paymentStats.packageStats.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Package-wise Stats ({getTotalPeriodLabel(period)})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* UPI Package Stats */}
            {paymentStats.packageStats.map((pkg) => (
              <StatCard
                key={`upi-${pkg.packageId}`}
                title={`${pkg.packageName.split(" ")[0]} Month UPI`}
                icon={<IconCreditCard stroke={2} className="text-green-600" />}
                value={
                  <>
                    <p className="text-3xl font-bold">{pkg.upiPayments}</p>
                    <p className="text-2xl text-green-700 dark:text-green-400">
                      ₹{formatINR(pkg.upiAmount * 91)}
                    </p>
                  </>
                }
              />
            ))}

            {/* Crypto Package Stats */}
            {paymentStats.packageStats.map((pkg) => (
              <StatCard
                key={`crypto-${pkg.packageId}`}
                title={`${pkg.packageName.split(" ")[0]} Month Crypto`}
                icon={
                  <Image
                    src="/Images/usdt.svg"
                    alt="USDT"
                    height={24}
                    width={24}
                  />
                }
                value={
                  <>
                    <p className="text-3xl font-bold">{pkg.cryptoPayments}</p>
                    <p className="text-2xl text-orange-600 dark:text-orange-400">
                      ${formatUSD(pkg.cryptoAmount)}
                    </p>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Payment Chart */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Payment Trends ({getTotalPeriodLabel(period)})
        </h2>
        {loading ? (
          <LoadingCard />
        ) : (
          paymentStats && (
            <PaymentChart
              period={period}
              dailyStats={paymentStats.periodStats}
            />
          )
        )}
      </section>
    </main>
  );
};

export default HomePage;

// Utility Components
const StatCard = ({
  title,
  icon,
  value,
}: {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
}) => (
  <div className="bg-[#4A87D833] border border-[#00000033] p-3 rounded-2xl space-y-4">
    <span className="flex justify-between">
      <h2 className="font-medium dark:text-[#B3A5C6]">{title}</h2>
      {icon}
    </span>
    <div className="font-semibold text-3xl">{value}</div>
  </div>
);

const LoadingCard = () => (
  <div className="flex justify-center items-center col-span-4 space-x-2 bg-[#4A87D833] border border-[#00000033] p-3 rounded-2xl w-full h-[6.35rem]">
    <div
      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
      style={{ animationDelay: "0ms" }}
    ></div>
    <div
      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
      style={{ animationDelay: "200ms" }}
    ></div>
    <div
      className="w-2 h-2 bg-[#0ABAB5] rounded-full animate-bounce"
      style={{ animationDelay: "400ms" }}
    ></div>
  </div>
);
