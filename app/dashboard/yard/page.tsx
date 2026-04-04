import { getCurrentUser } from "@/lib/auth";
import { SovereignTicketingService } from "@/lib/tickets/service";
import { Badge } from "@/components/ui/badge";
import { LucideScale, LucideCamera, LucideMic, LucideSave, LucidePrinter } from "lucide-react";

/**
 * Phase 48: Sovereign Yard Mode (v1.8.5 - INDUSTRIAL HARDENED)
 * ULTRA-HIGH-CONTRAST, GLOVED-TOUCH targets for "Dirty Floor" ops.
 */
export default async function YardDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const { activeTeamId } = currentUser;

  const activeTickets = await SovereignTicketingService.listActiveTickets(activeTeamId);

  return (
    <div className="flex flex-col gap-6 p-4 min-h-screen bg-black text-white selection:bg-amber-500 selection:text-black">
      {/* Industrial Sovereign Header (Daytime High-Visibility) */}
      <div className="flex justify-between items-center pb-4 border-b-4 border-amber-600">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-amber-500 leading-none">
            Yard Mode <span className="text-slate-600 text-2xl">v1.8.5</span>
          </h1>
          <p className="text-amber-400 font-mono uppercase tracking-[0.2em] text-xs mt-2">
             Sensor Link: STABLE | Mode: GLOVED-TOUCH
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <Badge className="bg-amber-600 text-black text-lg px-4 py-1 font-black border-none uppercase">
             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </Badge>
           <button 
             title="Toggle Voice Input"
             className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase hover:text-amber-500 transition-colors"
           >
              <LucideMic className="w-4 h-4" />
              Voice Mode: OFF
           </button>
        </div>
      </div>

      {/* Primary Mission-Critical Actions (Ultra-Large Tap Targets) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        {/* START INBOUND: THE 'DIRTY FLOOR' ENTRY POINT */}
        <button 
          title="Create New Scaling Ticket"
          className="h-64 flex flex-col items-center justify-center gap-4 bg-amber-600 hover:bg-amber-500 active:scale-95 transition-all rounded-[40px] border-8 border-amber-700 shadow-[0_20px_50px_rgba(217,119,6,0.3)]"
        >
           <LucideScale className="w-24 h-24 text-black" />
           <span className="text-5xl font-black text-black uppercase tracking-tighter">New Ticket</span>
        </button>

        {/* RE-WEIGH / SYNC */}
        <button 
          title="Trigger Visual Audit Snapshot"
          className="h-64 flex flex-col items-center justify-center gap-4 bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all rounded-[40px] border-8 border-slate-800"
        >
           <LucideCamera className="w-24 h-24 text-slate-400" />
           <span className="text-5xl font-black text-slate-400 uppercase tracking-tighter">Audit Shot</span>
        </button>
      </div>

      {/* Active Intake Queue (Touch optimized cards) */}
      <div className="mt-4">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-slate-500 flex items-center gap-3">
           <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
           Live Scaling Events ({activeTickets.length})
        </h2>
        
        <div className="flex flex-col gap-4">
          {activeTickets.length === 0 ? (
            <div className="h-44 flex items-center justify-center border-4 border-dashed border-slate-900 rounded-[40px] text-slate-700 font-black text-2xl uppercase tracking-widest italic">
               Waiting for load...
            </div>
          ) : (
            activeTickets.map(ticket => (
              <div key={ticket.id} className="bg-slate-900 border-4 border-slate-800 rounded-[40px] p-8 flex justify-between items-center hover:border-amber-500/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-8">
                  {/* Ticket Badge */}
                  <div className="w-24 h-24 bg-black rounded-3xl flex flex-col items-center justify-center border-2 border-slate-700 group-hover:border-amber-500 transition-colors">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inbound</span>
                     <span className="text-3xl font-black text-amber-500">#{ticket.id.slice(0,4)}</span>
                  </div>
                  {/* Metadata */}
                  <div>
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Gross Step</h3>
                    <p className="text-slate-500 font-mono text-lg uppercase mt-2">
                       {ticket.status} | {new Date(ticket.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-6">
                   <div className="text-right">
                     <div className="text-7xl font-black text-white tracking-tighter tabular-nums leading-none">
                        {ticket.grossWeight || "0"} 
                        <span className="text-3xl text-slate-600 ml-2">lbs</span>
                     </div>
                     <Badge className="bg-amber-900/30 text-amber-400 border-none font-black uppercase tracking-widest text-sm mt-2">
                       Awaiting Tare
                     </Badge>
                   </div>
                   
                   {/* ACTION COLUMN FOR GLOVED USE */}
                   <div className="flex flex-col gap-2">
                      <button 
                        title="Save Ticket Record"
                        className="p-6 bg-blue-600 rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-90 transition-all"
                      >
                         <LucideSave className="w-10 h-10 text-white" />
                      </button>
                      <button 
                        title="Print Physical Receipt"
                        className="p-6 bg-emerald-600 rounded-2xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 active:scale-90 transition-all opacity-50"
                      >
                         <LucidePrinter className="w-10 h-10 text-white" />
                      </button>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer System Status (Non-interactive) */}
      <div className="mt-auto pt-8 border-t border-slate-950 flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
         <span>Audit ID: {activeTeamId.slice(0, 8)}</span>
         <span>Latency: 42ms</span>
         <span>HokeOS v1.8.5-HARDENED-YARD</span>
      </div>
    </div>
  );
}
