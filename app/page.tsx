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

  // Use the Render backend URL directly
  const API_URL = "https://margin-baclkend-1.onrender.com";

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
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e11] p-4 text-[#eaecef] font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-[#1e2329] p-6 shadow-2xl border border-gray-800">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Margin Calculator</h1>
          <p className="text-sm text-gray-500">Calculate initial margin requirements for your positions</p>
        </div>

        {/* Asset Selection Tabs */}
        <div className="mb-8">
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-500">Select Market</label>
          <div className="flex space-x-2 rounded-lg bg-[#2b3139] p-1">
            {assets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${
                  selectedAsset?.symbol === asset.symbol
                    ? "bg-[#474d57] text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-[#363c45]"
                }`}
              >
                {asset.symbol}
              </button>
            ))}
          </div>
        </div>

        {selectedAsset && (
          <div className="space-y-6">
            {/* Market Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#2b3139] p-4 border border-gray-800">
                <p className="mb-1 text-xs text-gray-500">Mark Price</p>
                <p className="font-mono text-lg font-medium text-white">
                  ${selectedAsset.mark_price.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-[#2b3139] p-4 border border-gray-800">
                <p className="mb-1 text-xs text-gray-500">Contract Value</p>
                <p className="font-mono text-lg font-medium text-white">
                  {selectedAsset.contract_value} <span className="text-xs text-gray-500">{selectedAsset.symbol}</span>
                </p>
              </div>
            </div>

            {/* Trading Form */}
            <div className="space-y-5">
              
              {/* Position Side */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Side</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSide("long")}
                    className={`flex-1 rounded-lg border py-3 text-sm font-bold transition-all ${
                      side === "long"
                        ? "border-green-500 bg-green-500/10 text-green-500"
                        : "border-[#2b3139] bg-[#2b3139] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    Buy / Long
                  </button>
                  <button
                    onClick={() => setSide("short")}
                    className={`flex-1 rounded-lg border py-3 text-sm font-bold transition-all ${
                      side === "short"
                        ? "border-red-500 bg-red-500/10 text-red-500"
                        : "border-[#2b3139] bg-[#2b3139] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    Sell / Short
                  </button>
                </div>
              </div>

              {/* Leverage & Order Size Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Leverage */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Leverage</label>
                  <div className="relative">
                    <select
                      value={leverage}
                      onChange={(e) => setLeverage(Number(e.target.value))}
                      className="w-full appearance-none rounded-lg border border-[#2b3139] bg-[#0b0e11] py-3 px-4 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {selectedAsset.allowed_leverage.map((lev) => (
                        <option key={lev} value={lev}>
                          {lev}x
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Order Size */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Size (Contracts)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={orderSize || ""}
                    onChange={(e) => setOrderSize(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-[#2b3139] bg-[#0b0e11] py-3 px-4 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="mt-6 rounded-xl bg-[#0b0e11] p-5 border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Estimated Initial Margin</span>
                <span className="font-mono text-2xl font-bold text-white">
                  {calculatedMargin.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSubmit}
              disabled={orderSize <= 0}
              className={`w-full rounded-lg py-4 text-sm font-bold uppercase tracking-wide text-white transition-all ${
                orderSize > 0
                  ? "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                  : "cursor-not-allowed bg-[#2b3139] text-gray-500"
              }`}
            >
              {orderSize > 0 ? "Calculate & Validate" : "Enter Order Details"}
            </button>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`flex items-start space-x-3 rounded-lg border p-4 ${
                  validationResult.status === "ok"
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className={`mt-0.5 rounded-full p-1 ${validationResult.status === "ok" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                  {validationResult.status === "ok" ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-bold ${validationResult.status === "ok" ? "text-green-500" : "text-red-500"}`}>
                    {validationResult.status === "ok" ? "Margin Validated Successfully" : "Validation Failed"}
                  </p>
                  {validationResult.message && <p className="mt-1 text-xs text-gray-400">{validationResult.message}</p>}
                  <p className="mt-2 text-xs font-mono text-gray-500">
                    Backend Required: <span className="text-gray-300">${validationResult.margin_required}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
