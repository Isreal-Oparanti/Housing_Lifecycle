"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ShieldCheck,
  Calculator,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  Percent,
  Home as HomeIcon,
  HelpCircle,
} from "lucide-react";

interface ApiHealth {
  status: string;
  service: string;
  timestamp: string;
  version: string;
}

interface LocalAuthority {
  code: string;
  name: string;
  region: string;
  taxYear: string;
  bandDRate: number;
}

interface CouncilTaxResult {
  localAuthority: LocalAuthority;
  band: string;
  annualBaseRate: number;
  monthlyBaseRate: number;
  discountType: "none" | "single_person" | "student_exemption";
  discountPercentage: number;
  annualAdjustedRate: number;
  monthlyAdjustedRate: number;
}

export default function Home() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);

  // Councils list
  const [councils, setCouncils] = useState<LocalAuthority[]>([]);
  const [bands, setBands] = useState<string[]>(["A", "B", "C", "D", "E", "F", "G", "H"]);

  // Calculator Form State
  const [rent, setRent] = useState<number>(1500);
  const [selectedCouncil, setSelectedCouncil] = useState<string>("Westminster");
  const [selectedBand, setSelectedBand] = useState<string>("C");
  const [discount, setDiscount] = useState<"none" | "single_person" | "student_exemption">("none");

  // Calculation Results
  const [taxResult, setTaxResult] = useState<CouncilTaxResult | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Fetch health & councils
  const initData = async () => {
    setLoadingHealth(true);
    try {
      const [healthRes, councilsRes] = await Promise.all([
        fetch("http://localhost:5000/api/health"),
        fetch("http://localhost:5000/api/council-tax/councils"),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
      if (councilsRes.ok) {
        const councilsData = await councilsRes.json();
        setCouncils(councilsData.councils || []);
        if (councilsData.supportedBands) {
          setBands(councilsData.supportedBands);
        }
      }
    } catch {
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  const calculateTax = async () => {
    setCalcLoading(true);
    try {
      const url = `http://localhost:5000/api/council-tax/calculate?council=${encodeURIComponent(
        selectedCouncil
      )}&band=${encodeURIComponent(selectedBand)}&discount=${discount}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTaxResult(data);
      }
    } catch (err) {
      console.error("Failed to calculate council tax:", err);
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (selectedCouncil && selectedBand) {
      calculateTax();
    }
  }, [selectedCouncil, selectedBand, discount]);

  // Combined TrueCost calculation
  const monthlyRent = Number(rent) || 0;
  const monthlyCouncilTax = taxResult?.monthlyAdjustedRate || 0;
  const totalMonthlyCost = monthlyRent + monthlyCouncilTax;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-10 selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
            TC
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              TrueCost
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Council Tax Engine
              </span>
            </h1>
            <p className="text-xs text-slate-400">Housing Lifecycle Intelligence</p>
          </div>
        </div>

        {/* Backend Status Badge */}
        <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-full px-3.5 py-1 text-xs shadow-inner">
          <span className="text-slate-400">API:</span>
          {loadingHealth ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting...
            </span>
          ) : health?.status === "ok" ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Online (:5000)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Offline
            </span>
          )}
          <button
            onClick={initData}
            className="text-slate-400 hover:text-slate-200 transition-colors ml-1"
            title="Refresh connection"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full py-10 space-y-10">
        {/* Intro Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Stage 1: Council Tax Recurring Cost Calculator
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Uncover the real monthly cost of your home.
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Advertised rent excludes council tax, which varies drastically across local authorities and property valuation bands.
          </p>
        </div>

        {/* Interactive Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Panel (Left) */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white text-base">Property &amp; Tenancy Details</h3>
            </div>

            {/* Monthly Rent Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Advertised Monthly Rent</span>
                <span className="text-slate-500 font-mono">£/month</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">£</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={rent}
                  onChange={(e) => setRent(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="1500"
                />
              </div>
            </div>

            {/* Council & Band Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Local Authority */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" /> Local Authority
                </label>
                <select
                  value={selectedCouncil}
                  onChange={(e) => setSelectedCouncil(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                >
                  {councils.length > 0 ? (
                    councils.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name} ({c.region})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Westminster">Westminster (London)</option>
                      <option value="Camden">Camden (London)</option>
                      <option value="Manchester">Manchester (North West)</option>
                      <option value="Birmingham">Birmingham (West Midlands)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Council Tax Band */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> Valuation Band
                </label>
                <select
                  value={selectedBand}
                  onChange={(e) => setSelectedBand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-mono"
                >
                  {bands.map((b) => (
                    <option key={b} value={b}>
                      Band {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Discount Adjustment */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-400" /> Statutory Discounts / Circumstances
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDiscount("none")}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    discount === "none"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  Standard (0%)
                  <span className="block text-[10px] text-slate-500 mt-0.5">2+ adults</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscount("single_person")}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    discount === "single_person"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  Single Person (25%)
                  <span className="block text-[10px] text-slate-500 mt-0.5">Solo occupier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscount("student_exemption")}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    discount === "student_exemption"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  Full-time Student
                  <span className="block text-[10px] text-slate-500 mt-0.5">100% exempt</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary Card (Right) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Monthly Breakdown
              </span>
              <span className="text-xs text-slate-500 font-mono">2024/25 Rates</span>
            </div>

            {/* Total Highlight */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-center space-y-1">
              <span className="text-xs text-slate-400 font-medium">Estimated Monthly TrueCost</span>
              <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                £{totalMonthlyCost.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500 block">
                vs Advertised Rent £{monthlyRent.toFixed(2)}
              </span>
            </div>

            {/* Breakdown Items */}
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-center justify-between text-slate-300 py-1">
                <span className="flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-slate-500" /> Advertised Rent
                </span>
                <span className="font-semibold text-white">£{monthlyRent.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300 py-1 border-t border-slate-800/60">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-400" /> Council Tax
                  </span>
                  <span className="text-[11px] text-slate-500 pl-6">
                    {taxResult ? `${taxResult.localAuthority.name} (Band ${taxResult.band})` : selectedCouncil}
                    {taxResult && taxResult.discountPercentage > 0 && ` • -${taxResult.discountPercentage}%`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-emerald-400">
                    +£{monthlyCouncilTax.toFixed(2)}
                  </span>
                  {taxResult && (
                    <span className="block text-[10px] text-slate-500">
                      £{taxResult.annualAdjustedRate.toFixed(2)}/yr
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-300 py-1 border-t border-slate-800/60">
                <span className="text-slate-500 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Energy &amp; Utilities
                </span>
                <span className="text-[11px] text-slate-500 italic">Excluded in Stage 1</span>
              </div>
            </div>

            {/* Accuracy Note */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Calculated strictly against official statutory band ratios and current local authority schedules.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>&copy; {new Date().getFullYear()} TrueCost (Housing Lifecycle). All rights reserved.</div>
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <span>Frontend: Next.js 15 (:3000)</span>
          <span>&bull;</span>
          <span>Backend: Express (:5000)</span>
        </div>
      </footer>
    </main>
  );
}
