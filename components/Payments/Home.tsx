"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from "react";
import {
  IconUsers,
  IconUserBolt,
  IconCreditCard,
  IconChartBar,
  IconTrendingUp,
  IconPackage,
  IconGlobe,
  IconFlag,
  IconTarget,
  IconCurrencyDollar,
  IconCoins,
} from "@tabler/icons-react";
import PaymentChart from "../Chart/PaymentChart";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Bitcoin,
  CheckCircle,
  DollarSign,
  Download,
  Package,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "../ui/date-picker";
import { Skeleton } from "../ui/skeleton";

interface DailyPaymentStats {
  date: string;
  upiPayments: number;
  cryptoPayments: number;
  upiAmount: number;
  cryptoAmount: number;
  totalPayments: number;
  totalAmount: number;
  successRate: number;
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
  successRate: number;
}

interface UTMSourceStats {
  source: string;
  totalPayments: number;
  totalAmount: number;
  upiPayments: number;
  upiAmount: number;
  cryptoPayments: number;
  cryptoAmount: number;
  successRate: number;
  percentage: number;
}

interface PaymentMethodStats {
  method: string;
  totalPayments: number;
  totalAmount: number;
  successPayments: number;
  successAmount: number;
  successRate: number;
  percentage: number;
}

interface StatusStats {
  status: string;
  count: number;
  amount: number;
  percentage: number;
}

interface CountryStats {
  country: string;
  totalPayments: number;
  totalAmount: number;
  upiPayments: number;
  upiAmount: number;
  cryptoPayments: number;
  cryptoAmount: number;
  successRate: number;
  percentage: number;
}

interface CurrentPeriodStats {
  upiPayments: number;
  upiAmount: number;
  cryptoPayments: number;
  cryptoAmount: number;
  totalPayments: number;
  totalAmount: number;
  successRate: number;
}

interface Summary {
  averageOrderValue: number;
  highestValueOrder: number;
  lowestValueOrder: number;
  mostPopularPackage: string;
  mostPopularUTMSource: string;
  topPerformingCountry: string;
}

interface PaymentStats {
  period: string;
  periodStats: DailyPaymentStats[];
  dateRange?: { startDate: string; endDate: string };
  currentPeriodStats: CurrentPeriodStats;
  packageStats: PackagePaymentStats[];
  utmSourceStats: UTMSourceStats[];
  paymentMethodStats: PaymentMethodStats[];
  statusStats: StatusStats[];
  countryStats: CountryStats[];
  summary: Summary;
}

const formatINR = (amount: number) => amount.toLocaleString("en-IN");
const formatUSD = (amount: number) => amount.toLocaleString("en-US");

const getTotalPeriodLabel = (
  period: string,
  startDate?: string,
  endDate?: string
): string => {
  switch (period) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "custom":
      if (startDate && endDate) {
        const formatDate = (dateString: string) => {
          const date = new Date(dateString);
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        return `${start} - ${end}`;
      }
      return "Selected Date Range";
    default:
      return "All Time";
  }
};

const MainLoadingSkeleton = () => (
  <div className="container-padding space-y-7">
    {/* Header Skeleton */}
    <section className="flex flex-wrap gap-4 justify-between items-center">
      <div className="flex items-center gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
    </section>

    {/* Tab Navigation Skeleton */}
    <section className="border-b border-gray-200 dark:border-gray-700 -mt-2">
      <nav className="flex space-x-8 mb-2">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
      </nav>
    </section>

    {/* Stats Grid Skeleton */}
    <section>
      <Skeleton className="h-6 w-64 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
      </div>
    </section>

    {/* Chart Skeleton */}
    <section>
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="rounded-lg border p-6">
        <Skeleton className="h-80 w-full" />
      </div>
    </section>
  </div>
);

