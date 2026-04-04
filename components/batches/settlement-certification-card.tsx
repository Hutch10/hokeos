"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Inline SVGs ─────────────────────────────────────────────────────────────

const ShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const Lock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const AlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const FileText = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

const Fingerprint = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M5 8a7 7 0 0 1 12 0" />
    <path d="M8 10a3.9 3.9 0 0 1 6 0" />
    <path d="M12 12v4" />
    <path d="M8 16a4 4 0 0 0 8 0" />
  </svg>
);

const CheckCircle2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const Globe = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const Monitor = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const QrCode = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="5" height="5" x="3" y="3" rx="1" />
    <rect width="5" height="5" x="16" y="3" rx="1" />
    <rect width="5" height="5" x="3" y="16" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
    <path d="M21 21v.01" />
    <path d="M12 7v3a2 2 0 0 1-2 2H7" />
    <path d="M3 12h.01" />
    <path d="M12 3h.01" />
    <path d="M12 16v.01" />
    <path d="M16 12h1" />
    <path d="M21 12v.01" />
    <path d="M12 21v-1" />
  </svg>
);

// ─── Component ───────────────────────────────────────────────────────────────

interface SettlementCertificationCardProps {
  batchId: string;
  certifiedAt: Date | string | null;
  settlementHash: string | null;
  isMockRequested?: boolean;
  operatorMetadata?: {
    ip?: string;
    userAgent?: string;
  };
}

export function SettlementCertificationCard({
  batchId,
  certifiedAt,
  settlementHash,
  isMockRequested = false,
  operatorMetadata,
}: SettlementCertificationCardProps) {
  const router = useRouter();
  const [isCertifying, setIsCertifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCertify = async () => {
    setIsCertifying(true);
    setError(null);

    try {
      const res = await fetch(`/api/batches/${batchId}/certify${isMockRequested ? "?mock=true" : ""}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to certify settlement");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsCertifying(false);
    }
  };

  const isCertified = !!certifiedAt;

  return (
    <Card className={`overflow-hidden border-2 ${isCertified ? "border-emerald-500/20 bg-emerald-50/30" : "border-amber-500/20 bg-amber-50/30"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCertified ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <Lock className="h-5 w-5 text-amber-600" />
            )}
            <CardTitle className="text-lg">Industrial Settlement Certification</CardTitle>
          </div>
          <Badge variant={isCertified ? "success" : "warning"} className="uppercase tracking-wider">
            {isCertified ? "Certified" : "Draft"}
          </Badge>
        </div>
        <CardDescription>
          {isCertified
            ? "This batch is locked for settlement and has been cryptographically fingerprinted."
            : "Review and certify this batch to lock the financial record and generate its manifest."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCertified ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-white/50 p-4 border border-emerald-100 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Certified On
                    </p>
                    <p className="text-sm font-medium mt-1">
                      {new Date(certifiedAt!).toLocaleString("en-US", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                      <Fingerprint className="h-3 w-3" /> Audit Fingerprint
                    </p>
                    <p className="text-[10px] font-mono mt-1 break-all bg-zinc-100 p-1.5 rounded border border-zinc-200">
                      {settlementHash}
                    </p>
                  </div>
                </div>

                {operatorMetadata && (
                  <div className="pt-2 border-t border-emerald-100/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" /> Operator IP
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 truncate">
                        {operatorMetadata.ip || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase flex items-center gap-1">
                        <Monitor className="h-2.5 w-2.5" /> Device Agent
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 truncate" title={operatorMetadata.userAgent}>
                        {operatorMetadata.userAgent || "Unknown"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex flex-col items-center justify-center p-2 bg-white rounded border border-emerald-200/50 shadow-sm">
                <div className="h-20 w-20 relative bg-emerald-50/20 grid grid-cols-10 grid-rows-10 gap-[1px] p-1 border border-emerald-100 rounded">
                  {/* Simulated QR Code via CSS Pattern for industrial aesthetic */}
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-full h-full rounded-[0.5px] ${
                        (i % 7 === 0 || i % 11 === 0 || i % 6 === 3 || i < 4 || (i > 9 && i < 14) || i % 10 === 0) 
                          ? "bg-zinc-800" 
                          : "bg-transparent"
                      }`}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <QrCode className="h-8 w-8 text-black" />
                  </div>
                </div>
                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-2 tracking-tighter">Scan for Audit</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => window.open(`/api/batches/${batchId}/report/settlement${isMockRequested ? "?mock=true" : ""}`, "_blank")}
              >
                <FileText className="h-4 w-4" /> View Certified Manifest
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-white/50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-semibold">Settlement Locking Protocol</p>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Certifying this batch will permanently lock all items, prices, and audit snapshots. 
                    This action is <span className="font-bold underline">irreversible</span> and generates a 
                    cryptographically verified settlement manifest.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" /> {error}
              </p>
            )}

            <Button 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
              onClick={handleCertify}
              disabled={isCertifying}
            >
              {isCertifying ? "Fingerprinting Audit..." : "Certify & Lock Settlement"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
