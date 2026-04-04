"use client";

import { useState } from "react";
import { verifySettlementAction } from "@/app/actions/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";

interface AuditVerificationUIProps {
  initialBatchId?: string;
}

export function AuditVerificationUI({ 
  initialBatchId
}: AuditVerificationUIProps) {
  const [batchId, setBatchId] = useState(initialBatchId ?? "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{ isValid: boolean; batchId: string; certifiedAt: Date | null; settlementHash: string | null; error?: string } | null>(null);

  async function handleVerify() {
    if (!batchId) return;
    setIsVerifying(true);
    const verification = await verifySettlementAction(batchId);
    setResult(verification);
    setIsVerifying(false);
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-zinc-200 bg-white shadow-xl shadow-zinc-200/50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 space-y-2">
              <label htmlFor="batchId" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Batch ID
              </label>
              <Input
                id="batchId"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="font-mono text-sm tracking-tight focus-visible:ring-zinc-900"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleVerify} 
                disabled={isVerifying || !batchId}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 md:w-auto"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify Integrity
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          {result.isValid ? (
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-lg shadow-emerald-100/50">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-emerald-900">Cryptographically Verified</h3>
                    <p className="text-sm text-emerald-700">
                      The batch integrity has been confirmed. The current database records exactly match the 
                      signed state from certification.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-white/60 p-4 border border-emerald-100 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase text-emerald-600">Certification Time</p>
                        <p className="text-sm font-semibold text-emerald-900">
                          {result.certifiedAt ? new Date(result.certifiedAt).toLocaleString() : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-emerald-600">Settlement Hash</p>
                        <p className="font-mono text-[10px] break-all font-semibold text-emerald-900">
                          {result.settlementHash}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-rose-200 bg-rose-50/50 shadow-lg shadow-rose-100/50">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                    <XCircle className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-rose-900">Verification Failed</h3>
                    <p className="text-sm text-rose-700">
                      {result.error ?? "The current state of the batch does not match the certified audit signature."}
                    </p>
                    <div className="mt-2 rounded-md bg-rose-900 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                      TAMPER WARNING / SYSTEM ANOMALY
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
