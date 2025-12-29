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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100 font-sans">
      <div className="w-full max-w-lg bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-800 ring-1 ring-gray-700/50">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-tight">
          Margin Calculator
        </h1>

        <div className="mb-8">
          <label className="block text-xs uppercase tracking-wider font-semibold mb-3 text-gray-400">Select Asset</label>
          <div className="flex space-x-3 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700/50">
            {assets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ease-in-out transform ${
                  selectedAsset?.symbol === asset.symbol
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                {asset.symbol}
              </button>
            ))}
          </div>
        </div>

        {selectedAsset && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/30">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Mark Price</p>
                <p className="font-mono text-xl text-white font-semibold">${selectedAsset.mark_price.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/30">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Contract Value</p>
                <p className="font-mono text-xl text-white font-semibold">{selectedAsset.contract_value}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold mb-2 text-gray-400">Position Side</label>
              <div className="flex bg-gray-800/50 rounded-xl p-1.5 border border-gray-700/50">
                <button
                  onClick={() => setSide("long")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    side === "long" 
                    ? "bg-green-600 text-white shadow-md shadow-green-900/30" 
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  Long
                </button>
                <button
                  onClick={() => setSide("short")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    side === "short" 
                    ? "bg-red-600 text-white shadow-md shadow-red-900/30" 
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  Short
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold mb-2 text-gray-400">Order Size</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderSize}
                    onChange={(e) => setOrderSize(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">Contracts</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold mb-2 text-gray-400">Leverage</label>
                <div className="relative">
                  <select
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full appearance-none bg-gray-800/50 border border-gray-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {selectedAsset.allowed_leverage.map((lev) => (
                      <option key={lev} value={lev}>
                        {lev}x
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculated Margin */}
            <div className="pt-6 mt-2 border-t border-gray-800/50">
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-400 font-medium">Estimated Margin</span>
                <span className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
                  ${calculatedMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500/50 w-full animate-pulse"></div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={orderSize <= 0}
              className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-300 transform ${
                orderSize > 0
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:-translate-y-0.5"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
              }`}
            >
              {orderSize > 0 ? "Validate Margin Requirement" : "Enter Order Size"}
            </button>

            {/* Validation Result */}
            {validationResult && (
              <div
                className={`mt-6 p-4 rounded-xl border backdrop-blur-sm transition-all duration-500 animate-slideUp ${
                  validationResult.status === "ok"
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${validationResult.status === "ok" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    {validationResult.status === "ok" ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold uppercase tracking-wide text-sm">
                      {validationResult.status === "ok" ? "Margin Validated" : "Validation Failed"}
                    </h3>
                    {validationResult.message && (
                      <p className="text-sm opacity-90 mt-0.5">{validationResult.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pl-12">
                   <p className="text-xs font-mono opacity-70 bg-black/20 inline-block px-2 py-1 rounded">
                    Backend Required: ${validationResult.margin_required}
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
