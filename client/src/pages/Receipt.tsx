/**
 * Receipt page — /receipt/:token
 * Stripe-style professional receipt layout.
 * Displays: Receipt header, vendor name, total, date, receipt number, service item, amount charged.
 */

import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export default function Receipt() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const token = params.token || "";

  const { data, isLoading, error } = trpc.chat.getReceiptByToken.useQuery(
    { token },
    {
      enabled: !!token,
      retry: false,
    }
  );

  // Redirect to home on invalid/expired token
  useEffect(() => {
    if (error) {
      console.error("[Receipt] Token error:", error.message);
      setLocation("/");
    }
  }, [error, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return null; // Redirect will happen via useEffect
  }

  const weightLbs = data.weight || 0;
  const totalPrice = (data.totalPriceCents || 0) / 100;
  
  // Format chargedAt timestamp to readable date
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const chargedAtFormatted = formatDate(data.chargedAt);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Line 1: Receipt Header */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-black">Receipt from bldg.chat</h1>
        </div>

        {/* Line 2: Vendor Name (conditional) */}
        {data.vendorName && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Here's your receipt for {data.vendorName}</p>
          </div>
        )}

        {/* Line 3: Total Amount */}
        <div className="text-center">
          <p className="text-lg font-semibold text-black">Total ${totalPrice.toFixed(2)}</p>
        </div>

        {/* Line 4: Paid Date (conditional) */}
        {chargedAtFormatted && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Paid {chargedAtFormatted}</p>
          </div>
        )}

        {/* Line 5: Receipt Number */}
        <div className="text-center">
          <p className="text-sm text-gray-600">Receipt number {data.orderId}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Line 6: Service Item */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-700">1 fluff and fold ({weightLbs} lbs)</span>
            <span className="text-sm text-gray-700 font-medium">${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Line 7: Amount Charged */}
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-black">Amount Charged</span>
          <span className="text-base font-semibold text-black">${totalPrice.toFixed(2)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Line 8: Support Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Questions?{' '}
            <a href="https://app.bldg.chat" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Visit our support site
            </a>
          </p>
        </div>

        {/* Line 9: Stripe Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-400">Powered by Stripe</p>
        </div>
      </div>
    </div>
  );
}
