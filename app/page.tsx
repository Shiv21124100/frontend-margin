"use client";

import { useState, useEffect } from "react";

interface Asset {
  symbol: string;
  mark_price: number;
  contract_value: number;
  allowed_leverage: number[];
}

interface ValidationResponse {
  status: "ok" | "error";
  message?: string;
  margin_required: number;
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [orderSize, setOrderSize] = useState<number>(0);
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState<number>(0);
  const [calculatedMargin, setCalculatedMargin] = useState<number>(0);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Use local Next.js API routes (empty string relative path)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  // Fetch config on load
  useEffect(() => {
    fetch(`${API_URL}/config/assets`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch assets");
        return res.json();
      })
      .then((data) => {
        if (data.assets && data.assets.length > 0) {
          setAssets(data.assets);
          // Default to first asset
          const firstAsset = data.assets[0];
          setSelectedAsset(firstAsset);
          setLeverage(firstAsset.allowed_leverage[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load asset configuration. Is the backend running?");
        setLoading(false);
      });
  }, []);

  // Update leverage when asset changes if current leverage is not allowed
  useEffect(() => {
    if (selectedAsset && !selectedAsset.allowed_leverage.includes(leverage)) {
      setLeverage(selectedAsset.allowed_leverage[0]);
    }
  }, [selectedAsset, leverage]);

  // Calculate margin locally
  useEffect(() => {
    if (selectedAsset && leverage > 0) {
      // Formula: (mark_price * order_size * contract_value) / leverage
      const margin = (selectedAsset.mark_price * orderSize * selectedAsset.contract_value) / leverage;
      // Round to 2 decimal places
      setCalculatedMargin(Math.round(margin * 100) / 100);
    } else {
      setCalculatedMargin(0);
    }
  }, [selectedAsset, orderSize, leverage]);

  const handleSubmit = async () => {
    if (!selectedAsset) return;

    setValidationResult(null);

    try {
      const response = await fetch(`${API_URL}/margin/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset: selectedAsset.symbol,
          order_size: orderSize,
          side: side,
          leverage: leverage,
          margin_client: calculatedMargin,
        }),
      });

      const data: ValidationResponse = await response.json();
      setValidationResult(data);
    } catch (err) {
      console.error(err);
      setValidationResult({
        status: "error",
        message: "Network error connecting to backend",
        margin_required: 0,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
        <p>Loading configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
        <p className="text-red-500">{error}</p>
        <p className="mt-4 text-sm text-gray-400">Make sure the Go backend is running on port 8080.</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-950 text-gray-100">
      <div className="w-full max-w-md bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-800">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-400">Margin Calculator</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-400">Select Asset</label>
          <div className="flex space-x-2">
            {assets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  selectedAsset?.symbol === asset.symbol
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {asset.symbol}
              </button>
            ))}
          </div>
        </div>

        {selectedAsset && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800 p-3 rounded-lg">
                <p className="text-gray-500">Mark Price</p>
                <p className="font-mono text-lg">${selectedAsset.mark_price.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <p className="text-gray-500">Contract Value</p>
                <p className="font-mono text-lg">{selectedAsset.contract_value}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400">Side</label>
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSide("long")}
                  className={`flex-1 py-1 rounded-md text-sm transition-colors ${
                    side === "long" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Long
                </button>
                <button
                  onClick={() => setSide("short")}
                  className={`flex-1 py-1 rounded-md text-sm transition-colors ${
                    side === "short" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Short
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400">Order Size</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={orderSize}
                onChange={(e) => setOrderSize(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400">Leverage</label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {selectedAsset.allowed_leverage.map((lev) => (
                  <option key={lev} value={lev}>
                    {lev}x
                  </option>
                ))}
              </select>
            </div>

            {/* Calculated Margin */}
            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Estimated Margin</span>
                <span className="text-2xl font-bold font-mono text-white">
                  {calculatedMargin.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={orderSize <= 0}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                orderSize > 0
                  ? "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                  : "bg-gray-700 cursor-not-allowed opacity-50"
              }`}
            >
              Submit Order Preview
            </button>

            {/* Validation Result */}
            {validationResult && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  validationResult.status === "ok"
                    ? "bg-green-900/20 border-green-800 text-green-400"
                    : "bg-red-900/20 border-red-800 text-red-400"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {validationResult.status === "ok" ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                  <span className="font-bold uppercase">{validationResult.status}</span>
                </div>
                {validationResult.message && (
                  <p className="mt-1 text-sm">{validationResult.message}</p>
                )}
                <p className="mt-1 text-xs opacity-70">
                  Backend verified margin: {validationResult.margin_required}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
