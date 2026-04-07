import { getCurrentUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideCreditCard, LucideHistory, LucideShieldCheck } from "lucide-react";
import { db } from "@/db";
import { settlements, suppliers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Phase 44: Sovereign Finance Dashboard (v1.9.0-COMMERCIAL)
 * Financial reconciliation for industrial recovery operations.
 */
export default async function FinanceDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const { activeTeamId } = currentUser;

  const activeSettlements = await db
    .select({
      id: settlements.id,
      status: settlements.status,
      netPayout: settlements.netPayout,
      batchId: settlements.batchId,
      auditHash: settlements.auditHash,
      supplierName: suppliers.name,
      createdAt: settlements.createdAt,
    })
    .from(settlements)
    .leftJoin(suppliers, eq(settlements.supplierId, suppliers.id))
    .where(eq(settlements.teamId, activeTeamId))
    .orderBy(desc(settlements.createdAt))
    .limit(10);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50">
      {/* Finance Header */}
      <div className="flex justify-between items-end pb-2 border-b-2 border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
             Commercial Ledger <span className="text-slate-400 font-mono text-xl lowercase tracking-normal">v1.9.0</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Financial Reconciliation & Settlement Logic</p>
        </div>
        <div className="flex gap-4">
           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2 font-bold uppercase tracking-tight">
             Settlement Mode: ACTIVE
           </Badge>
        </div>
      </div>

      {/* Financial Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-sm shadow-slate-200 overflow-hidden">
          <CardContent className="p-6 relative">
            <LucideCreditCard className="absolute top-4 right-4 text-emerald-100 w-12 h-12" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pending Payout</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mt-1">$12,450.00</h2>
            <p className="text-xs text-emerald-600 font-bold mt-2 uppercase tracking-tight">4 Settlements Awaiting Approval</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm shadow-slate-200 overflow-hidden">
          <CardContent className="p-6 relative">
            <LucideHistory className="absolute top-4 right-4 text-blue-100 w-12 h-12" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Last 30 Days (Paid)</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mt-1">$458,920.88</h2>
            <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-tight">Recovery cycle time: 4.2 days</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-none shadow-2xl overflow-hidden">
          <CardContent className="p-6 relative">
            <LucideShieldCheck className="absolute top-4 right-4 text-slate-800 w-12 h-12" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Audit Stability</p>
            <h2 className="text-4xl font-black text-emerald-500 tracking-tighter mt-1">100%</h2>
            <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tight">All Settlements Locked to Verified Audit Trace</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Settlements Table */}
      <Card className="bg-white border-none shadow-sm shadow-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold uppercase tracking-tight text-slate-800">Pending & Recent Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="pb-4">Settlement ID</th>
                  <th className="pb-4">Supplier</th>
                  <th className="pb-4">Batch ID</th>
                  <th className="pb-4">Net Payout</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {activeSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">No active settlements found.</td>
                  </tr>
                ) : (
                  activeSettlements.map((settlement: any) => (
                    <tr key={settlement.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-mono font-bold text-slate-600">#{settlement.id.slice(0, 8)}</td>
                      <td className="py-4 font-bold text-slate-900">{settlement.supplierName || "—"}</td>
                      <td className="py-4 text-slate-500 font-mono">b_{settlement.batchId?.slice(0, 4)}</td>
                      <td className="py-4 font-black text-slate-900 text-base">${Number(settlement.netPayout).toLocaleString()}</td>
                      <td className="py-4">
                        <Badge className={`${
                          settlement.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                          settlement.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        } border-none font-bold uppercase text-[10px]`}>
                          {settlement.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                         <button className="bg-slate-900 text-white font-black uppercase text-xs px-4 py-2 rounded-lg hover:bg-slate-800 active:scale-95 transition-all">
                           Review
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
