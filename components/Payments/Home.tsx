"use client";
import React, { useState, useEffect } from "react";
import {
  IconUsers,
  IconUserBolt,
  IconCreditCard,
  IconCurrencyBitcoin,
} from "@tabler/icons-react";
import PaymentChart from "../Chart/PaymentChart";
import Cookies from "js-cookie";
import { toast } from "react-toastify";

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

interface PaymentStats {
  period: string;
  periodStats: DailyPaymentStats[];
  totalStats: {
    totalUpiPayments: number;
    totalUpiAmount: number;
    totalCryptoPayments: number;
    totalCryptoAmount: number;
  };
  packageStats: PackagePaymentStats[];
}

const formatINR = (amount: number) => {
  return amount.toLocaleString("en-IN");
};

const formatUSD = (amount: number) => {
  return amount.toLocaleString("en-US");
};

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const token = Cookies.get("auth_token");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_VIP_URL}/api/payment/stats?period=${period}`,
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
  }, [token, period]);

  return (
    <main className="container-padding mt-4 space-y-7">
      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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

              {/* Combined UPI Payments + Amount */}
              <StatCard
                title="UPI Payments"
                icon={
                  <IconCreditCard stroke={2} className="text-green-600 gap-4" />
                }
                value={
                  <>
                    <p className="text-3xl font-bold">
                      {paymentStats.totalStats.totalUpiPayments}
                    </p>
                    <p className="text-2xl text-green-700 dark:text-green-400">
                      ₹{formatINR(paymentStats.totalStats.totalUpiAmount * 91)}
                    </p>
                  </>
                }
              />

              {/* Combined Crypto Payments + Amount */}
              <StatCard
                title="Crypto Payments"
                icon={
                  <IconCurrencyBitcoin stroke={2} className="text-orange-500" />
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
              {paymentStats?.packageStats.map((pkg) => (
                <StatCard
                  key={pkg.packageId}
                  title={`${pkg.packageName.split(" ")[0]} Month UPI Payments`}
                  icon={
                    <IconCreditCard
                      stroke={2}
                      className="text-green-600 gap-4"
                    />
                  }
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
              {paymentStats?.packageStats.map((pkg) => (
                <StatCard
                  key={pkg.packageId}
                  title={`${
                    pkg.packageName.split(" ")[0]
                  } MonthCrypto Payments`}
                  icon={
                    <IconCurrencyBitcoin
                      stroke={2}
                      className="text-orange-500"
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
            </>
          )
        )}
      </section>

      {/* Payment Chart */}
      <section>
        {loading ? (
          <LoadingCard />
        ) : (
          paymentStats && (
            <PaymentChart
              period={period}
              onPeriodChange={setPeriod}
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
