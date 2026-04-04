"use client";

import React from "react";
import { type CalculationSnapshot } from "@/lib/roi";

interface AuditTraceViewProps {
  snapshot: CalculationSnapshot | null;
}

/**
 * HokeOS Audit Trace View (v1.3.1)
 * High-fidelity transparency for operator auditing.
 */
export function AuditTraceView({ snapshot }: AuditTraceViewProps) {
  if (!snapshot) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-zinc-900">Legacy Record Detected</h3>
        <p className="mt-1 text-sm text-zinc-500">
          This batch was created before the v1.3.0 Trust-Layer upgrade. 
          Detailed audit provenance is unavailable for this calculation.
        </p>
      </div>
    );
  }

  const { confidence, trace, timestamp, roiEngineVersion } = snapshot;

  return (
    <div className="space-y-6">
      {/* ── Trust Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
            confidence.level === 'high' ? 'bg-emerald-50 text-emerald-600' :
            confidence.level === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
          }`}>
            <span className="text-lg font-bold">{confidence.score}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900">Trust Score: {confidence.level.toUpperCase()}</h3>
              {confidence.degradedMode && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  DEGRADED MODE
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
              Engine: {roiEngineVersion} | Timestamp: {new Date(timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `audit-snapshot-${snapshot.roiEngineVersion}.json`;
              a.click();
            }}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Confidence Signals ────────────────────────────────────────── */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Trust Signals & Penalties</h4>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4 space-y-3">
            {confidence.reasons.length > 0 ? (
              confidence.reasons.map((reason, idx) => (
                <div key={idx} className="flex gap-3 text-sm">
                   <div className="mt-1 flex-shrink-0">
                      <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                   </div>
                   <span className="text-zinc-600">{reason}</span>
                </div>
              ))
            ) : (
              <div className="flex gap-3 text-sm text-emerald-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Perfect Confidence: Zero trust-layer penalties applied.</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Constants Provenance ──────────────────────────────────────── */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Calculation Infrastructure</h4>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4 font-mono text-xs">
             <div className="mb-2 flex justify-between border-b border-zinc-200 pb-1">
                <span className="text-zinc-500 uppercase tracking-widest">Constant</span>
                <span className="text-zinc-500 uppercase tracking-widest text-right">Resolved Value</span>
             </div>
             {Object.entries(trace.constantsUsed).map(([key, value]) => (
                <div key={key} className="flex justify-between py-0.5">
                  <span className="text-zinc-600">{key}</span>
                  <span className="font-bold text-zinc-900">{value}</span>
                </div>
             ))}
             <div className="mt-4 pt-2 border-t border-zinc-200 flex justify-between">
                <span className="text-zinc-500 italic">Defaults Applied:</span>
                <span className="text-zinc-900 border-b border-dotted border-zinc-300">
                   {trace.defaultsApplied.length > 0 ? trace.defaultsApplied.join(", ") : "NONE"}
                </span>
             </div>
          </div>
        </section>
      </div>

      {/* ── Step-by-Step Trace ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Step-by-Step Execution Trace</h4>
        <div className="rounded-xl border border-zinc-100 bg-zinc-800 shadow-inner overflow-hidden">
          <div className="p-4 font-mono text-[10px] sm:text-xs leading-relaxed text-zinc-300 max-h-[400px] overflow-y-auto custom-scrollbar">
            {trace.intermediateSteps.map((step, idx) => (
              <div key={idx} className="mb-2 flex gap-4 transition-colors hover:bg-zinc-700/50">
                <span className="text-zinc-600 flex-shrink-0 select-none w-6 text-right">{(idx + 1).toString().padStart(2, '0')}</span>
                <span className={step.includes("Gross") || step.includes("ROI") ? "text-cyan-400" : ""}>{step}</span>
              </div>
            ))}
            <div className="mt-4 text-emerald-400 font-bold border-t border-zinc-700 pt-2 flex gap-4">
               <span className="text-zinc-600 w-6 text-right select-none">OK</span>
               <span className="uppercase tracking-tighter">Audit Ledger Certification Finalized.</span>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #27272a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
