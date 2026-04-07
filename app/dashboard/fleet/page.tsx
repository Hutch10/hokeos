import { getCurrentUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideTruck, LucideMapPin, LucideNavigation, LucideSatellite } from "lucide-react";
import { db } from "@/db";
import { fleetAssets, dispatches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Phase 46: Sovereign Fleet Dashboard (v1.10.0-ENTERPRISE)
 * Logistics Control Center for industrial recovery operations.
 */
export default async function FleetDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const { activeTeamId } = currentUser;

  const activeAssets = await db
    .select()
    .from(fleetAssets)
    .where(eq(fleetAssets.teamId, activeTeamId))
    .orderBy(desc(fleetAssets.updatedAt))
    .limit(10);

  const activeDispatches = await db
    .select()
    .from(dispatches)
    .where(eq(dispatches.teamId, activeTeamId))
    .orderBy(desc(dispatches.createdAt))
    .limit(5);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-900 text-slate-100">
      {/* Fleet Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-blue-500">
             Fleet Command <span className="text-slate-500 lowercase text-xl tracking-normal">v1.10.0</span>
          </h1>
          <p className="text-slate-400 font-mono uppercase tracking-widest text-sm">
             Satellite Status: LINKED | Fleet Mode: ENTERPRISE
          </p>
        </div>
        <div className="flex gap-4">
           <Badge variant="outline" className="bg-blue-950 text-blue-400 border-blue-800 px-4 py-2 font-black uppercase">
             Logistics Active
           </Badge>
        </div>
      </div>

      {/* Fleet KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700 shadow-xl overflow-hidden group">
          <CardContent className="p-6 relative">
            <LucideTruck className="absolute top-4 right-4 text-blue-500/20 group-hover:scale-125 transition-transform" />
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">Total Assets</p>
            <h2 className="text-4xl font-black tracking-tighter mt-1">{activeAssets.length}</h2>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 shadow-xl overflow-hidden group">
          <CardContent className="p-6 relative">
            <LucideSatellite className="absolute top-4 right-4 text-emerald-500/20 group-hover:scale-125 transition-transform" />
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">Active Loads</p>
            <h2 className="text-4xl font-black tracking-tighter mt-1 text-emerald-400">{activeDispatches.length}</h2>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 shadow-xl overflow-hidden group col-span-2">
          <CardContent className="p-6 flex justify-between items-center">
             <div>
               <p className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">Real-Time Telemetry</p>
               <h2 className="text-2xl font-black tracking-tighter mt-1">42,000 lbs <span className="text-slate-500 text-lg tracking-normal uppercase">AVG Payload</span></h2>
             </div>
             <LucideNavigation className="text-blue-500 animate-pulse" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Asset Registry */}
        <Card className="lg:col-span-2 bg-slate-800 border-slate-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-white">Active Asset Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeAssets.length === 0 ? (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl text-slate-600 font-mono italic">
                   No assets detected in telemetry gate.
                </div>
              ) : (
                activeAssets.map((asset: any) => (
                  <div key={asset.id} className="p-4 bg-slate-900 border border-slate-700 rounded-2xl flex justify-between items-center hover:border-blue-500/50 transition-colors cursor-pointer">
                    <div className="flex gap-4">
                       <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-600">
                         <LucideTruck className="text-blue-400" />
                       </div>
                       <div>
                         <h3 className="font-black text-slate-100 uppercase tracking-tight">{asset.name}</h3>
                         <p className="text-xs text-slate-500 font-mono uppercase">ID: #{asset.id.slice(0, 8)} | {asset.type}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <Badge variant="outline" className="border-emerald-900 text-emerald-400 mb-2 uppercase text-[10px]">
                         {asset.status}
                       </Badge>
                       <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Signal Locked</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Dispatches */}
        <Card className="bg-slate-800 border-slate-700 shadow-2xl">
           <CardHeader>
             <CardTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <LucideMapPin className="text-red-500 w-5 h-5" />
                Live Dispatch
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
                {activeDispatches.length === 0 ? (
                   <div className="py-8 text-center text-slate-500 font-mono text-sm uppercase">No pending dispatches.</div>
                ) : (
                  activeDispatches.map((dispatch: any) => (
                    <div key={dispatch.id} className="p-4 bg-slate-900 border-l-4 border-l-blue-500 rounded-r-2xl space-y-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest font-mono">D_#{dispatch.id.slice(0, 4)}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(dispatch.createdAt).toLocaleTimeString()}</span>
                       </div>
                       <p className="text-sm font-bold text-slate-100 leading-tight">
                         {dispatch.origin} <span className="text-blue-500">→</span> {dispatch.destination}
                       </p>
                       <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                          <Badge className="bg-blue-900 text-blue-100 uppercase text-[9px] font-black">{dispatch.status}</Badge>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">ETA: 45m</span>
                       </div>
                    </div>
                  ))
                )}
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
