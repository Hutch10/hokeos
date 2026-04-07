import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Zap, Scale, BarChart3, Fingerprint, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 selection:bg-cyan-500/30">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-600 font-bold text-white">H</div>
            <span className="text-xl font-bold tracking-tight text-white">HokeOS</span>
            <span className="ml-2 hidden rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400 sm:block">
              Alpha Pilot
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Operator Sign In
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="hidden sm:inline-flex">Enter Terminal</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-20 pb-32 sm:px-6 lg:px-8">
          {/* Ambient Background */}
          <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
          
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs font-medium text-zinc-400 backdrop-blur-sm mb-8">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              Industrial-Grade Metal Accounting
            </div>
            
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl">
              Stop Guessing Your Yield. <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Start Indexing Your ROI.
              </span>
            </h1>
            
            <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 sm:text-xl">
              The industrial operating system for precious metals recovery. 
              Eliminate invisible losses with deterministic market indexing, hardware-verified weighing, and SHA-256 audit trails.
            </p>
            
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/dashboard">
                <Button size="xl" className="w-full sm:w-auto shadow-lg shadow-cyan-500/20">
                  Initialize Terminal
                </Button>
              </Link>
              <Link href="/calculator">
                <Button variant="outline" size="xl" className="w-full border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800 sm:w-auto">
                  Run Pre-Melt Calc
                </Button>
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-8 border-t border-zinc-900 pt-12 opacity-50 grayscale hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 font-bold text-lg tracking-tighter text-white">LBMA INDEXED</div>
              <div className="flex items-center gap-2 font-bold text-lg tracking-tighter text-white">SHA-256 AUDIT</div>
              <div className="flex items-center gap-2 font-bold text-lg tracking-tighter text-white">WEBSERIAL READY</div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="border-t border-zinc-900 bg-zinc-950/50 py-24 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                icon={<BarChart3 className="h-6 w-6 text-cyan-400" />}
                title="Deterministic ROI Model"
                description="Replace messy spreadsheets with server-side economic engines that calculate gross, net, and margin using live market spot prices."
              />
              <FeatureCard 
                icon={<Fingerprint className="h-6 w-6 text-cyan-400" />}
                title="Audit Trace Integrity"
                description="Every settlement sheet is cryptographically signed with SHA-256 hashes, ensuring non-repudiation for industrial lots."
              />
              <FeatureCard 
                icon={<Scale className="h-6 w-6 text-cyan-400" />}
                title="Hardware Provenance"
                description="Direct WebSerial integration captures weighments straight from your industrial scales, eliminating manual data entry errors."
              />
              <FeatureCard 
                icon={<Zap className="h-6 w-6 text-cyan-400" />}
                title="Market Volatility Protection"
                description="Automated price snapshots lock in market context during the 48-hour refining window to protect your yield against swings."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-6 w-6 text-cyan-400" />}
                title="Sentinel Monitoring"
                description="Live system health checks ensure industrial-grade persistence and data integrity across every batch lifecycle."
              />
              <FeatureCard 
                icon={<Activity className="h-6 w-6 text-cyan-400" />}
                title="3-Sigma Anomaly Guards"
                description="Advanced outlier detection automatically flags yields that deviate from historical recovery standards for yard security."
              />
            </div>
          </div>
        </section>

        {/* Comparison Section (Sovereign vs Spreadsheet) */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/20 border-y border-zinc-900">
           <div className="mx-auto max-w-5xl">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-12 backdrop-ignore">
                <h2 className="text-3xl font-bold text-white text-center mb-12 italic">Precision isn&apos;t optional. It&apos;s profit.</h2>
                <div className="grid gap-12 lg:grid-cols-2">
                  <div className="space-y-6">
                    <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Spreadsheets & Legacy</h3>
                    <ul className="space-y-4">
                      <ComparisonItem label="Manual price entry is always stale" isPositive={false} />
                      <ComparisonItem label="Audit trail is easily manipulated" isPositive={false} />
                      <ComparisonItem label="No link to hardware sensors" isPositive={false} />
                      <ComparisonItem label="Hidden margins lost to calculation errors" isPositive={false} />
                    </ul>
                  </div>
                  <div className="space-y-6">
                     <h3 className="text-cyan-500 font-bold uppercase tracking-widest text-xs">HokeOS Sovereign</h3>
                     <ul className="space-y-4">
                      <ComparisonItem label="Direct LBMA / COMEX market indexing" isPositive={true} />
                      <ComparisonItem label="SHA-256 Immutable Proof-of-Settlement" isPositive={true} />
                      <ComparisonItem label="Native WebSerial scale integration" isPositive={true} />
                      <ComparisonItem label="Deterministic yield maximization" isPositive={true} />
                    </ul>
                  </div>
                </div>
              </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-[10px] font-bold text-white">H</div>
            <span className="text-sm font-semibold text-zinc-500">HokeOS Metals Operating System</span>
          </div>
          <div className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Precision Industrial Assets. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string, description: string }) {
  return (
    <div className="group rounded-xl border border-zinc-900 bg-zinc-950 p-6 transition-all hover:border-cyan-500/50 hover:bg-zinc-900/30">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
    </div>
  );
}

function ComparisonItem({ label, isPositive }: { label: string, isPositive: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <div className={`mt-1 h-1.5 w-1.5 rounded-full ${isPositive ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-zinc-700'}`} />
      <span className={`text-sm ${isPositive ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
    </li>
  );
}
