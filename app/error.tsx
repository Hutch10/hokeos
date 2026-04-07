'use client';

import { useEffect } from 'react';
import { RefreshCw, Database as DbIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('HokeOS Deployment Error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 selection:bg-rose-500/30">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-rose-500/20 blur-2xl rounded-full animate-pulse" />
          <h2 className="relative text-5xl font-black italic text-white tracking-tighter uppercase">
            System Protocol Breach
          </h2>
        </div>
        
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm italic font-medium leading-relaxed">
            An unexpected error occurred during the recovery sequence. 
            The incident has been logged for industrial audit.
          </p>

          {error.message && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4 font-mono text-[10px] text-rose-400 text-left overflow-auto max-h-32">
              <span className="opacity-50 uppercase block mb-1">Diagnostic Signature:</span>
              {error.message}
              {error.digest && <div className="mt-1 opacity-50 uppercase">Hash: {error.digest}</div>}
            </div>
          )}
        </div>
      <div className="flex gap-4">
        <Button
          variant="default"
          onClick={() => reset()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Sequence
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.href = '/dashboard'}
          className="gap-2"
        >
          <DbIcon className="h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  </main>
);
}
