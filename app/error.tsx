'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, database as DbIcon } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an internal tracking service if available
    console.error('[HokeOS Industrial Error]:', error);
  }, [error]);

  const isDatabaseError = error.message.toLowerCase().includes('database') || 
                          error.message.toLowerCase().includes('connection');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full border border-zinc-800 bg-zinc-900/50 p-8 rounded-lg shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6 text-amber-500">
          <AlertTriangle size={32} />
          <h1 className="text-2xl font-bold tracking-tight uppercase">System Alert</h1>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-md">
            {isDatabaseError ? (
              <DbIcon className="text-amber-500 shrink-0 mt-1" size={20} />
            ) : (
              <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
            )}
            <div>
              <p className="font-semibold text-amber-200">
                {isDatabaseError ? 'Persistence Layer Offline' : 'Runtime Execution Failure'}
              </p>
              <p className="text-sm text-amber-200/70 mt-1">
                {isDatabaseError 
                  ? 'A critical connection to the Sovereign Database could not be established. Operation aborted to prevent data corruption.'
                  : 'An unexpected runtime error occurred in the primary application engine.'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-zinc-800/50 rounded-md border border-zinc-700/50">
            <p className="text-xs font-mono text-zinc-500 uppercase mb-2 tracking-widest">Technical Trace</p>
            <p className="text-sm font-mono text-zinc-300 break-words line-clamp-3">
              {error.message || 'Unknown internal exception'}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-zinc-600 mt-2 italic">Ref: {error.digest}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black font-bold py-3 px-4 rounded transition-colors"
          >
            <RefreshCw size={18} />
            Reconnect to Engine
          </button>
          
          <p className="text-center text-xs text-zinc-600 mt-4 uppercase tracking-widest">
            HokeOS v2.0.0-PROTOTYPE // SOVEREIGN CORE
          </p>
        </div>
      </div>
    </div>
  );
}
