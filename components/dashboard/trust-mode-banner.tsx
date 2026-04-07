"use client";

import { cn } from "@/lib/utils";

export type TrustStatus = "active" | "degraded" | "mocking" | "fallback" | "sovereign";

interface TrustModeBannerProps {
  status: TrustStatus;
  fallbackCount: number;
  staleCount: number;
  className?: string;
}

export function TrustModeBanner({ 
  status, 
  fallbackCount, 
  staleCount, 
  className 
}: TrustModeBannerProps) {
  
  const config = {
    active: {
      bg: "bg-emerald-50 border-emerald-200",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      label: "System: Operational",
      textColor: "text-emerald-800",
      description: "HokeOS v1.3.0 Trust-Layer Active. High-precision settlement data verified."
    },
    degraded: {
      bg: "bg-amber-600 border-amber-700 shadow-md shadow-amber-200/50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
      label: "SYSTEM: DEGRADED PERFORMANCE",
      textColor: "text-white",
      description: `UNSTABLE SIGNALS: ${staleCount} stale data source(s) and ${fallbackCount} engine fallback(s). Operational integrity AT RISK.`
    },
    fallback: {
      bg: "bg-rose-600 border-rose-700 shadow-lg shadow-rose-200/50",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M6 14V8c0-1.1.9-2 2-2h10" />
          <path d="M12 20h.01" />
          <path d="M18 10h.01" />
          <path d="M6 20h.01" />
          <path d="m14 14-2 2 3 3" />
        </svg>
      ),
      label: "CRITICAL: ENGINE FALLBACK ACTIVE",
      textColor: "text-white",
      description: "DATABASE DISCONNECTED. System is operating via autonomous resilience mocks. FINANCIAL PAYOUTS ARE UNAUTHORIZED."
    },
    mocking: {
      bg: "bg-blue-50 border-blue-200",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      label: "Mocking System Mode",
      textColor: "text-blue-800",
      description: "Simulated environment active. Financial data is not for production settlement."
    },
    sovereign: {
      bg: "bg-cyan-900 border-cyan-800 shadow-lg shadow-cyan-900/40",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
          <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
          <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
          <line x1="6" x2="6.01" y1="6" y2="6" />
          <line x1="6" x2="6.01" y1="18" y2="18" />
        </svg>
      ),
      label: "SOVEREIGN LOCAL ENGINE ACTIVE",
      textColor: "text-cyan-100",
      description: "LITEENGINE (SQLITE) SECURE. Data is persisting locally on this hardware. Zero-secret industrial persistence verified."
    }
  }[status] || {
    bg: "bg-zinc-800 border-zinc-700",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    label: "Unknown Trust Status",
    textColor: "text-zinc-400",
    description: "The system is operating in an unverified state. Please contact technical audit."
  };

  return (
    <div className={cn(
      "px-4 py-3 border rounded-lg flex items-start gap-4 transition-all duration-300",
      config.bg,
      className
    )}>
      <div className="mt-1 flex-shrink-0">
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold uppercase tracking-widest", config.textColor)}>
          {config.label}
        </p>
        <p className="text-sm mt-0.5 text-zinc-700">
          {config.description}
        </p>
      </div>
      {status !== "active" && (
        <div className="flex-shrink-0 animate-pulse">
           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/50 text-zinc-600 border border-zinc-200 uppercase tracking-tighter">
             Live Signal
           </span>
        </div>
      )}
    </div>
  );
}