// Stat Card Skeleton Component
const StatCardSkeleton = () => (
  <div className="p-6 space-y-3 border rounded-lg">
    <div className="flex justify-start gap-6 items-center">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-6 w-20" />
  </div>
);

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [period, setPeriod] = useState<
    "daily" | "weekly" | "monthly" | "custom" | ""
  >("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [exporting, setExporting] = useState(false);
  const token = Cookies.get("auth_token");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return; // wait for both dates

    const fetchStats = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (period === "") {
          // "All" selected
          params.append("period", "all");
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

  const generatePDF = async () => {
    if (!paymentStats || !reportRef.current) return;

    setExporting(true);
    try {
      // Helper: walk through elements & override any computed styles using unsupported oklch() with safe hex fallbacks
      const sanitizeOklchColors = (root: HTMLElement) => {
        const all: HTMLElement[] = [
          root,
          ...Array.from(root.querySelectorAll<HTMLElement>("*")),
        ];
        const styleProps = [
          "color",
          "backgroundColor",
          "borderColor",
          "borderTopColor",
          "borderRightColor",
          "borderBottomColor",
          "borderLeftColor",
        ] as const;
        all.forEach((el) => {
          const cs = window.getComputedStyle(el);
          styleProps.forEach((prop) => {
            const val = cs.getPropertyValue(
              prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
            );
            if (val && val.includes("oklch")) {
              (el.style as unknown as Record<string, string>)[prop] = "#000000"; // force black
            }
          });
          // Background shorthand
          const bg = cs.getPropertyValue("background");
          if (bg && bg.includes("oklch")) {
            el.style.background = "#000000";
          }
          // Box shadow
          const boxShadow = cs.getPropertyValue("box-shadow");
          if (boxShadow && boxShadow.includes("oklch")) {
            el.style.boxShadow = "none"; // drop complex shadow referencing unsupported colors
          }
        });
      };

      // Temporarily show the report content
      const originalDisplay = reportRef.current.style.display;
      reportRef.current.style.display = "block";
      reportRef.current.classList.remove("hidden");

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Sanitize any unsupported color functions before rendering to canvas
      sanitizeOklchColors(reportRef.current);

      // html2canvas runtime supports scale & windowWidth though types may lag; cast safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = await (html2canvas as any)(reportRef.current, {
        useCORS: true,
        allowTaint: true,
        background: "#ffffff",
        scale: 2,
        windowWidth: reportRef.current.scrollWidth,
      });

      // Restore original display
      reportRef.current.style.display = originalDisplay;
      reportRef.current.classList.add("hidden");

      // Adaptive compression: try to keep PDF <= 5MB while preserving readability
      const TARGET_BYTES = 5 * 1024 * 1024; // 5MB
      let quality = 0.9; // JPEG quality
      let attempts = 0;
      let currentCanvas: HTMLCanvasElement = canvas;
      let pdf: jsPDF | null = null;
      let finalBlob: Blob | null = null;
      let usedQuality = quality;
      // track of downscales removed (not needed for now)

      while (attempts < 10) {
        attempts++;
        pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10; // mm
        const contentWidth = pageWidth - margin * 2;
        // Fit within content width (no artificial expansion) and center on page
        const imgWidth = contentWidth;
        const imgHeight =
          (currentCanvas.height * imgWidth) / currentCanvas.width;
        const imgData = currentCanvas.toDataURL("image/jpeg", quality);

        let heightLeft = imgHeight;
        let position = margin; // y offset
        const offsetX = (pageWidth - imgWidth) / 2; // center horizontally

        pdf.addImage(
          imgData,
          "JPEG",
          offsetX,
          position,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
        heightLeft -= pageHeight - margin * 2;
        while (heightLeft > 0) {
          pdf.addPage();
          position = heightLeft - imgHeight + margin;
          pdf.addImage(
            imgData,
            "JPEG",
            offsetX,
            position,
            imgWidth,
            imgHeight,
            undefined,
            "FAST"
          );
          heightLeft -= pageHeight - margin * 2;
        }

        const blobCandidate = pdf.output("blob");
        const size = blobCandidate.size;
        if (size <= TARGET_BYTES) {
          finalBlob = blobCandidate;
          usedQuality = quality;
          break;
        }
        // Reduce quality first down to 0.5, then start downscaling resolution
        if (quality > 0.5) {
          quality = parseFloat((quality - 0.1).toFixed(2));
          continue;
        }
        // Downscale resolution (create smaller canvas) if still too large
        const factor = 0.85; // shrink by 15% each step
        const tmp = document.createElement("canvas");
        tmp.width = Math.max(800, Math.round(currentCanvas.width * factor));
        tmp.height = Math.max(800, Math.round(currentCanvas.height * factor));
        const ctx = tmp.getContext("2d");
        if (ctx) {
          ctx.drawImage(currentCanvas, 0, 0, tmp.width, tmp.height);
          currentCanvas = tmp;
          quality = 0.7; // bump quality a bit after resolution drop
        } else {
          // If context creation fails, abort loop
          finalBlob = blobCandidate;
          break;
        }
      }

      // If loop ended without assigning finalBlob, fall back to last attempt
      if (!finalBlob && pdf) {
        finalBlob = pdf.output("blob");
      }

      const fileName = `Market_Genius_VIP_Payments_Report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      // Force download without showing preview
      if (!finalBlob) throw new Error("Failed to build PDF");
      const blob = finalBlob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (blob.size > TARGET_BYTES) {
        toast.success(
          `PDF downloaded (compressed). Size ${(
            blob.size /
            1024 /
            1024
          ).toFixed(2)}MB (exceeded target).`
        );
      } else {
        toast.success(
          `PDF downloaded successfully! Size ${(
            blob.size /
            1024 /
            1024
          ).toFixed(2)}MB, quality ${usedQuality}`
        );
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF report");

      // Restore original display on error
      if (reportRef.current) {
        reportRef.current.style.display = "block";
        reportRef.current.classList.add("hidden");
      }
    } finally {
      setExporting(false);
    }
  };

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  // Helper to format a Date as YYYY-MM-DD in local timezone (avoids UTC shift of toISOString)
  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <IconChartBar size={20} /> },
    { id: "packages", label: "Packages", icon: <IconPackage size={20} /> },
    { id: "sources", label: "UTM Sources", icon: <IconGlobe size={20} /> },
    {
      id: "methods",
      label: "Payment Methods",
      icon: <IconCreditCard size={20} />,
    },
    { id: "status", label: "Status", icon: <IconTarget size={20} /> },
    // { id: "kpi", label: "KPI Metrics", icon: <IconTrendingUp size={20} /> },
  ];

  if (loading) {
    return <MainLoadingSkeleton />;
  }

  return (
    <main className="container-padding space-y-7">
      {/* Global Filter */}
      <section className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-medium">Payment Dashboard</h1>
          {paymentStats && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getTotalPeriodLabel(period, startDate, endDate)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Show date range only for custom */}
          {period === "custom" && (
            <>
              <DatePicker
                className="w-[180px]"
                date={startDate ? new Date(startDate) : undefined}
                setDate={(date) =>
                  setStartDate(date ? formatLocalDate(date) : "")
                }
                maxDate={new Date()}
                placeholder="Start date"
              />
              <DatePicker
                className="w-[180px]"
                date={endDate ? new Date(endDate) : undefined}
                setDate={(date) =>
                  setEndDate(date ? formatLocalDate(date) : "")
                }
                maxDate={new Date()}
                placeholder="End date"
              />
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateFilters}
                  className="border-dashed border border-black dark:border-white focus:ring-[0.1px] h-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          <Select
            value={period || "all"}
            onValueChange={(value) =>
              setPeriod(
                value === "all"
                  ? ""
                  : (value as "daily" | "weekly" | "monthly" | "custom")
              )
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Export PDF Button */}
          {paymentStats && (
            <Button
              onClick={generatePDF}
              disabled={exporting}
              className="bg-[#12121C] dark:bg-[#E8E8E8] rounded-md 
        hover:bg-[#1e1e2f] dark:hover:bg-[#d0d0d0]
        transition-colors dark:text-black text-white font-semibold ml-auto"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Generating..." : "Export PDF"}
            </Button>
          )}
        </div>
      </section>

      {/* Hidden Report Content for PDF */}
      <div ref={reportRef} className="hidden">
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "20px",
            width: "1440px",
            margin: "0 auto",
            color: "#000000",
            fontFamily: "Arial, sans-serif",
            fontSize: "20px", // base font size increased
            lineHeight: 1.45,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "left",
                gap: "16px",
                marginBottom: "32px",
              }}
            >
              <img
                src="/Images/logo.png"
                alt="Market Genius VIP Logo"
                style={{ height: "128px", width: "auto" }}
              />
              <div style={{ textAlign: "left" }}>
                <h1
                  style={{
                    fontSize: "64px",
                    fontWeight: "bold",
                    color: "#000000",
                    margin: 0,
                    letterSpacing: "1px",
                  }}
                >
                  MARKET GENIUS VIP
                </h1>
                <p
                  style={{
                    fontSize: "30px",
                    color: "#000000",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  Payments Report
                </p>
              </div>
            </div>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#000000",
                marginBottom: "8px",
              }}
            >
              {getTotalPeriodLabel(period, startDate, endDate)}
            </h2>
            <p
              style={{
                fontSize: "20px",
                color: "#000000",
              }}
            >
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Executive Summary */}
          <div style={{ marginBottom: "32px" }}>
            <h3
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#000000",
                marginBottom: "18px",
                borderBottom: "2px solid #000000",
                paddingBottom: "10px",
              }}
            >
              Executive Summary
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                fontSize: "24px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                }}
              >
                <p
                  style={{
                    fontWeight: "600",
                    color: "#000000",
                    margin: "4px 0",
                  }}
                >
                  Total Payments:{" "}
                  {paymentStats?.currentPeriodStats.totalPayments}
                </p>
                <p
                  style={{
                    fontWeight: "600",
                    color: "#000000",
                    margin: "4px 0",
                  }}
                >
                  Total Collection: $
                  {formatUSD(paymentStats?.currentPeriodStats.totalAmount || 0)}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                }}
              >
                <p
                  style={{
                    fontWeight: "600",
                    color: "#000000",
                    margin: "4px 0",
                  }}
                >
                  UPI Payments: {paymentStats?.currentPeriodStats.upiPayments}
                </p>
                <p
                  style={{
                    fontWeight: "600",
                    color: "#000000",
                    margin: "4px 0",
                  }}
                >
                  UPI Amount: ₹
                  {formatINR(
                    (paymentStats?.currentPeriodStats.upiAmount || 0) * 91
                  )}
                </p>
                <p
                  style={{
                    fontWeight: "600",
                    color: "#000000",
                    margin: "4px 0",
                  }}
                >
                  Crypto Payments:{" "}
                  {paymentStats?.currentPeriodStats.cryptoPayments}
                </p>
                <p
                  style={{
                    fontWeight: "600",
                    color: "#000000",
                    margin: "4px 0",
                  }}
                >
                  Crypto Amount: $
                  {formatUSD(
                    paymentStats?.currentPeriodStats.cryptoAmount || 0
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Package Statistics */}
          {paymentStats?.packageStats &&
            paymentStats.packageStats.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "30px",
                    fontWeight: 700,
                    color: "#000000",
                    marginBottom: "18px",
                    borderBottom: "2px solid #000000",
                    paddingBottom: "10px",
                  }}
                >
                  Package-wise Statistics
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "left",
                            color: "#000000",
                          }}
                        >
                          Package
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Total Payments
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Total Amount
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          UPI Payments
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          UPI Amount
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Crypto Payments
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Crypto Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentStats.packageStats.map((pkg) => (
                        <tr key={pkg.packageId}>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              color: "#000000",
                            }}
                          >
                            {pkg.packageName}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            {pkg.totalPayments}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            ${formatUSD(pkg.totalAmount)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            {pkg.upiPayments}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            ₹{formatINR(pkg.upiAmount * 91)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            {pkg.cryptoPayments}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            ${formatUSD(pkg.cryptoAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* UTM Source Statistics */}
          {paymentStats?.utmSourceStats &&
            paymentStats.utmSourceStats.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "30px",
                    fontWeight: 700,
                    color: "#000000",
                    marginBottom: "18px",
                    borderBottom: "2px solid #000000",
                    paddingBottom: "10px",
                  }}
                >
                  UTM Source Performance
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "left",
                            color: "#000000",
                          }}
                        >
                          UTM Source
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Total Payments
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Total Amount
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Success Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentStats.utmSourceStats.map((source) => (
                        <tr key={source.source}>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              color: "#000000",
                            }}
                          >
                            {source.source}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            {source.totalPayments}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            ${formatUSD(source.totalAmount)}
                          </td>

                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            {source.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Payment Method Statistics */}
          {paymentStats?.paymentMethodStats &&
            paymentStats.paymentMethodStats.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "30px",
                    fontWeight: 700,
                    color: "#000000",
                    marginBottom: "18px",
                    borderBottom: "2px solid #000000",
                    paddingBottom: "10px",
                  }}
                >
                  Payment Method Performance
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "left",
                            color: "#000000",
                          }}
                        >
                          Method
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Total Payments
                        </th>
                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Total Amount
                        </th>

                        <th
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "8px",
                            textAlign: "center",
                            color: "#000000",
                          }}
                        >
                          Success Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentStats.paymentMethodStats.map((method) => (
                        <tr key={method.method}>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              color: "#000000",
                            }}
                          >
                            {method.method}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            {method.totalPayments}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            ${formatUSD(method.totalAmount)}
                          </td>

                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              color: "#000000",
                            }}
                          >
                            {method.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Payment Status Statistics removed from PDF per request */}

          {/* KPI Metrics */}
          {paymentStats?.summary && (
            <div style={{ marginBottom: "32px" }}>
              <h3
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#000000",
                  marginBottom: "18px",
                  borderBottom: "2px solid #000000",
                  paddingBottom: "10px",
                }}
              >
                Key Performance Indicators
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  fontSize: "24px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <p
                    style={{
                      fontWeight: "600",
                      color: "#000000",
                      margin: "4px 0",
                    }}
                  >
                    Average Order Value: $
                    {formatUSD(paymentStats.summary.averageOrderValue)}
                  </p>

                  <p
                    style={{
                      fontWeight: "600",
                      color: "#000000",
                      margin: "4px 0",
                    }}
                  >
                    Most Popular Package:{" "}
                    {paymentStats.summary.mostPopularPackage.slice(0, 15)}
                  </p>
                  <p
                    style={{
                      fontWeight: "600",
                      color: "#000000",
                      margin: "4px 0",
                    }}
                  >
                    Top UTM Source: {paymentStats.summary.mostPopularUTMSource}
                  </p>
                  <p
                    style={{
                      fontWeight: "600",
                      color: "#000000",
                      margin: "4px 0",
                    }}
                  >
                    Top Country: {paymentStats.summary.topPerformingCountry}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "48px",
              paddingTop: "32px",
              borderTop: "1px solid #000000",
              textAlign: "center",
              fontSize: "14px",
              color: "#000000",
            }}
          >
            <p style={{ margin: "4px 0" }}>
              This report was automatically generated by Market Genius VIP
              Dashboard
            </p>
            <p style={{ margin: "4px 0" }}>
              For any queries, please contact the support team
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <section className="border-b border-gray-200 dark:border-gray-700 -mt-2">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#0ABAB5] text-[#0ABAB5]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {/* Tab Content */}
      {!loading && paymentStats && (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Reorganized Stats Layout */}
              <section>
                <h2 className="text-lg font-semibold mb-4">
                  Overview Stats (
                  {period === "daily"
                    ? "Today"
                    : period === "weekly"
                    ? "This Week"
                    : period === "monthly"
                    ? "This Month"
                    : period === ""
                    ? "All Time"
                    : getTotalPeriodLabel(period, startDate, endDate)}
                  )
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {loading ? (
                    <>
                      <LoadingCard />
                      <LoadingCard />
                      <LoadingCard />
                      <LoadingCard />
                      <LoadingCard />
                      <LoadingCard />
                      <LoadingCard />
                      <LoadingCard />
                    </>
                  ) : (
                    paymentStats && (
                      <>
                        {/* Total Payments */}
                        <StatCard
                          title="Total Payments"
                          icon={<IconUsers stroke={2} />}
                          value={paymentStats.currentPeriodStats.totalPayments}
                        />

                        {/* UPI Payments */}
                        <StatCard
                          title="UPI Payments"
                          icon={
                            <IconCreditCard
                              stroke={2}
                              className="text-green-600"
                            />
                          }
                          value={paymentStats.currentPeriodStats.upiPayments}
                          subtitle={`₹${formatINR(
                            paymentStats.currentPeriodStats.upiAmount * 91
                          )}`}
                        />

                        {/* 1 Month UPI */}
                        {paymentStats.packageStats.length > 0 &&
                          paymentStats.packageStats
                            .filter((pkg) =>
                              pkg.packageName.includes("1 Month")
                            )
                            .map((pkg) => (
                              <StatCard
                                key={`upi-${pkg.packageId}`}
                                title="1 Month UPI"
                                icon={
                                  <IconCreditCard
                                    stroke={2}
                                    className="text-green-600"
                                  />
                                }
                                value={pkg.upiPayments}
                                subtitle={`₹${formatINR(pkg.upiAmount * 91)}`}
                              />
                            ))}

                        {/* 3 Month UPI */}
                        {paymentStats.packageStats.length > 0 &&
                          paymentStats.packageStats
                            .filter((pkg) =>
                              pkg.packageName.includes("3 Month")
                            )
                            .map((pkg) => (
                              <StatCard
                                key={`upi-3-${pkg.packageId}`}
                                title="3 Month UPI"
                                icon={
                                  <IconCreditCard
                                    stroke={2}
                                    className="text-green-600"
                                  />
                                }
                                value={pkg.upiPayments}
                                subtitle={`₹${formatINR(pkg.upiAmount * 91)}`}
                              />
                            ))}

                        {/* Total Collection */}
                        <StatCard
                          title="Total Collection"
                          icon={<IconUserBolt stroke={2} />}
                          value={`$${formatUSD(
                            paymentStats.currentPeriodStats.totalAmount
                          )}`}
                        />

                        {/* Crypto Payments */}
                        <StatCard
                          title="Crypto Payments"
                          icon={
                            <IconCoins stroke={2} className="text-orange-600" />
                          }
                          value={paymentStats.currentPeriodStats.cryptoPayments}
                          subtitle={`$${formatUSD(
                            paymentStats.currentPeriodStats.cryptoAmount
                          )}`}
                        />

                        {/* 1 Month Crypto */}
                        {paymentStats.packageStats.length > 0 &&
                          paymentStats.packageStats
                            .filter((pkg) =>
                              pkg.packageName.includes("1 Month")
                            )
                            .map((pkg) => (
                              <StatCard
                                key={`crypto-${pkg.packageId}`}
                                title="1 Month Crypto"
                                icon={
                                  <IconCoins
                                    stroke={2}
                                    className="text-orange-600"
                                  />
                                }
                                value={pkg.cryptoPayments}
                                subtitle={`$${formatUSD(pkg.cryptoAmount)}`}
                              />
                            ))}

                        {/* 3 Month Crypto */}
                        {paymentStats.packageStats.length > 0 &&
                          paymentStats.packageStats
                            .filter((pkg) =>
                              pkg.packageName.includes("3 Month")
                            )
                            .map((pkg) => (
                              <StatCard
                                key={`crypto-3-${pkg.packageId}`}
                                title="3 Month Crypto"
                                icon={
                                  <IconCoins
                                    stroke={2}
                                    className="text-orange-600"
                                  />
                                }
                                value={pkg.cryptoPayments}
                                subtitle={`$${formatUSD(pkg.cryptoAmount)}`}
                              />
                            ))}
                      </>
                    )
                  )}
                </div>
              </section>

              {/* Payment Chart */}
              <section>
                <h2 className="text-lg font-semibold mb-4">
                  Payment Trends (
                  {getTotalPeriodLabel(period, startDate, endDate)})
                </h2>
                <PaymentChart
                  period={period}
                  dailyStats={paymentStats.periodStats}
                />
              </section>
            </>
          )}

          {/* Packages Tab */}
          {activeTab === "packages" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                Package-wise Stats (
                {getTotalPeriodLabel(period, startDate, endDate)})
              </h2>

              {/* ƒ Chart for Package Distribution */}
              <div className="mb-8">
                <PieChart
                  title="Package Distribution by Total Amount"
                  data={paymentStats.packageStats.map((pkg, index) => ({
                    label: pkg.packageName,
                    value: pkg.totalAmount,
                    color: [
                      "#3B82F6", // blue
                      "#10B981", // green
                      "#F59E0B", // yellow
                      "#EF4444", // red
                      "#8B5CF6", // purple
                      "#06B6D4", // cyan
                      "#F97316", // orange
                      "#EC4899", // pink
                    ][index % 8],
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paymentStats.packageStats.map((pkg) => (
                  <PackageCard key={pkg.packageId} package={pkg} />
                ))}
              </div>
            </section>
          )}

          {/* UTM Sources Tab */}
          {activeTab === "sources" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                UTM Source Performance (
                {getTotalPeriodLabel(period, startDate, endDate)})
              </h2>

              {/* Pie Chart for UTM Source Distribution */}
              <div className="mb-8">
                <PieChart
                  title="UTM Source Distribution by Total Amount"
                  data={paymentStats.utmSourceStats.map((source, index) => ({
                    label: source.source,
                    value: source.totalAmount,
                    color: [
                      "#3B82F6", // blue
                      "#10B981", // green
                      "#F59E0B", // yellow
                      "#EF4444", // red
                      "#8B5CF6", // purple
                      "#06B6D4", // cyan
                      "#F97316", // orange
                      "#EC4899", // pink
                    ][index % 8],
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paymentStats.utmSourceStats.map((source) => (
                  <UTMSourceCard key={source.source} source={source} />
                ))}
              </div>
            </section>
          )}

          {/* Payment Methods Tab */}
          {activeTab === "methods" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                Payment Method Performance (
                {getTotalPeriodLabel(period, startDate, endDate)})
              </h2>

              {/* Pie Chart for Payment Method Distribution */}
              <div className="mb-8">
                <PieChart
                  title="Payment Method Distribution by Total Amount"
                  data={paymentStats.paymentMethodStats.map(
                    (method, index) => ({
                      label: method.method,
                      value: method.totalAmount,
                      color: [
                        "#3B82F6", // blue
                        "#10B981", // green
                        "#F59E0B", // yellow
                        "#EF4444", // red
                        "#8B5CF6", // purple
                        "#06B6D4", // cyan
                        "#F97316", // orange
                        "#EC4899", // pink
                      ][index % 8],
                    })
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paymentStats.paymentMethodStats.map((method) => (
                  <PaymentMethodCard key={method.method} method={method} />
                ))}
              </div>
            </section>
          )}

          {/* Status Tab */}
          {activeTab === "status" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                Payment Status Breakdown (
                {getTotalPeriodLabel(period, startDate, endDate)})
              </h2>

              {/* Pie Chart for Status Distribution */}
              <div className="mb-8">
                <PieChart
                  title="Payment Status Distribution by Count"
                  data={paymentStats.statusStats.map((status, index) => ({
                    label: status.status,
                    value: status.count,
                    color: [
                      "#10B981", // green for success
                      "#EF4444", // red for failed
                      "#F59E0B", // yellow for pending
                      "#3B82F6", // blue for other
                      "#8B5CF6", // purple
                      "#06B6D4", // cyan
                      "#F97316", // orange
                      "#EC4899", // pink
                    ][index % 8],
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paymentStats.statusStats.map((status) => (
                  <StatusCard key={status.status} status={status} />
                ))}
              </div>
            </section>
          )}

          {/* KPI Metrics Tab */}
          {activeTab === "kpi" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                KPI Metrics (
                {period === "daily"
                  ? "Today"
                  : period === "weekly"
                  ? "This Week"
                  : period === "monthly"
                  ? "This Month"
                  : period === ""
                  ? "All Time"
                  : getTotalPeriodLabel(period, startDate, endDate)}
                )
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <SummaryCard
                  title="Average Order Value"
                  value={`$${formatUSD(
                    paymentStats.summary.averageOrderValue
                  )}`}
                  icon={
                    <IconCurrencyDollar stroke={2} className="text-blue-600" />
                  }
                />
                <SummaryCard
                  title="Highest Value Order"
                  value={`$${formatUSD(
                    paymentStats.summary.highestValueOrder
                  )}`}
                  icon={
                    <IconTrendingUp stroke={2} className="text-green-600" />
                  }
                />
                <SummaryCard
                  title="Lowest Value Order"
                  value={`$${formatUSD(paymentStats.summary.lowestValueOrder)}`}
                  icon={<IconTrendingUp stroke={2} className="text-red-600" />}
                />
                <SummaryCard
                  title="Most Popular Package"
                  value={paymentStats.summary.mostPopularPackage}
                  icon={<IconPackage stroke={2} className="text-purple-600" />}
                />
                <SummaryCard
                  title="Top UTM Source"
                  value={paymentStats.summary.mostPopularUTMSource}
                  icon={<IconGlobe stroke={2} className="text-indigo-600" />}
                />
                <SummaryCard
                  title="Top Country"
                  value={paymentStats.summary.topPerformingCountry}
                  icon={<IconFlag stroke={2} className="text-yellow-600" />}
                />
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
};

export default HomePage;

// PieChart Component
type DataItem = { label: string; value: number; color: string };

const PieChart = ({
  data,
  title,
}: {
  data: Array<DataItem>;
  title: string;
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<
    (DataItem & { index: number }) | null
  >(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          {title}
        </h3>
        <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  let currentAngle = 0;
  const radius = 120; // Increased from 90
  const innerRadius = 60; // Increased from 45
  const centerX = 160; // Increased from 120
  const centerY = 160; // Increased from 120

  // Find the largest segment for emphasis
  const maxValue = Math.max(...data.map((item) => item.value));

  const handleMouseMove = (
    event: React.MouseEvent<SVGPathElement>,
    item: DataItem,
    index: number
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setHoveredSegment({ ...item, index });
  };

  const handleMouseLeave = () => {
    setHoveredSegment(null);
  };

  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="px-8 py-6 border-b">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mt-1">
          Total: {title == "Payment Status Distribution by Count" ? " " : "$"}
          {total.toLocaleString()}
        </p>
      </div>

      <div className="p-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Chart Container */}
          <div className="relative flex justify-center">
            <div className="relative">
              <svg
                width="320"
                height="320"
                className="transform -rotate-90 drop-shadow-lg"
              >
                {" "}
                {/* Increased from 240x240 */}
                {data.map((item, index) => {
                  const percentage = (item.value / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  currentAngle += angle;

                  const startXOuter =
                    centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                  const startYOuter =
                    centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                  const endXOuter =
                    centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
                  const endYOuter =
                    centerY + radius * Math.sin((currentAngle * Math.PI) / 180);

                  const startXInner =
                    centerX +
                    innerRadius * Math.cos((startAngle * Math.PI) / 180);
                  const startYInner =
                    centerY +
                    innerRadius * Math.sin((startAngle * Math.PI) / 180);
                  const endXInner =
                    centerX +
                    innerRadius * Math.cos((currentAngle * Math.PI) / 180);
                  const endYInner =
                    centerY +
                    innerRadius * Math.sin((currentAngle * Math.PI) / 180);

                  const largeArcFlag = angle > 180 ? 1 : 0;
                  const isLargest = item.value === maxValue;

                  const pathData = [
                    `M ${startXInner} ${startYInner}`,
                    `L ${startXOuter} ${startYOuter}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endXOuter} ${endYOuter}`,
                    `L ${endXInner} ${endYInner}`,
                    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startXInner} ${startYInner}`,
                    "Z",
                  ].join(" ");

                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={item.color}
                      stroke="white"
                      strokeWidth={isLargest ? "3" : "2"}
                      className="hover:brightness-110 transition-all duration-300 cursor-pointer hover:scale-105"
                      style={{
                        filter: isLargest ? "url(#glow)" : "none",
                        transformOrigin: `${centerX}px ${centerY}px`,
                      }}
                      onMouseMove={(e) => handleMouseMove(e, item, index)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </svg>

              {/* Tooltip */}
              {hoveredSegment && (
                <div
                  className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-4 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: mousePosition.x,
                    top: mousePosition.y - 10,
                    minWidth: "200px",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: hoveredSegment.color }}
                    ></div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {hoveredSegment.label}
                    </h4>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Value:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {hoveredSegment.value.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Percentage:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {((hoveredSegment.value / total) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        of Total:
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar in tooltip */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: hoveredSegment.color,
                          width: `${(hoveredSegment.value / total) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Breakdown
            </h4>
            {data
              .sort((a, b) => b.value - a.value) // Sort by value descending
              .map((item, index) => {
                const percentage = ((item.value / total) * 100).toFixed(1);
                const isLargest = item.value === maxValue;

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      isLargest ? "" : ""
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full shadow-sm border border-white"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.label.slice(0, 15)}
                          {isLargest && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                              Highest
                            </span>
                          )}
                        </span>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {item.value.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {percentage}%
                          </div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            backgroundColor: item.color,
                            width: `${percentage}%`,
                            opacity: 0.8,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      {/* Footer Stats */}
    </div>
  );
};

// Utility Components
const StatCard = ({
  title,
  icon,
  value,
  subtitle,
}: {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  subtitle?: string;
}) => (
  <div className="p-6 space-y-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
    <div className="flex justify-start gap-6 items-center mb-2">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200">
        {title}
      </h3>
      <div className="text-blue-600 dark:text-blue-400">{icon}</div>
    </div>
    <div className="font-bold text-2xl text-gray-900 dark:text-white mb-1">
      {value}
    </div>
    {subtitle && (
      <div className="text-2xl text-gray-600 font-bold dark:text-gray-400">
        {subtitle}
      </div>
    )}
  </div>
);
const SummaryCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <div className="p-6">
    <div className="flex items-center gap-3 mb-3">
      <h3 className="font-medium text-gray-700 dark:text-gray-300">{title}</h3>
      {icon}
    </div>
    <div className="text-xl font-bold text-gray-900 dark:text-white">
      {value}
    </div>
  </div>
);

const PackageCard = ({ package: pkg }: { package: PackagePaymentStats }) => (
  <div className="p-6 rounded-lg border">
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <Package size={2} className="text-purple-600 w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {pkg.packageName.slice(0, 15)}
      </h3>
    </div>

    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Total Payments:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          {pkg.totalPayments}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Total Amount:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          ${formatUSD(pkg.totalAmount)}
        </span>
      </div>

      <div className=" rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              UPI Payments:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {pkg.upiPayments}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4"></div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              UPI Amount:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            ₹{formatINR(pkg.upiAmount * 91)}
          </span>
        </div>
      </div>

      <div className=" rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Bitcoin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Crypto Payments:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {pkg.cryptoPayments}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4"></div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Crypto Amount:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${formatUSD(pkg.cryptoAmount)}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const UTMSourceCard = ({ source }: { source: UTMSourceStats }) => (
  <div className="p-6 rounded-lg border">
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <IconGlobe size={2} className="text-indigo-600 w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {source.source}
      </h3>
    </div>

    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Total Payments:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          {source.totalPayments}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Total Amount:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          ${formatUSD(source.totalAmount)}
        </span>
      </div>
      <div className="rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              UPI Amount:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            ₹{formatINR(source.upiAmount * 91)}
          </span>
        </div>
      </div>
      <div className="rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Bitcoin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Crypto Amount:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${formatUSD(source.cryptoAmount)}
          </span>
        </div>
      </div>

      <div className="rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Percentage:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {source.percentage}%
          </span>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${source.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PaymentMethodCard = ({ method }: { method: PaymentMethodStats }) => (
  <div className="p-6 rounded-lg border">
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <IconCreditCard size={2} className="text-blue-600 w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {method.method}
      </h3>
    </div>

    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Total Payments:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          {method.totalPayments}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Total Amount:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          ${formatUSD(method.totalAmount)}
        </span>
      </div>

      <div className="rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Success Payments:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {method.successPayments}
          </span>
        </div>
      </div>

      <div className="rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Success Amount:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${formatUSD(method.successAmount)}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const StatusCard = ({ status }: { status: StatusStats }) => (
  <div className="p-6 rounded-lg border">
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <IconTarget size={2} className="text-red-600 w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {status.status}
      </h3>
    </div>

    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Count:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          {status.count}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Amount:
        </span>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">
          ${formatUSD(status.amount)}
        </span>
      </div>

      <div className="rounded-lg">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              Percentage:
            </span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {status.percentage}%
          </span>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${status.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LoadingCard = () => (
  <div className="flex justify-center items-center col-span-4 space-x-2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 p-6 rounded-2xl w-full h-[6.35rem]">
    <div
      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
      style={{ animationDelay: "0ms" }}
    ></div>
    <div
      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
      style={{ animationDelay: "200ms" }}
    ></div>
    <div
      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
      style={{ animationDelay: "400ms" }}
    ></div>
  </div>
);
