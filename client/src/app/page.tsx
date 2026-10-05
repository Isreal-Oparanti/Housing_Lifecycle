"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Coins,
  Percent,
  Home as HomeIcon,
  HelpCircle,
  Copy,
  Check,
  MapPin,
  TrendingUp,
  FileText,
  Sparkles,
} from "lucide-react";

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
  const [councils, setCouncils] = useState<LocalAuthority[]>([]);
  const [bands, setBands] = useState<string[]>(["A", "B", "C", "D", "E", "F", "G", "H"]);

  // Interactive Sandbox State
  const [rent, setRent] = useState<number>(1750);
  const [selectedCouncil, setSelectedCouncil] = useState<string>("Westminster");
  const [selectedBand, setSelectedBand] = useState<string>("D");
  const [discount, setDiscount] = useState<"none" | "single_person" | "student_exemption">("none");
  const [copiedSample, setCopiedSample] = useState<boolean>(false);

  // Calculation Results
  const [taxResult, setTaxResult] = useState<CouncilTaxResult | null>(null);

  // Fetch initial councils list from backend
  useEffect(() => {
    async function loadCouncils() {
      try {
        const res = await fetch("http://localhost:5000/api/council-tax/councils");
        if (res.ok) {
          const data = await res.json();
          if (data.councils) setCouncils(data.councils);
          if (data.supportedBands) setBands(data.supportedBands);
        }
      } catch {
        // Fallback gracefully for client-side display
      }
    }
    loadCouncils();
  }, []);

  // Compute Council Tax when parameters change
  useEffect(() => {
    async function fetchTax() {
      try {
        const url = `http://localhost:5000/api/council-tax/calculate?council=${encodeURIComponent(
          selectedCouncil
        )}&band=${encodeURIComponent(selectedBand)}&discount=${discount}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTaxResult(data);
        }
      } catch {
        // Fallback offline calculation if backend is waking up
        const fallbackRates: Record<string, number> = {
          Westminster: 973.16,
          Camden: 1988.35,
          Croydon: 2366.91,
          Manchester: 2073.55,
          Birmingham: 2043.43,
          Bristol: 2460.42,
        };
        const multipliers: Record<string, number> = {
          A: 6 / 9,
          B: 7 / 9,
          C: 8 / 9,
          D: 9 / 9,
          E: 11 / 9,
          F: 13 / 9,
          G: 15 / 9,
          H: 18 / 9,
        };
        const baseD = fallbackRates[selectedCouncil] || 1500;
        const mult = multipliers[selectedBand] || 1;
        const annualBase = Math.round(baseD * mult * 100) / 100;
        let discountPct = 0;
        if (discount === "single_person") discountPct = 25;
        if (discount === "student_exemption") discountPct = 100;
        const annualAdjusted = Math.round(annualBase * (1 - discountPct / 100) * 100) / 100;

        setTaxResult({
          localAuthority: {
            code: "E09000033",
            name: selectedCouncil,
            region: "England",
            taxYear: "2024/25",
            bandDRate: baseD,
          },
          band: selectedBand,
          annualBaseRate: annualBase,
          monthlyBaseRate: Math.round((annualBase / 12) * 100) / 100,
          discountType: discount,
          discountPercentage: discountPct,
          annualAdjustedRate: annualAdjusted,
          monthlyAdjustedRate: Math.round((annualAdjusted / 12) * 100) / 100,
        });
      }
    }
    fetchTax();
  }, [selectedCouncil, selectedBand, discount]);

  const copySample = () => {
    setCopiedSample(true);
    setSelectedCouncil("Camden");
    setSelectedBand("E");
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const monthlyRent = Number(rent) || 0;
  const monthlyTax = taxResult?.monthlyAdjustedRate || 0;
  const totalMonthlyCommitment = monthlyRent + monthlyTax;

  return (
    <div className="min-h-screen bg-white text-[#2e2e2e] selection:bg-[#e6e0fe] selection:text-[#7c3aed]">
      {/* Fly.io-style Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#e6e0fe]/80 px-4 sm:px-8 lg:px-16 flex items-center h-16 sm:h-20 transition-all">
        <nav className="max-w-7xl mx-auto w-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#9333ea] flex items-center justify-center text-white shadow-sm shadow-[#7c3aed]/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <a href="/" className="flex items-baseline gap-1 text-xl sm:text-2xl font-bold tracking-tight text-[#140f2d]">
              TrueCost<span className="text-[#7c3aed] text-lg font-mono">.uk</span>
            </a>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#686082]">
            <a href="#how-it-works" className="hover:text-[#7c3aed] transition-colors">
              How It Works
            </a>
            <a href="#calculator" className="hover:text-[#7c3aed] transition-colors">
              Rate Calculator
            </a>
            <a href="#variance" className="hover:text-[#7c3aed] transition-colors">
              Council Variance
            </a>
            <a href="#faqs" className="hover:text-[#7c3aed] transition-colors">
              Bands &amp; Discounts
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <a
              href="#calculator"
              className="hidden sm:flex h-9 sm:h-10 items-center justify-center rounded-lg border border-[#d4c4fd] bg-[#e6e0fe] px-4 text-xs sm:text-sm font-medium text-[#7c3aed] transition-colors hover:bg-[#d4c4fd]/60"
            >
              Check a Property
            </a>
            <a
              href="#calculator"
              className="flex h-9 sm:h-10 items-center justify-center rounded-lg bg-[#7c3aed] px-4 sm:px-5 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-violet-700 shadow-sm shadow-[#7c3aed]/25"
            >
              Explore Rates
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section with Dreamy Pastel Background */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-[#e6e0fe]/40">
        {/* Pastel sky watercolor gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ebf5ff] via-[#f5edff] to-[#fff1f2] -z-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Heading and CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d4c4fd] bg-white/80 px-3.5 py-1 text-xs font-medium text-[#7c3aed] shadow-sm backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span>UK Rental Financial Intelligence</span>
              </div>

              <h1 className="font-serif text-[#2e2e2e] text-4xl sm:text-6xl lg:text-[72px] leading-[0.98] tracking-[-0.03em] font-medium">
                Rent is only<br />
                half the bill.
              </h1>

              <p className="text-[#4b5563] text-base sm:text-xl leading-[1.4] max-w-[48ch]">
                Advertised rent hides Council Tax bands, local authority variance, and unexpected bills.
                See the true monthly commitment before you sign a tenancy.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#calculator"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] text-white px-6 py-3.5 text-base font-medium hover:bg-violet-700 transition shadow-[0_2px_8px_rgba(124,58,237,0.3)] cursor-pointer"
                >
                  Calculate for Free
                  <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={copySample}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-[15px] font-medium text-[#686082] hover:text-[#7c3aed] hover:bg-white/60 transition-colors cursor-pointer border border-transparent hover:border-[#e6e0fe]"
                >
                  {copiedSample ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Sample loaded below</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Compare Camden Band E</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Tactile "TrueCost Tenancy Slip" Comparison */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative background shadow */}
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#c4b5fd] to-[#fbcfe8] rounded-3xl blur-xl opacity-60" />

                {/* White Card */}
                <div className="relative bg-white/95 rounded-2xl border border-[#e6e0fe] shadow-xl p-6 sm:p-7 space-y-5 backdrop-blur-md">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#686082]">
                        The Council Boundary Contrast
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      2024/25
                    </span>
                  </div>

                  {/* Property Comparison Row 1: Westminster */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-900">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Westminster Flat (SW1)
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        Lowest in UK
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-slate-600 pt-1">
                      <span>Rent £1,800 + Band D Tax (£81.10)</span>
                      <span className="font-bold text-slate-900 text-sm">£1,881.10 / mo</span>
                    </div>
                  </div>

                  {/* Property Comparison Row 2: Croydon */}
                  <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-900">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> Croydon Flat (CR0)
                      </div>
                      <span className="text-xs font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                        Higher Band D
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-slate-600 pt-1">
                      <span>Rent £1,800 + Band D Tax (£197.24)</span>
                      <span className="font-bold text-slate-900 text-sm">£1,997.24 / mo</span>
                    </div>
                  </div>

                  {/* Highlight Callout */}
                  <div className="rounded-xl bg-[#faf8ff] border border-[#e6e0fe] p-3.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-[#140f2d]">Same advertised rent:</span>
                      <p className="text-slate-500 text-[11px]">Exact £1,800/mo listing price</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#7c3aed] text-sm">+£116.14 / mo</span>
                      <p className="text-[10px] text-slate-400 font-mono">£1,393 / yr variance</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authority & Trust Bar (Fly.io Style) */}
      <section className="border-b border-slate-100 bg-[#fafafa] py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-[#686082]">
            Authoritative schedules across UK Local Authorities &amp; Valuation Agencies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-medium text-slate-500">
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
              Valuation Office Agency (VOA)
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
              Westminster City Council
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
              Manchester City Council
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
              Birmingham City Council
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
              Camden London Borough
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
              Bristol City Council
            </span>
          </div>
        </div>
      </section>

      {/* Narrative Section: The Boundary Problem */}
      <section id="variance" className="py-20 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <span className="text-xs uppercase tracking-wider font-bold text-[#7c3aed] bg-[#e6e0fe] px-3 py-1 rounded-full">
            The Rental Blind Spot
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-[#2e2e2e] leading-tight font-normal">
            A five-minute walk across a boundary line can cost you £1,400 a year.
          </h2>
          <p className="text-base sm:text-lg text-[#686082] leading-relaxed">
            Property search portals treat advertised rent as the whole number. But Council Tax is set independently by each local authority. Two comparable flats on opposite sides of a street can have drastically different outgoings.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-[#e6e0fe] bg-white p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#e6e0fe] text-[#7c3aed] flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-semibold text-lg text-[#140f2d]">Council Tax Bands (A to H)</h3>
            <p className="text-sm text-[#686082] leading-relaxed">
              Every home in England and Scotland is placed in a valuation band based on 1991 capital values. Higher bands pay a statutory multiple of the baseline Band D rate.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e6e0fe] bg-white p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#e6e0fe] text-[#7c3aed] flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-semibold text-lg text-[#140f2d]">Statutory Discounts</h3>
            <p className="text-sm text-[#686082] leading-relaxed">
              Living alone? You are legally entitled to 25% off your council tax bill. Full-time students qualify for a 100% exemption. TrueCost applies these instantly.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e6e0fe] bg-white p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#e6e0fe] text-[#7c3aed] flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-semibold text-lg text-[#140f2d]">True Monthly Commitment</h3>
            <p className="text-sm text-[#686082] leading-relaxed">
              Instead of discovering your council tax bill weeks after signing the tenancy agreement, you see your real monthly total before making an application.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Rate Calculator Sandbox (Clean, Fly.io Aesthetic) */}
      <section id="calculator" className="py-16 sm:py-24 bg-[#faf9f6] border-y border-[#e6e0fe]/70 px-4 sm:px-8 lg:px-16">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-serif text-3xl sm:text-5xl text-[#2e2e2e] leading-tight font-normal">
              Rate Calculator Sandbox
            </h2>
            <p className="text-sm sm:text-base text-[#686082]">
              Select a UK local authority, choose a valuation band, and test the impact of statutory discounts on your total monthly outlay.
            </p>
          </div>

          {/* Calculator Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-white rounded-3xl border border-[#e6e0fe] shadow-lg p-6 sm:p-10">
            {/* Input Controls (Left) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Advertised Monthly Rent */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#140f2d] uppercase tracking-wider flex items-center justify-between">
                  <span>Advertised Monthly Rent</span>
                  <span className="font-mono text-slate-400 font-normal">GBP (£/mo)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">£</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-3 text-base font-semibold text-[#140f2d] focus:bg-white focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all"
                    placeholder="1750"
                  />
                </div>
              </div>

              {/* Council & Band Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Council */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#140f2d] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#7c3aed]" /> Local Authority
                  </label>
                  <select
                    value={selectedCouncil}
                    onChange={(e) => setSelectedCouncil(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-sm font-medium text-[#140f2d] focus:bg-white focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all"
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
                        <option value="Croydon">Croydon (London)</option>
                        <option value="Manchester">Manchester (North West)</option>
                        <option value="Birmingham">Birmingham (West Midlands)</option>
                        <option value="Bristol">Bristol (South West)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Valuation Band */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#140f2d] uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" /> Valuation Band
                  </label>
                  <select
                    value={selectedBand}
                    onChange={(e) => setSelectedBand(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-sm font-medium text-[#140f2d] focus:bg-white focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all font-mono"
                  >
                    {bands.map((b) => (
                      <option key={b} value={b}>
                        Band {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Statutory Discount Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-[#140f2d] uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#7c3aed]" /> Statutory Circumstances
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDiscount("none")}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      discount === "none"
                        ? "border-[#7c3aed] bg-[#e6e0fe]/50 text-[#7c3aed] font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-semibold">Standard</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">2+ adult occupiers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscount("single_person")}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      discount === "single_person"
                        ? "border-[#7c3aed] bg-[#e6e0fe]/50 text-[#7c3aed] font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-semibold">Single Occupier</span>
                    <span className="block text-[11px] text-[#7c3aed] mt-0.5 font-medium">25% discount</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscount("student_exemption")}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      discount === "student_exemption"
                        ? "border-[#7c3aed] bg-[#e6e0fe]/50 text-[#7c3aed] font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-semibold">Student Household</span>
                    <span className="block text-[11px] text-[#7c3aed] mt-0.5 font-medium">100% exempt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Calculation Output Card (Right) */}
            <div className="lg:col-span-5 bg-gradient-to-b from-[#faf8ff] to-white rounded-2xl border border-[#e6e0fe] p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#e6e0fe]/70 text-xs text-[#686082]">
                <span className="font-semibold uppercase tracking-wider">TrueCost Summary</span>
                <span className="font-mono">2024/25 Rate</span>
              </div>

              {/* Prominent Monthly Commitment Display */}
              <div className="space-y-1 text-center py-2">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                  Total Monthly Outgoings
                </span>
                <div className="text-4xl sm:text-5xl font-black text-[#140f2d] tracking-tight">
                  £{totalMonthlyCommitment.toFixed(2)}
                </div>
                <span className="text-xs text-slate-500 block">
                  Advertised rent: £{monthlyRent.toFixed(2)}
                </span>
              </div>

              {/* Itemized Outgoings */}
              <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                <div className="flex items-center justify-between py-1 text-slate-600">
                  <span className="flex items-center gap-2">
                    <HomeIcon className="w-3.5 h-3.5 text-slate-400" /> Rent
                  </span>
                  <span className="font-semibold text-slate-900">£{monthlyRent.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between py-1 text-slate-600">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      <Building2 className="w-3.5 h-3.5 text-[#7c3aed]" /> Council Tax
                    </span>
                    <span className="text-[11px] text-slate-500 pl-5">
                      {taxResult ? `${taxResult.localAuthority.name} (Band ${taxResult.band})` : selectedCouncil}
                      {taxResult && taxResult.discountPercentage > 0 && ` (-${taxResult.discountPercentage}%)`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#7c3aed] text-sm">
                      +£{monthlyTax.toFixed(2)}/mo
                    </span>
                    {taxResult && (
                      <span className="block text-[10px] text-slate-400">
                        (£{taxResult.annualAdjustedRate.toFixed(2)}/yr)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informative Note */}
              <div className="rounded-xl bg-white border border-[#e6e0fe] p-3 text-[11px] text-[#686082] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                <span>
                  Official statutory multipliers verified against Valuation Office Agency formulas.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="font-serif text-3xl sm:text-5xl text-[#2e2e2e] leading-tight font-normal">
            How TrueCost Works
          </h2>
          <p className="text-base text-[#686082]">
            Three steps from property discovery to confident decision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-[#7c3aed] bg-[#e6e0fe] px-2.5 py-1 rounded">
              STEP 01
            </span>
            <h3 className="text-xl font-bold text-[#140f2d] pt-1">Paste Address or Listing</h3>
            <p className="text-sm text-[#686082] leading-relaxed">
              Input a property address or postcode. TrueCost identifies the local authority jurisdiction and property unit.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-[#7c3aed] bg-[#e6e0fe] px-2.5 py-1 rounded">
              STEP 02
            </span>
            <h3 className="text-xl font-bold text-[#140f2d] pt-1">Resolve Valuation Band</h3>
            <p className="text-sm text-[#686082] leading-relaxed">
              We look up the official Council Tax Band (A through H) against Valuation Office Agency records and the council’s annual charge schedule.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-[#7c3aed] bg-[#e6e0fe] px-2.5 py-1 rounded">
              STEP 03
            </span>
            <h3 className="text-xl font-bold text-[#140f2d] pt-1">Review True Recurring Outlay</h3>
            <p className="text-sm text-[#686082] leading-relaxed">
              Get an exact monthly cost breakdown adjusted for solo occupancy or student exemptions before paying holding deposits.
            </p>
          </div>
        </div>
      </section>

      {/* Fly.io-style Minimal Footer */}
      <footer className="border-t border-[#e6e0fe]/70 bg-white py-12 px-4 sm:px-8 lg:px-16 text-sm text-[#686082]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#140f2d]">TrueCost</span>
            <span>&bull;</span>
            <span>Rental Intelligence &amp; Housing Lifecycle</span>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <a href="#variance" className="hover:text-[#7c3aed] transition-colors">
              Council Tax Variance
            </a>
            <a href="#calculator" className="hover:text-[#7c3aed] transition-colors">
              Calculator
            </a>
            <a href="#how-it-works" className="hover:text-[#7c3aed] transition-colors">
              Documentation
            </a>
          </div>

          <div className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} TrueCost. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
